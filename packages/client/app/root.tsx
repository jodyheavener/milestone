import "~/app.css";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { ErrorContent, getErrorContent } from "~/features/errors";
import type { Route } from "./+types/root";
import { AppWrapper } from "~/library/app-wrapper";
import { makeServerClient, AuthContext } from "~/library/supabase";
import { ThemeProvider } from "./library/theme";
import { isAuthError, type User } from "@supabase/supabase-js";

export const links: Route.LinksFunction = () => [
	{
		rel: "icon",
		type: "image/svg+xml",
		href: "/favicon-onlight.svg",
		media: "(prefers-color-scheme: light)",
	},
	{
		rel: "icon",
		type: "image/svg+xml",
		href: "/favicon-ondark.svg",
		media: "(prefers-color-scheme: dark)",
	},
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Inclusive+Sans:ital,wght@0,300..700;1,300..700&display=swap",
	},
];

export const middleware: Route.MiddlewareFunction[] = [
	async ({ request, context }, next) => {
		const { supabase, applyCookies } = makeServerClient(request);

		const { data, error } = await supabase.auth.getUser();
		let user: User | null = null;

		if (error) {
			if (isAuthError(error)) {
				await supabase.auth.signOut();
			} else {
				throw error;
			}
		} else {
			user = data.user;
		}

		context.set(AuthContext, { supabase, user });

		const response = await next();
		return applyCookies(response);
	},
];

export async function loader({ context }: Route.LoaderArgs) {
	const { user } = context.get(AuthContext);
	return { user };
}

// export const shouldRevalidate = () => false;

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function Root({ loaderData: { user } }: Route.ComponentProps) {
	return (
		<AppWrapper user={user}>
			<Outlet />
		</AppWrapper>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	return (
		<ThemeProvider>
			<ErrorContent {...getErrorContent(error)} />
		</ThemeProvider>
	);
}
