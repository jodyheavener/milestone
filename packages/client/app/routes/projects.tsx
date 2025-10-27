import { createPageTitle } from "~/library/utilities";
import { useAuth } from "~/features/authentication";
import { UserInfo } from "~/features/projects";
import type { Route } from "./+types/projects";

export function meta({}: Route.MetaArgs) {
	return [
		{
			title: createPageTitle("Projects"),
		},
	];
}

export default function Component({}: Route.ComponentProps) {
	const { user } = useAuth();

	return (
		<div className="flex items-center justify-center min-h-dvh select-none">
			<div className="flex flex-col items-center gap-6">
				<h1 className="text-2xl font-bold">Projects</h1>
				<UserInfo />
				<div className="text-muted-foreground">
					<p>Welcome, {user?.email}</p>
				</div>
			</div>
		</div>
	);
}
