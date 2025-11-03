import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { ServiceError } from "@milestone/shared";
import type { Database } from "./deps.ts";

/**
 * Extract Authorization header from request
 */
export function getAuthHeader(req: Request): string | undefined {
	return req.headers.get("Authorization") ?? undefined;
}

/**
 * Get authenticated user or throw 401
 */
export async function getUserOrThrow(
	client: SupabaseClient<Database>,
): Promise<User> {
	const {
		data: { user },
		error,
	} = await client.auth.getUser();

	if (error || !user) {
		throw new ServiceError("UNAUTHORIZED");
	}

	return user;
}
