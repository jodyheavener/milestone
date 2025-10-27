import { href, Outlet, redirect } from "react-router";
import type { Route } from "./+types/authenticated";
import { isLoggedIn } from "~/library/supabase";

export const middleware: Route.MiddlewareFunction[] = [
	async ({ context }) => {
		if (isLoggedIn(context)) {
			throw redirect(href("/"));
		}
	},
];

export default function LayoutUnauthenticated() {
	return <Outlet />;
}
