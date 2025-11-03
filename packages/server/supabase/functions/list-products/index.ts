import "@supabase/functions-js";
import {
	getServiceClient,
	handleRequest,
	Hono,
	json,
	logger,
	withCORS,
} from "@/lib";
import { ServiceError } from "@milestone/shared";
import { formatProducts } from "./formatters.ts";

const app = new Hono();

// Preflight
app.options("*", () => new Response(null, { status: 204 }));

/**
 * List active Stripe products with recurring prices
 * Public endpoint - no authentication required
 */
app.get(
	"/list-products",
	handleRequest(async (_c, requestId) => {
		// Public endpoint - no auth required
		const sbUserClient = getServiceClient();

		logger.info("List products");

		// Fetch active products with their prices
		const { data: products, error: productsError } = await sbUserClient
			.from("stripe_products")
			.select(
				`
				id,
				stripe_product_id,
				name,
				description,
				metadata,
				stripe_prices (
					id,
					stripe_price_id,
					currency,
					unit_amount,
					recurring_interval,
					type,
					metadata
				)
			`,
			)
			.eq("active", true)
			.order("created_at", { ascending: true });

		if (productsError) {
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: `Failed to fetch products: ${productsError.message}`,
			});
		}

		if (!products) {
			return json({ data: [], requestId });
		}

		// Transform the data to a cleaner format
		const productsWithPrices = formatProducts(products);

		return json({ data: productsWithPrices, requestId });
	}),
);

export default {
	fetch: async (req: Request) => {
		const res = await app.fetch(req);
		return withCORS()(req, res);
	},
};
