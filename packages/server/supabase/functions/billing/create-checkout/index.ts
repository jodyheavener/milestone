import "@supabase/functions-js";
import { ServiceError } from "@m/shared";
import {
	appUrl,
	getStripeClient,
	serveFunction,
	supabaseClient,
} from "~/library";

interface CreateCheckoutRequest {
	price_ids?: string[];
	plan_key?: string;
}

serveFunction<["price_ids", "plan_key"]>(
	{
		methods: ["POST"],
		setCors: true,
		authed: true,
		args: ["price_ids", "plan_key"] as const,
	},
	async ({ args, user, respond }) => {
		if (!user) {
			throw new ServiceError("UNAUTHORIZED");
		}

		const { price_ids, plan_key } = args as CreateCheckoutRequest;

		if (!price_ids && !plan_key) {
			throw new ServiceError("INVALID_REQUEST", {
				debugInfo: "Either price_ids or plan_key must be provided",
			});
		}

		try {
			// Ensure Stripe customer exists
			let stripeCustomerId: string;

			const { data: existingCustomer, error: customerError } =
				await supabaseClient
					.from("billing_customers")
					.select("stripe_customer_id")
					.eq("user_id", user.id)
					.single();

			if (customerError || !existingCustomer) {
				// Create Stripe customer
				const stripeClient = getStripeClient();
				const customer = await stripeClient.customers.create({
					email: user.email,
					metadata: {
						user_id: user.id,
					},
				});

				stripeCustomerId = customer.id;

				// Store in database
				const { error: insertError } = await supabaseClient
					.from("billing_customers")
					.insert({
						user_id: user.id,
						stripe_customer_id: customer.id,
					});

				if (insertError) {
					throw new ServiceError("INTERNAL_ERROR", {
						debugInfo: `Failed to store customer: ${insertError.message}`,
					});
				}
			} else {
				// Validate that the customer still exists in Stripe
				const stripeClient = getStripeClient();
				try {
					await stripeClient.customers.retrieve(
						existingCustomer.stripe_customer_id,
					);
					stripeCustomerId = existingCustomer.stripe_customer_id;
				} catch (stripeError: unknown) {
					// If customer doesn't exist in Stripe, create a new one
					if (
						stripeError &&
						typeof stripeError === "object" &&
						"code" in stripeError &&
						stripeError.code === "resource_missing"
					) {
						console.log(
							`Customer ${existingCustomer.stripe_customer_id} not found in Stripe, creating new one`,
						);

						const customer = await stripeClient.customers.create({
							email: user.email,
							metadata: {
								user_id: user.id,
							},
						});

						stripeCustomerId = customer.id;

						// Update database with new customer ID
						const { error: updateError } = await supabaseClient
							.from("billing_customers")
							.update({ stripe_customer_id: customer.id })
							.eq("user_id", user.id);

						if (updateError) {
							throw new ServiceError("INTERNAL_ERROR", {
								debugInfo: `Failed to update customer: ${updateError.message}`,
							});
						}
					} else {
						// Re-throw other Stripe errors
						throw stripeError;
					}
				}
			}

			// Resolve price IDs
			let finalPriceIds: string[] = [];

			if (plan_key) {
				// Look up price IDs by plan_key from metadata
				const { data: prices, error: priceError } = await supabaseClient
					.from("stripe_prices")
					.select("stripe_price_id")
					.eq("metadata->>plan_key", plan_key)
					.eq("active", true);

				if (priceError || !prices || prices.length === 0) {
					throw new ServiceError("INVALID_REQUEST", {
						debugInfo: `Plan key '${plan_key}' not found`,
					});
				}

				finalPriceIds = prices.map((p) => p.stripe_price_id);
			} else if (price_ids) {
				finalPriceIds = Array.isArray(price_ids) ? price_ids : [price_ids];
			}

			// Create checkout session
			const stripeClient = getStripeClient();
			const session = await stripeClient.checkout.sessions.create({
				customer: stripeCustomerId,
				mode: "subscription",
				line_items: finalPriceIds.map((priceId) => ({
					price: priceId,
					quantity: 1,
				})),
				success_url: `${appUrl}/account/billing?status=success`,
				cancel_url: `${appUrl}/account/billing?status=canceled`,
				metadata: {
					user_id: user.id,
				},
			});

			return respond({
				session_id: session.id,
				url: session.url,
			});
		} catch (error) {
			if (error instanceof ServiceError) {
				throw error;
			}

			console.error("Create checkout error:", error);
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
);
