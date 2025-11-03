import { createPageTitle } from "@/lib";
import { LoginForm } from "../ui/login";
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
