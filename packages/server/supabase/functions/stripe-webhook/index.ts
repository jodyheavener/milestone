import "@supabase/functions-js";
import { Hono } from "~/library";
import { isEnv, logger, verifyWebhookSignature } from "~/library";
import { handleRequest, json } from "~/library";
import { ServiceError } from "@m/shared";
import type Stripe from "stripe";
import {
	handleCheckoutSessionCompleted,
	handleCustomerDeleted,
	handleInvoicePaid,
	handleInvoicePaymentFailed,
	handlePriceUpdated,
	handleProductUpdated,
	handleSubscriptionCreatedOrUpdated,
	handleSubscriptionDeleted,
} from "./handlers.ts";

const app = new Hono();

// Track processed webhook IDs to prevent duplicate processing (in-memory)
// In production, consider using Redis or database for idempotency
const processedWebhookIds = new Set<string>();

/**
 * Stripe webhook endpoint
 * Handles various Stripe events (subscriptions, invoices, products, etc.)
 * Verifies webhook signature in production, skips in local environment
 */
app.post(
	"/stripe-webhook",
	handleRequest(async (c, requestId) => {
		const body = await c.req.text();
		let event: Stripe.Event;

		// Skip webhook verification in local environment
		if (isEnv("lcl")) {
			logger.info("Skipping webhook signature verification (local)");
			event = JSON.parse(body) as Stripe.Event;
		} else {
			const signature = c.req.header("stripe-signature");
			if (!signature) {
				throw new ServiceError("INVALID_REQUEST", {
					debugInfo: "Missing stripe-signature header",
				});
			}

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
			logger.info("Webhook already processed", {
				eventId: event.id,
			});
			return json({ received: true, requestId });
		}
		processedWebhookIds.add(event.id);

		logger.info("Processing webhook", {
			eventType: event.type,
			eventId: event.id,
		});

		// Handle different event types
		switch (event.type) {
			case "checkout.session.completed": {
				handleCheckoutSessionCompleted(
					event.data.object as Stripe.Checkout.Session,
					requestId,
				);
				break;
			}
			case "customer.subscription.created":
			case "customer.subscription.updated": {
				await handleSubscriptionCreatedOrUpdated(
					event.data.object as Stripe.Subscription,
					requestId,
				);
				break;
			}
			case "customer.subscription.deleted": {
				await handleSubscriptionDeleted(
					event.data.object as Stripe.Subscription,
				);
				break;
			}
			case "invoice.paid": {
				handleInvoicePaid(event.data.object as Stripe.Invoice, requestId);
				break;
			}
			case "invoice.payment_failed": {
				await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
				break;
			}
			case "product.updated": {
				await handleProductUpdated(
					event.data.object as Stripe.Product,
					requestId,
				);
				break;
			}
			case "price.updated": {
				await handlePriceUpdated(event.data.object as Stripe.Price, requestId);
				break;
			}
			case "customer.deleted": {
				await handleCustomerDeleted(
					event.data.object as Stripe.Customer,
					requestId,
				);
				break;
			}
			default: {
				logger.info("Unhandled webhook type", {
					eventType: event.type,
				});
			}
		}

		return json({ received: true, requestId });
	}),
);

// Webhooks don't need CORS (called by Stripe, not browsers)
export default {
	fetch: app.fetch,
};
