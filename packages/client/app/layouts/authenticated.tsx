import { createPath, href, Outlet, redirect } from "react-router";
import type { Route } from "./+types/authenticated";
import { isLoggedIn } from "~/library/supabase";

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

export default function LayoutAuthenticated() {
	return <Outlet />;
}
