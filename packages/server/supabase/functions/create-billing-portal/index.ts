import "@supabase/functions-js";
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
import { ServiceError } from "@milestone/shared";
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
		const stripeCustomerId = await validateStripeCustomer(user.id);

		// Create billing portal session
		const appUrl = config("APP_URL");
		if (!appUrl) {
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: "APP_URL is not configured",
			});
		}

		const stripeClient = getStripeClient();
		const session = await stripeClient.billingPortal.sessions.create({
			customer: stripeCustomerId,
			return_url: `${appUrl}/account/billing`,
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
