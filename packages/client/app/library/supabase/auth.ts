import { createContext } from "react-router";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "~/library/supabase";

export type AuthContextValue = {
	supabase: SupabaseClient;
	user: User | null;
};

export const AuthContext: ReturnType<typeof createContext<AuthContextValue>> =
	createContext<AuthContextValue>();
