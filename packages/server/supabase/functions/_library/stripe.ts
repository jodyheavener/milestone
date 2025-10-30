import Stripe from "npm:stripe@^17";
import { stripe } from "./config.ts";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
	if (!stripeClient) {
		stripeClient = new Stripe(stripe.secretKey, {
			apiVersion: "2025-02-24.acacia",
		});
	}
	return stripeClient;
}

export function verifyWebhookSignature(
	payload: string,
	signature: string,
): Stripe.Event | null {
	try {
		const stripeClient = getStripeClient();
		const event = stripeClient.webhooks.constructEvent(
			payload,
			signature,
			stripe.webhookSecret,
		);
		return event;
	} catch (error) {
		console.error("Webhook signature verification failed:", error);
		return null;
	}
}
