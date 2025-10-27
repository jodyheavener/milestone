import type { User } from "@supabase/supabase-js";
import { AuthProvider } from "~/features/authentication";
import { ThemeProvider } from "./theme";

export function AppWrapper({
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
