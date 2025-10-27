import { createPageTitle } from "~/library/utilities";
import { LoginForm } from "~/features/authentication";
import type { Route } from "./+types/login";

export function meta({}: Route.MetaArgs) {
	return [
		{
			title: createPageTitle("Sign In"),
		},
	];
}

export default function Component({}: Route.ComponentProps) {
	return <LoginForm />;
}
