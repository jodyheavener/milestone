import "@supabase/functions-js";
import { ServiceError } from "@m/shared";
import { serveFunction, supabaseClient } from "~/library";

interface ProductWithPrices {
	id: string;
	stripe_product_id: string;
	name: string;
	description: string | null;
	metadata: unknown;
	prices: Array<{
		id: string;
		stripe_price_id: string;
		currency: string;
		unit_amount: number;
		recurring_interval: string | null;
		type: string;
		metadata: unknown;
	}>;
}

serveFunction(
	{
		methods: ["GET"],
		setCors: true,
		authed: false,
	},
	async ({ respond }) => {
		try {
			// Fetch active products with their prices
			const { data: products, error: productsError } = await supabaseClient
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
				return respond([]);
			}

			// Transform the data to a cleaner format
			const formattedProducts: ProductWithPrices[] = products.map(
				(product: {
					id: string;
					stripe_product_id: string;
					name: string;
					description: string | null;
					metadata: unknown;
					stripe_prices: Array<{
						id: string;
						stripe_price_id: string;
						currency: string;
						unit_amount: number;
						recurring_interval: string | null;
						type: string;
						metadata: unknown;
					}>;
				}) => ({
					id: product.id,
					stripe_product_id: product.stripe_product_id,
					name: product.name,
					description: product.description,
					metadata: product.metadata,
					prices: (product.stripe_prices || []).filter(
						(price) => price.type === "recurring",
					),
				}),
			);

			// Filter out products with no recurring prices (only show subscription products)
			const productsWithPrices = formattedProducts.filter(
				(product) => product.prices.length > 0,
			);

			return respond(productsWithPrices);
		} catch (error) {
			if (error instanceof ServiceError) {
				throw error;
			}

			console.error("List products error:", error);
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
);
