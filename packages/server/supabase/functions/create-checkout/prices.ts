import { getServiceClient, logger } from "@/lib";
import { ServiceError } from "@milestone/shared";

/**
 * Resolve price IDs from plan_key or price_ids input
 */
export async function resolvePriceIds(
	planKey: string | undefined,
	priceIds: string | string[] | undefined,
): Promise<string[]> {
	if (!planKey && !priceIds) {
		throw new ServiceError("INVALID_REQUEST", {
			debugInfo: "Either price_ids or plan_key must be provided",
		});
	}

	const sbServiceClient = getServiceClient();

	if (planKey) {
		// Look up price IDs by plan_key from metadata
		const { data: prices, error: priceError } = await sbServiceClient
			.from("stripe_prices")
			.select("stripe_price_id")
			.eq("metadata->>plan_key", planKey)
			.eq("active", true);

		if (priceError || !prices || prices.length === 0) {
			logger.error("Plan key not found", {
				planKey,
				error: priceError?.message,
			});
			throw new ServiceError("INVALID_REQUEST", {
				debugInfo: `Plan key '${planKey}' not found`,
			});
		}

		return prices.map((p) => p.stripe_price_id);
	}

	// Use provided price_ids
	if (priceIds) {
		return Array.isArray(priceIds) ? priceIds : [priceIds];
	}

	return [];
}
