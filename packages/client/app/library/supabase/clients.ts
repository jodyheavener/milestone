import { createBrowserClient } from "@supabase/ssr";
import {
	createServerClient,
	parseCookieHeader,
	serializeCookieHeader,
} from "@supabase/ssr";
import type { SupabaseClient as SupabaseJSClient } from "@supabase/supabase-js";
import type { Database } from "@m/shared";
import { supabase as supabaseConfig } from "~/library/config";

export function makeBrowserClient() {
	return createBrowserClient<Database>(
		supabaseConfig.url,
		supabaseConfig.anonKey
	);
}

export function makeServerClient(request: Request): {
	supabase: SupabaseJSClient<Database>;
	applyCookies: (response: Response) => Response;
} {
	const setCookieHeaders: string[] = [];

	const supabase = createServerClient<Database>(
		supabaseConfig.url,
		supabaseConfig.anonKey,
		{
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
						setCookieHeaders.push(serializeCookieHeader(name, value, options))
					);
				},
			},
		}
	);

	function applyCookies(response: Response) {
		for (const sc of setCookieHeaders) {
			response.headers.append("Set-Cookie", sc);
		}
		return response;
	}

	return { supabase, applyCookies };
}

export type SupabaseClient =
	| ReturnType<typeof makeServerClient>["supabase"]
	| ReturnType<typeof makeBrowserClient>;
