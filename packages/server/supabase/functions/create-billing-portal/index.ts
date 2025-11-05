import "@supabase/functions-js";
import { ServiceError } from "@milestone/shared";
import {
	config,
	getAuthHeader,
	getStripeClient,
	getUserClient,
	getUserOrThrow,
	handleRequest,
	Hono,
	json,
	logger,
	withCORS,
} from "@/lib";
import { validateStripeCustomer } from "./customer.ts";

const app = new Hono();

// Preflight
app.options("*", () => new Response(null, { status: 204 }));

/**
 * Create a Stripe billing portal session
 * Allows users to manage their subscription and billing details
 */
app.post(
	"/create-billing-portal",
	handleRequest(async (c, requestId) => {
		// Auth as user
		const sbUserClient = getUserClient(getAuthHeader(c.req.raw));
		const user = await getUserOrThrow(sbUserClient);

		logger.info("Create billing portal", {
			userId: user.id,
		});

		// Validate and get Stripe customer
		let stripeCustomerId: string;
		try {
			stripeCustomerId = await validateStripeCustomer(user.id);
		} catch (error) {
			logger.error("Failed to validate Stripe customer", {
				userId: user.id,
				error: error instanceof Error
					? { message: error.message, stack: error.stack }
					: String(error),
			});
			throw error;
		}

		// Create billing portal session
		const appUrl = config("APP_URL");
		if (!appUrl) {
			logger.error("APP_URL not configured");
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: "APP_URL is not configured",
			});
		}

		let session;
		try {
			const stripeClient = getStripeClient();
			session = await stripeClient.billingPortal.sessions.create({
				customer: stripeCustomerId,
				return_url: `${appUrl}/account/billing`,
			});
		} catch (error) {
			logger.error("Failed to create billing portal session", {
				userId: user.id,
				error: error instanceof Error
					? { message: error.message, stack: error.stack }
					: String(error),
			});
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: "Failed to create billing portal session",
			});
		}

		logger.info("Billing portal session created", {
			userId: user.id,
			sessionId: session.id,
		});

		return json({
			data: { url: session.url },
			requestId,
		});
	}),
);

export default {
	fetch: async (req: Request) => {
		const res = await app.fetch(req);
		return withCORS()(req, res);
	},
};
