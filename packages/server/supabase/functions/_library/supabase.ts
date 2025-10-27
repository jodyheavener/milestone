import { createClient } from "@supabase/supabase-js";
import type { Database } from "@m/shared";
import { supabase } from "./config.ts";

export const supabaseClient = createClient<Database>(
	supabase.url,
	supabase.serviceRoleKey,
);
