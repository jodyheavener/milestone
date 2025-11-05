import "@supabase/functions-js";
import { Hono, z } from "@/lib";
import { getUserClient } from "@/lib";
import { getAuthHeader, getUserOrThrow } from "@/lib";
import { handleRequest, json, logger, withCORS } from "@/lib";
import { config, getStripeClient } from "@/lib";
import { ServiceError } from "@milestone/shared";
import { ensureStripeCustomer } from "./customer.ts";
import { resolvePriceIds } from "./prices.ts";

const app = new Hono();

// Validation schema
const CreateCheckoutSchema = z
	.object({
		price_ids: z.union([z.array(z.string()), z.string()]).optional(),
		plan_key: z.string().optional(),
	})
	.refine((data) => data.price_ids || data.plan_key, {
		message: "Either price_ids or plan_key must be provided",
	});

// Preflight
app.options("*", () => new Response(null, { status: 204 }));

/**
 * Create a Stripe checkout session for subscription
 * Either price_ids or plan_key must be provided
 */
app.post(
	"/create-checkout",
	handleRequest(async (c, requestId) => {
		const sbUserClient = getUserClient(getAuthHeader(c.req.raw));
		const user = await getUserOrThrow(sbUserClient);

		// Validate input
		const body = await c.req.json();
		const input = CreateCheckoutSchema.parse(body);

		logger.info("Create checkout", {
			userId: user.id,
			planKey: input.plan_key,
		});

		// Ensure Stripe customer exists
		let stripeCustomerId: string;
		try {
			stripeCustomerId = await ensureStripeCustomer(
				user.id,
				user.email || "",
			);
		} catch (error) {
			logger.error("Failed to ensure Stripe customer", {
				userId: user.id,
				error: error instanceof Error
					? { message: error.message, stack: error.stack }
					: String(error),
			});
			throw error;
		}

		// Resolve price IDs
		let finalPriceIds: string[];
		try {
			finalPriceIds = await resolvePriceIds(
				input.plan_key,
				input.price_ids,
			);
		} catch (error) {
			logger.error("Failed to resolve price IDs", {
				userId: user.id,
				planKey: input.plan_key,
				error: error instanceof Error
					? { message: error.message, stack: error.stack }
					: String(error),
			});
			throw error;
		}

		// Create checkout session
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
			session = await stripeClient.checkout.sessions.create({
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
		} catch (error) {
			logger.error("Failed to create checkout session", {
				userId: user.id,
				error: error instanceof Error
					? { message: error.message, stack: error.stack }
					: String(error),
			});
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: "Failed to create checkout session",
			});
		}

		logger.info("Checkout session created", {
			userId: user.id,
			sessionId: session.id,
		});

		return json({
			data: {
				session_id: session.id,
				url: session.url,
			},
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
