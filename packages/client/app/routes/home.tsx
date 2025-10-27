import { Link, redirect } from "react-router";
import { createPageTitle } from "~/library/utilities";
import { isLoggedIn } from "~/library/supabase";
import type { Route } from "./+types/home";

export const middleware: Route.MiddlewareFunction[] = [
	async ({ context }) => {
		if (isLoggedIn(context)) {
			throw redirect("/projects");
		}
	},
];

export function meta({}: Route.MetaArgs) {
	return [
		{
			title: createPageTitle(),
		},
	];
}

export default function Component({}: Route.ComponentProps) {
	return (
		<div className="flex items-center justify-center min-h-dvh select-none">
			<div className="flex flex-col items-center gap-6">
				<h1 className="text-2xl font-bold">Welcome</h1>
				<p className="text-muted-foreground">Please sign in to continue</p>
				<div className="flex gap-4">
					<Link
						to="/login"
						className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
					>
						Sign In
					</Link>
					<Link
						to="/register"
						className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
					>
						Sign Up
					</Link>
				</div>
			</div>
		</div>
	);
}
