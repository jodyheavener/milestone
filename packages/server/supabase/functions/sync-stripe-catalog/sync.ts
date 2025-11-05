import type Stripe from "stripe";
import { getServiceClient, getStripeClient, logger } from "@/lib";

/**
 * Sync a single product and its prices to the database
 */
export async function syncProduct(
	product: Stripe.Product,
	requestId: string,
): Promise<{ pricesSynced: number; errors: string[] }> {
	logger.setRequestId(requestId);
	const sbServiceClient = getServiceClient();
	let pricesSynced = 0;
	const errors: string[] = [];

	try {
		// Sync product
		const { error: productError } = await sbServiceClient
			.from("stripe_products")
			.upsert(
				{
					stripe_product_id: product.id,
					name: product.name,
					description: product.description || null,
					active: product.active,
					metadata: product.metadata || null,
				},
				{
					onConflict: "stripe_product_id",
				},
			);

		if (productError) {
			errors.push(
				`Failed to sync product ${product.id}: ${productError.message}`,
			);
			return { pricesSynced, errors };
		}

		// Get the database product ID
		const { data: dbProduct, error: dbProductError } = await sbServiceClient
			.from("stripe_products")
			.select("id")
			.eq("stripe_product_id", product.id)
			.single();

		if (dbProductError || !dbProduct) {
			errors.push(
				`Failed to find database product for ${product.id}: ${dbProductError?.message}`,
			);
			return { pricesSynced, errors };
		}

		// Fetch all prices for this product
		const stripeClient = getStripeClient();
		const prices: Stripe.Price[] = [];
		let hasMore = true;
		let startingAfter: string | undefined;

		while (hasMore) {
			const priceList = await stripeClient.prices.list({
				product: product.id,
				limit: 100,
				starting_after: startingAfter,
			});

			prices.push(...priceList.data);
			hasMore = priceList.has_more;
			startingAfter = priceList.data.length > 0
				? priceList.data[priceList.data.length - 1].id
				: undefined;
		}

		// Sync each price
		for (const price of prices) {
			try {
				const { error: priceError } = await sbServiceClient
					.from("stripe_prices")
					.upsert(
						{
							stripe_price_id: price.id,
							stripe_product_id: dbProduct.id,
							currency: price.currency,
							unit_amount: price.unit_amount || 0,
							recurring_interval: price.recurring?.interval || null,
							type: price.type === "recurring" ? "recurring" : "one_time",
							usage_type: price.billing_scheme === "per_unit"
								? "licensed"
								: "metered",
							metadata: price.metadata || null,
						},
						{
							onConflict: "stripe_price_id",
						},
					);

				if (priceError) {
					errors.push(
						`Failed to sync price ${price.id}: ${priceError.message}`,
					);
				} else {
					pricesSynced++;
				}
			} catch (error) {
				errors.push(
					`Error syncing price ${price.id}: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				);
			}
		}
	} catch (error) {
		errors.push(
			`Error syncing product ${product.id}: ${
				error instanceof Error ? error.message : "Unknown error"
			}`,
		);
	}

	return { pricesSynced, errors };
}

/**
 * Fetch all products from Stripe (paginated)
 */
export async function fetchAllStripeProducts(): Promise<Stripe.Product[]> {
	const stripeClient = getStripeClient();
	const products: Stripe.Product[] = [];
	let hasMore = true;
	let startingAfter: string | undefined;

	while (hasMore) {
		const productList = await stripeClient.products.list({
			limit: 100,
			starting_after: startingAfter,
		});

		products.push(...productList.data);
		hasMore = productList.has_more;
		startingAfter = productList.data.length > 0
			? productList.data[productList.data.length - 1].id
			: undefined;
	}

	return products;
}
