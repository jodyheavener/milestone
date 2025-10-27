import type { RouterContextProvider } from "react-router";
import { AuthContext } from "./auth";
import type { SupabaseClient } from "./clients";

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
