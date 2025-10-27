import { createPageTitle } from "~/library/utilities";
import type { Route } from "./+types/home";

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
			<div className="flex flex-col items-center gap-3">
				<p>Home</p>
			</div>
		</div>
	);
}
