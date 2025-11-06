import { makeBrowserClient } from "@/lib/supabase";
import { createPortalSession } from "../api/subscription";

/**
 * Handle opening the subscription portal
 */
export async function handleManageSubscription(): Promise<string | null> {
	const supabase = makeBrowserClient();
	const result = await createPortalSession(supabase);
	return result.url || null;
}
