import { makeServerClient, type SupabaseClient } from "./clients";

export async function isLoggedIn(request: Request) {
	const supabase = makeServerClient(request);
	const {
		data: { session },
	} = await supabase.auth.getSession();
	return session !== null;
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
