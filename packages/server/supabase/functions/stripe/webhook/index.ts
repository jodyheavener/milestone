import "@supabase/functions-js";
import { ServiceError } from "@m/shared";
import {
	serveFunction,
	supabaseClient,
	verifyWebhookSignature,
	isEnv,
} from "~/library";
import type Stripe from "stripe";

// Track processed webhook IDs to prevent duplicate processing
const processedWebhookIds = new Set<string>();

serveFunction(
	{
		methods: ["POST"],
		setCors: false,
		authed: false,
	},
	async ({ request, respond }) => {
		try {
			const body = await request.text();
			let event: Stripe.Event;

			// Skip webhook verification in local environment
			if (isEnv("lcl")) {
				console.log(
					"Local environment detected, skipping webhook signature verification"
				);
				event = JSON.parse(body) as Stripe.Event;
			} else {
				const signature = request.headers.get("stripe-signature");
				if (!signature) {
					throw new ServiceError("INVALID_REQUEST", {
						debugInfo: "Missing stripe-signature header",
					});
				}

				// Verify webhook signature
				const verifiedEvent = verifyWebhookSignature(body, signature);
				if (!verifiedEvent) {
					throw new ServiceError("UNAUTHORIZED", {
						debugInfo: "Invalid webhook signature",
					});
				}
				event = verifiedEvent;
			}

			// Check for duplicate processing
			if (processedWebhookIds.has(event.id)) {
				console.log(`Webhook ${event.id} already processed, skipping`);
				return respond({ received: true });
			}
			processedWebhookIds.add(event.id);

			console.log(`Processing webhook: ${event.type} (${event.id})`);

			// Handle different event types
			switch (event.type) {
				case "checkout.session.completed": {
					await handleCheckoutSessionCompleted(
						event.data.object as Stripe.Checkout.Session
					);
					break;
				}
				case "customer.subscription.created":
				case "customer.subscription.updated": {
					await handleSubscriptionCreatedOrUpdated(
						event.data.object as Stripe.Subscription
					);
					break;
				}
				case "customer.subscription.deleted": {
					await handleSubscriptionDeleted(
						event.data.object as Stripe.Subscription
					);
					break;
				}
				case "invoice.paid": {
					await handleInvoicePaid(event.data.object as Stripe.Invoice);
					break;
				}
				case "invoice.payment_failed": {
					await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
					break;
				}
				case "product.updated": {
					await handleProductUpdated(event.data.object as Stripe.Product);
					break;
				}
				case "price.updated": {
					await handlePriceUpdated(event.data.object as Stripe.Price);
					break;
				}
				case "customer.deleted": {
					await handleCustomerDeleted(event.data.object as Stripe.Customer);
					break;
				}
				default: {
					console.log(`Unhandled webhook type: ${event.type}`);
				}
			}

			return respond({ received: true });
		} catch (error) {
			if (error instanceof ServiceError) {
				throw error;
			}

			console.error("Webhook processing error:", error);
			
			// Log additional context for debugging
			if (error instanceof Error) {
				console.error("Error stack:", error.stack);
			}
			
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
);

function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
	if (!session.customer || typeof session.customer !== "string") {
		console.error("Checkout session missing customer");
		return;
	}

	// The subscription will be handled by customer.subscription.created
	// This is just for logging/audit purposes
	console.log(`Checkout completed for customer: ${session.customer}`);
}

async function handleSubscriptionCreatedOrUpdated(
	subscription: Stripe.Subscription
) {
	if (!subscription.customer || typeof subscription.customer !== "string") {
		console.error("Subscription missing customer");
		return;
	}

	if (!subscription.id) {
		console.error("Subscription missing ID");
		return;
	}

	if (!subscription.status) {
		console.error("Subscription missing status");
		return;
	}

	// Get user_id from customer
	const { data: customer, error: customerError } = await supabaseClient
		.from("billing_customers")
		.select("user_id")
		.eq("stripe_customer_id", subscription.customer)
		.single();

	if (customerError || !customer) {
		console.error(`Customer not found: ${subscription.customer}`);
		return;
	}

	// Convert timestamps (now nullable)
	const currentPeriodStart = subscription.current_period_start 
		? new Date(subscription.current_period_start * 1000).toISOString()
		: null;
	
	const currentPeriodEnd = subscription.current_period_end 
		? new Date(subscription.current_period_end * 1000).toISOString()
		: null;

	console.log(`Processing subscription ${subscription.id} with period ${currentPeriodStart || 'null'} to ${currentPeriodEnd || 'null'}`);

	// Upsert subscription
	const { data: subscriptionData, error: subError } = await supabaseClient
		.from("subscriptions")
		.upsert(
			{
				user_id: customer.user_id,
				stripe_subscription_id: subscription.id,
				status: subscription.status,
				current_period_start: currentPeriodStart,
				current_period_end: currentPeriodEnd,
				cancel_at_period_end: subscription.cancel_at_period_end,
			},
			{
				onConflict: "stripe_subscription_id",
			}
		)
		.select()
		.single();

	if (subError || !subscriptionData) {
		console.error(`Failed to upsert subscription: ${subError?.message}`);
		return;
	}

	// Upsert subscription items
	if (!subscription.items?.data) {
		console.error("Subscription missing items data");
		return;
	}

	for (const item of subscription.items.data) {
		if (!item.id) {
			console.error("Subscription item missing ID");
			continue;
		}

		if (!item.price?.id) {
			console.error("Subscription item missing price ID");
			continue;
		}

		// Get stripe_price_id from our catalog
		const { data: price, error: priceError } = await supabaseClient
			.from("stripe_prices")
			.select("id")
			.eq("stripe_price_id", item.price.id)
			.single();

		if (priceError || !price) {
			console.error(`Price not found: ${item.price.id}`);
			continue;
		}

		await supabaseClient.from("subscription_items").upsert(
			{
				subscription_id: subscriptionData.id,
				stripe_subscription_item_id: item.id,
				stripe_price_id: price.id,
				quantity: item.quantity || 1,
				usage_type:
					item.price.billing_scheme === "per_unit" ? "licensed" : "metered",
				metadata: item.metadata || null,
			},
			{
				onConflict: "stripe_subscription_item_id",
			}
		);
	}

	// Update entitlements based on subscription items
	await updateEntitlementsFromSubscription(customer.user_id, subscription.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
	if (!subscription.customer || typeof subscription.customer !== "string") {
		return;
	}

	const { data: customer } = await supabaseClient
		.from("billing_customers")
		.select("user_id")
		.eq("stripe_customer_id", subscription.customer)
		.single();

	if (!customer) {
		return;
	}

	// Update subscription status
	await supabaseClient
		.from("subscriptions")
		.update({ status: "canceled" })
		.eq("stripe_subscription_id", subscription.id);

	// Clear entitlements
	await supabaseClient
		.from("entitlements")
		.update({
			projects_limit: 0,
			agentic_limit: 0,
			resets_at: null,
			source: null,
		})
		.eq("user_id", customer.user_id);
}

function handleInvoicePaid(invoice: Stripe.Invoice) {
	// Invoice paid doesn't change subscription state, but we can log it
	console.log(`Invoice ${invoice.id} paid for customer ${invoice.customer}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
	if (!invoice.subscription || typeof invoice.subscription !== "string") {
		return;
	}

	// Update subscription status to past_due
	await supabaseClient
		.from("subscriptions")
		.update({ status: "past_due" })
		.eq("stripe_subscription_id", invoice.subscription);
}

async function handleProductUpdated(product: Stripe.Product) {
	// Upsert product in catalog
	const { error } = await supabaseClient.from("stripe_products").upsert(
		{
			stripe_product_id: product.id,
			name: product.name,
			description: product.description || null,
			active: product.active,
			metadata: product.metadata || null,
		},
		{
			onConflict: "stripe_product_id",
		}
	);

	if (error) {
		console.error(`Failed to update product: ${error.message}`);
	}
}

async function handlePriceUpdated(price: Stripe.Price) {
	// Get product
	const { data: product, error: productError } = await supabaseClient
		.from("stripe_products")
		.select("id")
		.eq("stripe_product_id", price.product as string)
		.single();

	if (productError || !product) {
		console.error(`Product not found for price: ${price.id}`);
		return;
	}

	// Upsert price
	const { error } = await supabaseClient.from("stripe_prices").upsert(
		{
			stripe_price_id: price.id,
			stripe_product_id: product.id,
			currency: price.currency,
			unit_amount: price.unit_amount || 0,
			recurring_interval: price.recurring?.interval || null,
			type: price.type === "recurring" ? "recurring" : "one_time",
			usage_type: price.billing_scheme === "per_unit" ? "licensed" : "metered",
			metadata: price.metadata || null,
		},
		{
			onConflict: "stripe_price_id",
		}
	);

	if (error) {
		console.error(`Failed to update price: ${error.message}`);
	}
}

async function updateEntitlementsFromSubscription(
	userId: string,
	stripeSubscriptionId: string
) {
	// Get subscription with items
	const { data: subscription, error: subError } = await supabaseClient
		.from("subscriptions")
		.select(
			`
			id,
			current_period_end,
			subscription_items (
				stripe_price_id,
				metadata
			)
		`
		)
		.eq("stripe_subscription_id", stripeSubscriptionId)
		.single();

	if (subError || !subscription) {
		console.error(`Subscription not found: ${stripeSubscriptionId}`);
		return;
	}

	// Get prices with metadata to extract limits
	const priceIds = (
		subscription.subscription_items as Array<{
			stripe_price_id: string;
		}>
	).map((item) => item.stripe_price_id);

	const { data: prices, error: pricesError } = await supabaseClient
		.from("stripe_prices")
		.select("metadata, id")
		.in("id", priceIds);

	if (pricesError || !prices || prices.length === 0) {
		console.error("Failed to fetch prices for entitlements");
		return;
	}

	// Aggregate limits from all prices
	let maxProjectsLimit = 0;
	let maxAgenticLimit = 0;

	for (const price of prices) {
		const metadata = price.metadata as Record<string, unknown> | null;
		if (metadata) {
			const projectsLimit = Number(metadata.projects_limit) || 0;
			const agenticLimit = Number(metadata.agentic_limit) || 0;

			maxProjectsLimit = Math.max(maxProjectsLimit, projectsLimit);
			maxAgenticLimit = Math.max(maxAgenticLimit, agenticLimit);
		}
	}

	// Calculate subscription period end - handle nullable timestamp
	if (!subscription.current_period_end) {
		console.log("Subscription missing current_period_end, skipping entitlements update");
		return;
	}

	const periodEnd = new Date(subscription.current_period_end * 1000);

	// Upsert entitlements
	// Note: agentic_limit is now "X requests per 12 hours" (fixed rolling window)
	const { error: entitlementsError } = await supabaseClient
		.from("entitlements")
		.upsert(
			{
				user_id: userId,
				projects_limit: maxProjectsLimit,
				agentic_limit: maxAgenticLimit,
				resets_at: periodEnd.toISOString(),
				source: subscription,
			},
			{
				onConflict: "user_id",
			}
		);

	if (entitlementsError) {
		console.error(
			`Failed to update entitlements: ${entitlementsError.message}`
		);
	}

	// Create or update usage counter for subscription period (for projects)
	const periodStart = new Date(subscription.current_period_end * 1000);
	periodStart.setMonth(periodStart.getMonth() - 1);

	await supabaseClient.from("usage_counters").upsert(
		{
			user_id: userId,
			period_start: periodStart.toISOString(),
			period_end: periodEnd.toISOString(),
		},
		{
			onConflict: "user_id,period_start,period_end",
		}
	);

	// Note: Agentic requests use a fixed 12-hour rolling window
	// Usage counters are created on-demand as hourly buckets by the authorize_operation function
}

async function handleCustomerDeleted(customer: Stripe.Customer) {
	console.log(`Customer deleted: ${customer.id}`);
	
	// Delete the customer record from our database
	const { error } = await supabaseClient
		.from("billing_customers")
		.delete()
		.eq("stripe_customer_id", customer.id);

	if (error) {
		console.error(`Failed to delete customer record: ${error.message}`);
	}
}
