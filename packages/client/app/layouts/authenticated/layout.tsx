import { createPath, href, Outlet, redirect } from "react-router";
import { isLoggedIn } from "@/lib/supabase";
import type { Route } from "./+types/layout";

export const middleware: Route.MiddlewareFunction[] = [
	async ({ request, context }) => {
		if (!isLoggedIn(context)) {
			const url = new URL(request.url);
			const redirectTo = url.pathname + url.search;
			throw redirect(
				createPath({
					pathname: href("/login"),
					search: `redirect=${encodeURIComponent(redirectTo)}`,
				})
			);
		}
	},
];

export default function Layout() {
	return (
		<>
			<Outlet />
		</>
	);
}
