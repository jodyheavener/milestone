import { getServiceClient, getStripeClient, logger } from "@/lib";
import { ServiceError } from "@milestone/shared";

/**
 * Validate and retrieve Stripe customer for user
 * Throws if customer doesn't exist or is invalid in Stripe
 */
export async function validateStripeCustomer(userId: string): Promise<string> {
	const sbServiceClient = getServiceClient();
	const stripeClient = getStripeClient();

	// Look up customer
	const { data: customer, error: customerError } = await sbServiceClient
		.from("billing_customers")
		.select("stripe_customer_id")
		.eq("user_id", userId)
		.single();

	if (customerError || !customer) {
		logger.error("Billing customer not found", {
			userId,
			error: customerError?.message,
		});
		throw new ServiceError("NOT_FOUND", {
			debugInfo:
				"No billing customer found. Please create a subscription first.",
		});
	}

	// Validate that the customer still exists in Stripe
	try {
		await stripeClient.customers.retrieve(customer.stripe_customer_id);
	} catch (stripeError: unknown) {
		if (
			stripeError &&
			typeof stripeError === "object" &&
			"code" in stripeError &&
			stripeError.code === "resource_missing"
		) {
			logger.error("Customer not found in Stripe", {
				userId,
				customerId: customer.stripe_customer_id,
			});
			throw new ServiceError("NOT_FOUND", {
				debugInfo:
					"Customer not found in Stripe. Please create a new subscription.",
			});
		} else {
			logger.error("Stripe customer validation error", {
				userId,
				customerId: customer.stripe_customer_id,
				error: stripeError instanceof Error
					? { message: stripeError.message, stack: stripeError.stack }
					: String(stripeError),
			});
			throw stripeError;
		}
	}

	return customer.stripe_customer_id;
}
