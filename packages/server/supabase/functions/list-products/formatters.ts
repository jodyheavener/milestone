/**
 * Transform database products to API response format
 */
export type ProductWithPrices = {
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
};

type DatabaseProduct = {
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
};

/**
 * Format products from database to API response format
 * Filters to only include recurring prices
 */
export function formatProducts(
	products: DatabaseProduct[],
): ProductWithPrices[] {
	return products
		.map((product) => ({
			id: product.id,
			stripe_product_id: product.stripe_product_id,
			name: product.name,
			description: product.description,
			metadata: product.metadata,
			prices: (product.stripe_prices || []).filter(
				(price) => price.type === "recurring",
			),
		}))
		.filter((product) => product.prices.length > 0); // Only show products with recurring prices
}
