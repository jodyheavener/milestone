import type { SupabaseClient } from "~/library/supabase/clients";

export interface Subscription {
	id: string;
	status: string;
	current_period_start: string | null;
	current_period_end: string | null;
	cancel_at_period_end: boolean;
}

export interface Entitlements {
	projects_limit: number;
	agentic_limit: number;
	resets_at: string | null;
}

export interface UsageCounters {
	agentic_requests_used: number;
	projects_used: number;
	period_start: string;
	period_end: string;
}

export interface CreateCheckoutResponse {
	session_id: string;
	url: string;
}

export interface CreatePortalResponse {
	url: string;
}

export interface AuthorizeOperationResponse {
	allowed: boolean;
	reason: string | null;
	remaining: number | null;
}

export interface Product {
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

export async function createCheckoutSession(
	supabase: SupabaseClient,
	priceIds?: string[],
	planKey?: string
): Promise<CreateCheckoutResponse> {
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		throw new Error("No active session");
	}

	const body: Record<string, unknown> = {};
	if (priceIds) {
		body.price_ids = priceIds;
	}
	if (planKey) {
		body.plan_key = planKey;
	}

	const { data, error } =
		await supabase.functions.invoke<CreateCheckoutResponse>(
			"billing-create-checkout",
			{
				body,
				headers: {
					Authorization: `Bearer ${session.access_token}`,
				},
			}
		);

	if (error) {
		throw error;
	}

	if (!data) {
		throw new Error("No data returned from checkout creation");
	}

	return data;
}

export async function createPortalSession(
	supabase: SupabaseClient
): Promise<CreatePortalResponse> {
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		throw new Error("No active session");
	}

	const { data, error } = await supabase.functions.invoke<CreatePortalResponse>(
		"billing-create-portal",
		{
			headers: {
				Authorization: `Bearer ${session.access_token}`,
			},
		}
	);

	if (error) {
		throw error;
	}

	if (!data) {
		throw new Error("No data returned from portal creation");
	}

	return data;
}

export async function authorizeOperation(
	supabase: SupabaseClient,
	op: "project" | "agentic_request"
): Promise<AuthorizeOperationResponse> {
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		throw new Error("No active session");
	}

	const { data, error } =
		await supabase.functions.invoke<AuthorizeOperationResponse>(
			"usage-authorize",
			{
				body: { op },
				headers: {
					Authorization: `Bearer ${session.access_token}`,
				},
			}
		);

	if (error) {
		throw error;
	}

	if (!data) {
		throw new Error("No data returned from authorization");
	}

	return data;
}

export async function getSubscription(
	supabase: SupabaseClient
): Promise<Subscription | null> {
	const { data, error } = await supabase
		.from("subscriptions")
		.select("*")
		.in("status", ["active", "trialing"])
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			// No rows returned
			return null;
		}
		throw error;
	}

	return data as Subscription;
}

export async function getEntitlements(
	supabase: SupabaseClient
): Promise<Entitlements | null> {
	const { data, error } = await supabase
		.from("entitlements")
		.select("*")
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			// No rows returned
			return null;
		}
		throw error;
	}

	return data as Entitlements;
}

export async function getUsageCounters(
	supabase: SupabaseClient
): Promise<UsageCounters | null> {
	const { data, error } = await supabase
		.from("usage_counters")
		.select("*")
		.order("period_start", { ascending: false })
		.limit(1)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			// No rows returned
			return null;
		}
		throw error;
	}

	return data as UsageCounters;
}

export async function getProjectsCount(
	supabase: SupabaseClient
): Promise<number> {
	const { count, error } = await supabase
		.from("project")
		.select("*", { count: "exact", head: true });

	if (error) {
		throw error;
	}

	return count || 0;
}

export async function canCreateProject(
	supabase: SupabaseClient
): Promise<{ allowed: boolean; reason?: string }> {
	try {
		const result = await authorizeOperation(supabase, "project");
		return {
			allowed: result.allowed,
			reason: result.reason || undefined,
		};
	} catch (error) {
		console.error("Error checking project creation:", error);
		return {
			allowed: false,
			reason: "Unable to verify entitlement",
		};
	}
}

export async function getProducts(
	supabase: SupabaseClient
): Promise<Product[]> {
	const { data, error } = await supabase.functions.invoke<Product[]>(
		"billing-list-products",
		{
			method: "GET",
		}
	);

	if (error) {
		throw error;
	}

	if (!data) {
		return [];
	}

	return data;
}
