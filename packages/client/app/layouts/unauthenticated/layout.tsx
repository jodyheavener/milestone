import { href, Outlet, redirect } from "react-router";
import { isLoggedIn } from "@/lib/supabase";
import type { Route } from "./+types/layout";

export const middleware: Route.MiddlewareFunction[] = [
	async ({ context }) => {
		if (isLoggedIn(context)) {
			throw redirect(href("/"));
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
