import "@supabase/functions-js";
import { ServiceError } from "@m/shared";
import { getStripeClient, serveFunction, supabaseClient } from "~/library";
import type Stripe from "stripe";

interface SyncCatalogRequest {
	secret?: string; // Internal secret to prevent unauthorized access
}

serveFunction(
	{
		methods: ["POST"],
		setCors: false,
		authed: false,
	},
	async ({ request, respond }) => {
		try {
			// Optional: Add a secret check for additional security
			// In production, you can set this as an environment variable
			const body = (await request.json().catch(() => ({}))) as
				| SyncCatalogRequest
				| undefined;

			// Get secret from request or environment
			const expectedSecret = Deno.env.get("STRIPE_SYNC_SECRET");
			if (expectedSecret && body?.secret !== expectedSecret) {
				throw new ServiceError("UNAUTHORIZED", {
					debugInfo: "Invalid sync secret",
				});
			}

			const stripe = getStripeClient();
			let syncedProducts = 0;
			let syncedPrices = 0;
			const errors: string[] = [];

			// Fetch all products from Stripe
			console.log("Fetching products from Stripe...");
			const products: Stripe.Product[] = [];
			let hasMore = true;
			let startingAfter: string | undefined;

			while (hasMore) {
				const productList = await stripe.products.list({
					limit: 100,
					starting_after: startingAfter,
				});

				products.push(...productList.data);
				hasMore = productList.has_more;
				startingAfter =
					productList.data.length > 0
						? productList.data[productList.data.length - 1].id
						: undefined;
			}

			console.log(`Found ${products.length} products in Stripe`);

			// Sync each product
			for (const product of products) {
				try {
					const { error: productError } = await supabaseClient
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
							}
						);

					if (productError) {
						errors.push(
							`Failed to sync product ${product.id}: ${productError.message}`
						);
						continue;
					}

					syncedProducts++;

					// Get the database product ID
					const { data: dbProduct, error: dbProductError } =
						await supabaseClient
							.from("stripe_products")
							.select("id")
							.eq("stripe_product_id", product.id)
							.single();

					if (dbProductError || !dbProduct) {
						errors.push(
							`Failed to find database product for ${product.id}: ${dbProductError?.message}`
						);
						continue;
					}

					// Fetch all prices for this product
					console.log(`Fetching prices for product ${product.id}...`);
					const prices: Stripe.Price[] = [];
					hasMore = true;
					startingAfter = undefined;

					while (hasMore) {
						const priceList = await stripe.prices.list({
							product: product.id,
							limit: 100,
							starting_after: startingAfter,
						});

						prices.push(...priceList.data);
						hasMore = priceList.has_more;
						startingAfter =
							priceList.data.length > 0
								? priceList.data[priceList.data.length - 1].id
								: undefined;
					}

					// Sync each price
					for (const price of prices) {
						try {
							const { error: priceError } = await supabaseClient
								.from("stripe_prices")
								.upsert(
									{
										stripe_price_id: price.id,
										stripe_product_id: dbProduct.id,
										currency: price.currency,
										unit_amount: price.unit_amount || 0,
										recurring_interval: price.recurring?.interval || null,
										type: price.type === "recurring" ? "recurring" : "one_time",
										usage_type:
											price.billing_scheme === "per_unit"
												? "licensed"
												: "metered",
										metadata: price.metadata || null,
									},
									{
										onConflict: "stripe_price_id",
									}
								);

							if (priceError) {
								errors.push(
									`Failed to sync price ${price.id}: ${priceError.message}`
								);
							} else {
								syncedPrices++;
							}
						} catch (error) {
							errors.push(
								`Error syncing price ${price.id}: ${
									error instanceof Error ? error.message : "Unknown error"
								}`
							);
						}
					}
				} catch (error) {
					errors.push(
						`Error syncing product ${product.id}: ${
							error instanceof Error ? error.message : "Unknown error"
						}`
					);
				}
			}

			console.log(
				`Sync complete: ${syncedProducts} products, ${syncedPrices} prices`
			);

			return respond({
				success: true,
				products_synced: syncedProducts,
				prices_synced: syncedPrices,
				errors: errors.length > 0 ? errors : undefined,
			});
		} catch (error) {
			if (error instanceof ServiceError) {
				throw error;
			}

			console.error("Sync catalog error:", error);
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
);
