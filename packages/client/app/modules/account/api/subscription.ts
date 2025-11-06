import type { SupabaseClient } from "@/lib/supabase";
import type {
	AuthorizeOperationResponse,
	CreateCheckoutResponse,
	CreatePortalResponse,
	Entitlements,
	Product,
	Subscription,
	UsageCounters,
} from "../model/types";

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

export async function createPortalSession(
	supabase: SupabaseClient
): Promise<CreatePortalResponse> {
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		throw new Error("No active session");
	}

	const { data, error } = await supabase.functions.invoke<{
		data: CreatePortalResponse;
	}>("create-billing-portal", {
		headers: {
			Authorization: `Bearer ${session.access_token}`,
		},
	});

	if (error) {
		throw error;
	}

	if (!data) {
		throw new Error("No data returned from portal creation");
	}

	return data.data;
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

	const { data, error } = await supabase.functions.invoke<{
		data: CreateCheckoutResponse;
	}>("create-checkout", {
		body,
		headers: {
			Authorization: `Bearer ${session.access_token}`,
		},
	});

	if (error) {
		throw error;
	}

	if (!data || !data.data) {
		throw new Error("No data returned from checkout creation");
	}

	return data.data;
}

export async function getProducts(
	supabase: SupabaseClient
): Promise<Product[]> {
	const { data, error } = await supabase.functions.invoke<{ data: Product[] }>(
		"list-products",
		{
			method: "GET",
		}
	);

	if (error) {
		throw error;
	}

	if (!data || !data.data) {
		return [];
	}

	return data.data;
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
			"authorize-operation",
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
