import "@supabase/functions-js";
import {
	getServiceClient,
	handleRequest,
	Hono,
	json,
	logger,
	withCORS,
} from "@/lib";
import { formatProducts } from "./formatters.ts";
import { ServiceError } from "@milestone/shared";

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
			logger.error("Failed to fetch products", {
				error: productsError.message,
			});
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: `Failed to fetch products: ${productsError.message}`,
			});
		}

		if (!products) {
			logger.info("No products found");
			return json({ data: [], requestId });
		}

		// Transform the data to a cleaner format
		const productsWithPrices = formatProducts(products);

		logger.info("Products listed", {
			count: productsWithPrices.length,
		});

		return json({ data: productsWithPrices, requestId });
	}),
);

export default {
	fetch: async (req: Request) => {
		const res = await app.fetch(req);
		return withCORS()(req, res);
	},
};
