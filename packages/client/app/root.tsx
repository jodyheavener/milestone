import "~/app.css";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { ErrorContent, getErrorContent } from "~/features/errors";
import type { Route } from "./+types/root";
import { AppWrapper } from "~/library/app-wrapper";
import { makeServerClient } from "~/library/supabase";
import { ThemeProvider } from "./library/theme";

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

export async function loader({ request }: Route.LoaderArgs) {
	const supabase = makeServerClient(request);

	const {
		data: { session },
	} = await supabase.auth.getSession();

	return {
		session,
	};
}

export const shouldRevalidate = () => false;

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

export default function Root({
	loaderData: { session },
}: Route.ComponentProps) {
	return (
		<AppWrapper session={session}>
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
