import type { User } from "@supabase/supabase-js";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "./ThemeProvider";

export function AppProviders({
	children,
	user,
}: {
	children: React.ReactNode;
	user: User | null;
}) {
	return (
		<AuthProvider initialUser={user}>
			<ThemeProvider>{children}</ThemeProvider>
		</AuthProvider>
	);
}
