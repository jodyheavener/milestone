import type { Session } from "@supabase/supabase-js";
import { AuthProvider } from "~/features/authentication";
import { ThemeProvider } from "./theme";

export function AppWrapper({
	children,
	session,
}: {
	children: React.ReactNode;
	session: Session | null;
}) {
	return (
		<AuthProvider initialSession={session}>
			<ThemeProvider>{children}</ThemeProvider>
		</AuthProvider>
	);
}
