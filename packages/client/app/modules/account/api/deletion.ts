import { makeBrowserClient } from "@/lib/supabase";

export async function deleteAccount(): Promise<void> {
	const supabase = makeBrowserClient();

	const { error } = await supabase.rpc("delete_user");

	if (error) {
		throw error;
	}
}
