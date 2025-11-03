import { makeBrowserClient } from "@/lib/supabase";
import { createPortalSession } from "../api/billing";

/**
 * Handle opening the billing portal
 */
export async function handleManageBilling(): Promise<string | null> {
	const supabase = makeBrowserClient();
	const result = await createPortalSession(supabase);
	return result.url || null;
}
