import Stripe from "stripe";
import { env } from "./env.ts";
import { logger } from "./logger.ts";

let stripeClient: Stripe | null = null;

/**
 * Get or create Stripe client instance
 * Throws error if STRIPE_SECRET_KEY is not configured
 */
export function getStripeClient(): Stripe {
	if (!stripeClient) {
		// env() will throw if STRIPE_SECRET_KEY is not set
		// Using type assertion since env() throws for undefined values
		const secretKey = env("STRIPE_SECRET_KEY") as string;
		stripeClient = new Stripe(secretKey, {
			apiVersion: "2025-09-30.clover",
		});
	}

	return stripeClient;
}

/**
 * Verify Stripe webhook signature
 * Returns parsed event if valid, null if verification fails
 * Throws error if STRIPE_WEBHOOK_SECRET is not configured
 */
export function verifyWebhookSignature(
	payload: string,
	signature: string,
): Stripe.Event | null {
	try {
		const stripeClient = getStripeClient();
		// env() will throw if STRIPE_WEBHOOK_SECRET is not set
		// Using type assertion since env() throws for undefined values
		const webhookSecret = env("STRIPE_WEBHOOK_SECRET") as string;
		const event = stripeClient.webhooks.constructEvent(
			payload,
			signature,
			webhookSecret,
		);

		return event;
	} catch (error) {
		logger.error("Webhook signature verification failed", { error });
		return null;
	}
}

/**
 * Verify Stripe sync secret
 * Returns true if secret is valid, false if it is not
 * Throws error if STRIPE_SYNC_SECRET is not configured
 */
export function verifySyncSecret(secret: string): boolean {
	const expectedSecret = env("STRIPE_SYNC_SECRET");
	if (!expectedSecret || secret !== expectedSecret) {
		logger.error("Invalid sync secret provided for Stripe sync.", {
			debugInfo: "Invalid sync secret",
		});

		return false;
	}
	return true;
}
