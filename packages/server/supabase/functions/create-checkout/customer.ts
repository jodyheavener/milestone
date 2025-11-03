import { getServiceClient, getStripeClient, logger } from "@/lib";
import { ServiceError } from "@milestone/shared";

/**
 * Ensure Stripe customer exists for user
 * Creates customer if needed, validates existing customer
 */
export async function ensureStripeCustomer(
	userId: string,
	userEmail: string,
): Promise<string> {
	const sbServiceClient = getServiceClient();
	const stripeClient = getStripeClient();

	// Check for existing customer
	const { data: existingCustomer, error: customerError } = await sbServiceClient
		.from("billing_customers")
		.select("stripe_customer_id")
		.eq("user_id", userId)
		.single();

	if (customerError || !existingCustomer) {
		// Create new Stripe customer
		const customer = await stripeClient.customers.create({
			email: userEmail,
			metadata: {
				user_id: userId,
			},
		});

		// Store in database
		const { error: insertError } = await sbServiceClient
			.from("billing_customers")
			.insert({
				user_id: userId,
				stripe_customer_id: customer.id,
			});

		if (insertError) {
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: `Failed to store customer: ${insertError.message}`,
			});
		}

		return customer.id;
	}

	// Validate that the customer still exists in Stripe
	try {
		await stripeClient.customers.retrieve(existingCustomer.stripe_customer_id);
		return existingCustomer.stripe_customer_id;
	} catch (stripeError: unknown) {
		// If customer doesn't exist in Stripe, create a new one
		if (
			stripeError &&
			typeof stripeError === "object" &&
			"code" in stripeError &&
			stripeError.code === "resource_missing"
		) {
			logger.info("Customer not found in Stripe, creating new one", {
				oldCustomerId: existingCustomer.stripe_customer_id,
			});

			const customer = await stripeClient.customers.create({
				email: userEmail,
				metadata: {
					user_id: userId,
				},
			});

			// Update database with new customer ID
			const { error: updateError } = await sbServiceClient
				.from("billing_customers")
				.update({ stripe_customer_id: customer.id })
				.eq("user_id", userId);

			if (updateError) {
				throw new ServiceError("INTERNAL_ERROR", {
					debugInfo: `Failed to update customer: ${updateError.message}`,
				});
			}

			return customer.id;
		} else {
			// Re-throw other Stripe errors
			throw stripeError;
		}
	}
}
