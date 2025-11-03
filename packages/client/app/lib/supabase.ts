import type { Database } from "@milestone/shared";
import { createBrowserClient } from "@supabase/ssr";
import {
	createServerClient,
	parseCookieHeader,
	serializeCookieHeader,
} from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient as SupabaseJSClient } from "@supabase/supabase-js";
import type { RouterContextProvider } from "react-router";
import { createContext } from "react-router";
import { config } from "@/lib/config";

export type AuthContextValue = {
	supabase: SupabaseClient;
	user: User | null;
};

export const AuthContext: ReturnType<typeof createContext<AuthContextValue>> =
	createContext<AuthContextValue>();

export function makeBrowserClient() {
	return createBrowserClient<Database>(
		config("APP_SUPABASE_URL"),
		config("APP_SUPABASE_ANON_KEY")
	);
}

export function makeServerClient(request: Request): {
	supabase: SupabaseJSClient<Database>;
	applyCookies: (response: Response) => Response;
} {
	const setCookieHeaders: string[] = [];

	const supabase = createServerClient<Database>(
		config("APP_SUPABASE_URL"),
		config("APP_SUPABASE_ANON_KEY"),
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

export function isLoggedIn(context: Readonly<RouterContextProvider>) {
	const { user } = context.get(AuthContext);
	return user !== null;
}

export async function sendFunction<T>(
	supabase: SupabaseClient,
	name: string,
	body?: Record<string, string | number | boolean>
): Promise<T | null> {
	const { data: response, error } = await supabase.functions.invoke<T>(name, {
		body,
	});

	if (error) {
		throw error;
	}

	return response;
}
