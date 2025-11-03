import { getServiceClient, logger } from "@/lib";

/**
 * Update user entitlements based on subscription items
 * Aggregates limits from all subscription prices and updates usage counters
 */
export async function updateEntitlementsFromSubscription(
	userId: string,
	stripeSubscriptionId: string,
	requestId: string,
) {
	logger.setRequestId(requestId);
	const sbUserClient = getServiceClient();

	const { data: subscription, error: subError } = await sbUserClient
		.from("subscriptions")
		.select(
			`
			id,
			current_period_end,
			subscription_items (
				stripe_price_id,
				metadata
			)
		`,
		)
		.eq("stripe_subscription_id", stripeSubscriptionId)
		.single();

	if (subError || !subscription) {
		logger.error("Subscription not found", {
			subscriptionId: stripeSubscriptionId,
		});
		return;
	}

	const priceIds = (
		subscription.subscription_items as Array<{
			stripe_price_id: string;
		}>
	).map((item) => item.stripe_price_id);

	const { data: prices, error: pricesError } = await sbUserClient
		.from("stripe_prices")
		.select("metadata, id")
		.in("id", priceIds);

	if (pricesError || !prices || prices.length === 0) {
		logger.error("Failed to fetch prices for entitlements");
		return;
	}

	let maxProjectsLimit = 0;
	let maxAgenticLimit = 0;

	for (const price of prices) {
		const metadata = price.metadata as Record<string, unknown> | null;
		if (metadata) {
			const projectsLimit = Number(metadata.projects_limit) || 0;
			const agenticLimit = Number(metadata.agentic_limit) || 0;

			maxProjectsLimit = Math.max(maxProjectsLimit, projectsLimit);
			maxAgenticLimit = Math.max(maxAgenticLimit, agenticLimit);
		}
	}

	if (!subscription.current_period_end) {
		logger.warn("Subscription missing current_period_end");
		return;
	}

	const periodEnd = new Date(subscription.current_period_end);

	const { error: entitlementsError } = await sbUserClient
		.from("entitlements")
		.upsert(
			{
				user_id: userId,
				projects_limit: maxProjectsLimit,
				agentic_limit: maxAgenticLimit,
				resets_at: periodEnd.toISOString(),
				source: subscription,
			},
			{
				onConflict: "user_id",
			},
		);

	if (entitlementsError) {
		logger.error("Failed to update entitlements", {
			error: entitlementsError.message,
		});
	}

	const periodStart = new Date(periodEnd);
	periodStart.setMonth(periodStart.getMonth() - 1);

	await sbUserClient.from("usage_counters").upsert(
		{
			user_id: userId,
			period_start: periodStart.toISOString(),
			period_end: periodEnd.toISOString(),
		},
		{
			onConflict: "user_id,period_start,period_end",
		},
	);
}
