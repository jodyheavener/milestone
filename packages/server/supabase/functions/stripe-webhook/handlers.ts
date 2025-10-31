import { getServiceClient, logger } from "~/library";
import type Stripe from "stripe";
import { updateEntitlementsFromSubscription } from "./entitlements.ts";

/**
 * Handle checkout session completed event
 */
export function handleCheckoutSessionCompleted(
	session: Stripe.Checkout.Session,
	requestId: string,
) {
	logger.setRequestId(requestId);

	if (!session.customer || typeof session.customer !== "string") {
		logger.error("Checkout session missing customer");
		return;
	}

	logger.info("Checkout completed", {
		customerId: session.customer,
	});
}

/**
 * Handle subscription created or updated event
 * Updates subscription, subscription items, and user entitlements
 */
export async function handleSubscriptionCreatedOrUpdated(
	subscription: Stripe.Subscription,
	requestId: string,
) {
	logger.setRequestId(requestId);
	const sbUserClient = getServiceClient();

	if (!subscription.customer || typeof subscription.customer !== "string") {
		logger.error("Subscription missing customer");
		return;
	}

	if (!subscription.id || !subscription.status) {
		logger.error("Subscription missing required fields");
		return;
	}

	// Get user_id from customer
	const { data: customer, error: customerError } = await sbUserClient
		.from("billing_customers")
		.select("user_id")
		.eq("stripe_customer_id", subscription.customer)
		.single();

	if (customerError || !customer) {
		logger.error("Customer not found", {
			customerId: subscription.customer,
		});
		return;
	}

	const currentPeriodStart =
		"current_period_start" in subscription && subscription.current_period_start
			? new Date(
				(
					subscription as Stripe.Subscription & {
						current_period_start: number;
					}
				).current_period_start * 1000,
			).toISOString()
			: null;

	const currentPeriodEnd =
		"current_period_end" in subscription && subscription.current_period_end
			? new Date(
				(
					subscription as Stripe.Subscription & {
						current_period_end: number;
					}
				).current_period_end * 1000,
			).toISOString()
			: null;

	logger.info("Processing subscription", {
		subscriptionId: subscription.id,
		userId: customer.user_id,
	});

	// Upsert subscription
	const { data: subscriptionData, error: subError } = await sbUserClient
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
			},
		)
		.select()
		.single();

	if (subError || !subscriptionData) {
		logger.error("Failed to upsert subscription", {
			error: subError?.message,
		});
		return;
	}

	// Upsert subscription items
	if (!subscription.items?.data) {
		logger.error("Subscription missing items data");
		return;
	}

	for (const item of subscription.items.data) {
		if (!item.id || !item.price?.id) {
			logger.warn("Subscription item missing required fields");
			continue;
		}

		const { data: price, error: priceError } = await sbUserClient
			.from("stripe_prices")
			.select("id")
			.eq("stripe_price_id", item.price.id)
			.single();

		if (priceError || !price) {
			logger.warn("Price not found", {
				priceId: item.price.id,
			});
			continue;
		}

		await sbUserClient.from("subscription_items").upsert(
			{
				subscription_id: subscriptionData.id,
				stripe_subscription_item_id: item.id,
				stripe_price_id: price.id,
				quantity: item.quantity || 1,
				usage_type: item.price.billing_scheme === "per_unit"
					? "licensed"
					: "metered",
				metadata: item.metadata || null,
			},
			{
				onConflict: "stripe_subscription_item_id",
			},
		);
	}

	// Update entitlements
	await updateEntitlementsFromSubscription(
		customer.user_id,
		subscription.id,
		requestId,
	);
}

/**
 * Handle subscription deleted event
 * Marks subscription as canceled and clears entitlements
 */
export async function handleSubscriptionDeleted(
	subscription: Stripe.Subscription,
) {
	const sbUserClient = getServiceClient();

	if (!subscription.customer || typeof subscription.customer !== "string") {
		return;
	}

	const { data: customer } = await sbUserClient
		.from("billing_customers")
		.select("user_id")
		.eq("stripe_customer_id", subscription.customer)
		.single();

	if (!customer) {
		return;
	}

	await sbUserClient
		.from("subscriptions")
		.update({ status: "canceled" })
		.eq("stripe_subscription_id", subscription.id);

	await sbUserClient
		.from("entitlements")
		.update({
			projects_limit: 0,
			agentic_limit: 0,
			resets_at: null,
			source: null,
		})
		.eq("user_id", customer.user_id);
}

/**
 * Handle invoice paid event
 */
export function handleInvoicePaid(invoice: Stripe.Invoice, requestId: string) {
	logger.setRequestId(requestId);
	logger.info("Invoice paid", {
		invoiceId: invoice.id,
	});
}

/**
 * Handle invoice payment failed event
 * Updates subscription status to past_due
 */
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
	const invoiceWithSubscription = invoice as Stripe.Invoice & {
		subscription?: string | Stripe.Subscription | null;
	};

	const subscriptionId =
		typeof invoiceWithSubscription.subscription === "string"
			? invoiceWithSubscription.subscription
			: (invoiceWithSubscription.subscription?.id ?? null);

	if (!subscriptionId) {
		return;
	}

	const sbUserClient = getServiceClient();
	await sbUserClient
		.from("subscriptions")
		.update({ status: "past_due" })
		.eq("stripe_subscription_id", subscriptionId);
}

/**
 * Handle product updated event
 * Syncs product details to local catalog
 */
export async function handleProductUpdated(
	product: Stripe.Product,
	requestId: string,
) {
	logger.setRequestId(requestId);
	const sbUserClient = getServiceClient();
	const { error } = await sbUserClient.from("stripe_products").upsert(
		{
			stripe_product_id: product.id,
			name: product.name,
			description: product.description || null,
			active: product.active,
			metadata: product.metadata || null,
		},
		{
			onConflict: "stripe_product_id",
		},
	);

	if (error) {
		logger.error("Failed to update product", {
			error: error.message,
		});
	}
}

/**
 * Handle price updated event
 * Syncs price details to local catalog
 */
export async function handlePriceUpdated(
	price: Stripe.Price,
	requestId: string,
) {
	logger.setRequestId(requestId);
	const sbUserClient = getServiceClient();

	const { data: product, error: productError } = await sbUserClient
		.from("stripe_products")
		.select("id")
		.eq("stripe_product_id", price.product as string)
		.single();

	if (productError || !product) {
		logger.error("Product not found for price", {
			priceId: price.id,
		});
		return;
	}

	const { error } = await sbUserClient.from("stripe_prices").upsert(
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
		},
	);

	if (error) {
		logger.error("Failed to update price", {
			error: error.message,
		});
	}
}

/**
 * Handle customer deleted event
 * Removes customer record from local database
 */
export async function handleCustomerDeleted(
	customer: Stripe.Customer,
	requestId: string,
) {
	logger.setRequestId(requestId);
	const sbUserClient = getServiceClient();
	const { error } = await sbUserClient
		.from("billing_customers")
		.delete()
		.eq("stripe_customer_id", customer.id);

	if (error) {
		logger.error("Failed to delete customer record", {
			error: error.message,
		});
	}
}
