import { createBrowserClient } from "@supabase/ssr";
import {
	createServerClient,
	parseCookieHeader,
	serializeCookieHeader,
} from "@supabase/ssr";
import type { Database } from "@m/shared";
import { supabase } from "~/library/config";

export function makeBrowserClient() {
	return createBrowserClient<Database>(supabase.url, supabase.anonKey);
}

export function makeServerClient(request: Request) {
	const headers = new Headers();

	return createServerClient<Database>(supabase.url, supabase.anonKey, {
		cookies: {
			getAll() {
				return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
					(cookie) => ({
						name: cookie.name,
						value: cookie.value ?? "",
					})
				);
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) =>
					headers.append(
						"Set-Cookie",
						serializeCookieHeader(name, value, options)
					)
				);
			},
		},
	});
}

export type SupabaseServerClient = ReturnType<typeof makeServerClient>;
export type SupabaseBrowserClient = ReturnType<typeof makeBrowserClient>;
export type SupabaseClient = SupabaseServerClient | SupabaseBrowserClient;
