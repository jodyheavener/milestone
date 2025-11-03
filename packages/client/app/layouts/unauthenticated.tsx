import { href, Outlet, redirect } from "react-router";
import { isLoggedIn } from "@/lib/supabase";
import type { Route } from "./+types/authenticated";

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
