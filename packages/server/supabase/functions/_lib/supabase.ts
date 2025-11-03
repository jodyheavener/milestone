import { createClient } from "./deps.ts";
import type { Database } from "./deps.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config.ts";

let serviceSupabaseClient: ReturnType<typeof createClient<Database>> | null =
	null;

/**
 * Get Supabase client acting as the authenticated user
 * Uses ANON key + forwarded Authorization header (respects RLS)
 * Creates a new client instance per call to support different auth headers
 */
export function getUserClient(authHeader?: string): SupabaseClient<Database> {
	return createClient<Database>(
		config("SUPABASE_URL"),
		config("SUPABASE_ANON_KEY"),
		{
			global: {
				headers: authHeader ? { Authorization: authHeader } : {},
			},
		},
	);
}

/**
 * Get or create Supabase client with service role (bypasses RLS)
 * Use sparingly - only for system operations, webhooks, etc.
 */
export function getServiceClient() {
	if (!serviceSupabaseClient) {
		serviceSupabaseClient = createClient<Database>(
			config("SUPABASE_URL"),
			config("SUPABASE_SERVICE_ROLE_KEY"),
			{
				auth: {
					persistSession: false,
				},
			},
		);
	}

	return serviceSupabaseClient;
}
