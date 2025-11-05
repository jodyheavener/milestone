import "@supabase/functions-js";
import { ServiceError } from "@milestone/shared";
import { Hono, isEnv, verifySyncSecret, z } from "@/lib";
import { handleRequest, json, logger } from "@/lib";
import { fetchAllStripeProducts, syncProduct } from "./sync.ts";

const app = new Hono();

// Validation schema
const SyncCatalogSchema = z.object({
	secret: z.string().optional(),
});

/**
 * Sync Stripe products and prices to local database catalog
 * System endpoint - requires STRIPE_SYNC_SECRET if configured
 */
app.post(
	"/sync-stripe-catalog",
	handleRequest(async (c, requestId) => {
		const body = await c.req.json().catch(() => ({}));
		const input = SyncCatalogSchema.parse(body);

		if (!isEnv("lcl") && !verifySyncSecret(input.secret ?? "")) {
			throw new ServiceError("UNAUTHORIZED", {
				debugInfo: "Invalid sync secret",
			});
		}

		logger.info("Starting catalog sync");

		let syncedProducts = 0;
		let syncedPrices = 0;
		const errors: string[] = [];

		// Fetch all products from Stripe
		const products = await fetchAllStripeProducts();

		logger.info("Fetched products from Stripe", {
			count: products.length,
		});

		// Sync each product
		for (const product of products) {
			const result = await syncProduct(product, requestId);
			if (result.errors.length === 0) {
				syncedProducts++;
			}
			syncedPrices += result.pricesSynced;
			errors.push(...result.errors);
		}

		logger.info("Catalog sync complete", {
			productsSynced: syncedProducts,
			pricesSynced: syncedPrices,
			errors: errors.length,
		});

		return json({
			success: true,
			products_synced: syncedProducts,
			prices_synced: syncedPrices,
			errors: errors.length > 0 ? errors : undefined,
			requestId,
		});
	}),
);

// System endpoint - no CORS needed
export default {
	fetch: app.fetch,
};
