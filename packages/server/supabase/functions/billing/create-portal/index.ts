import "@supabase/functions-js";
import { ServiceError } from "@m/shared";
import {
	appUrl,
	getStripeClient,
	serveFunction,
	supabaseClient,
} from "~/library";

serveFunction(
	{
		methods: ["POST"],
		setCors: true,
		authed: true,
	},
	async ({ user, respond }) => {
		if (!user) {
			throw new ServiceError("UNAUTHORIZED");
		}

		try {
			// Get Stripe customer ID
			const { data: customer, error: customerError } = await supabaseClient
				.from("billing_customers")
				.select("stripe_customer_id")
				.eq("user_id", user.id)
				.single();

			if (customerError || !customer) {
				throw new ServiceError("NOT_FOUND", {
					debugInfo:
						"No billing customer found. Please create a subscription first.",
				});
			}

			// Validate that the customer still exists in Stripe
			const stripeClient = getStripeClient();
			try {
				await stripeClient.customers.retrieve(customer.stripe_customer_id);
			} catch (stripeError: any) {
				// If customer doesn't exist in Stripe, throw error
				if (stripeError?.code === "resource_missing") {
					throw new ServiceError("NOT_FOUND", {
						debugInfo: "Customer not found in Stripe. Please create a new subscription.",
					});
				} else {
					// Re-throw other Stripe errors
					throw stripeError;
				}
			}

			// Create billing portal session
			const session = await stripeClient.billingPortal.sessions.create({
				customer: customer.stripe_customer_id,
				return_url: `${appUrl}/account/billing`,
			});

			return respond({
				url: session.url,
			});
		} catch (error) {
			if (error instanceof ServiceError) {
				throw error;
			}

			console.error("Create portal error:", error);
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
);
