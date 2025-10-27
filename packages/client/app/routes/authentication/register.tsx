import { createPageTitle } from "~/library/utilities";
import { RegisterForm } from "~/features/authentication";
import type { Route } from "./+types/register";

export function meta({}: Route.MetaArgs) {
	return [
		{
			title: createPageTitle("Create Account"),
		},
	];
}

export default function Component({}: Route.ComponentProps) {
	return <RegisterForm />;
}
