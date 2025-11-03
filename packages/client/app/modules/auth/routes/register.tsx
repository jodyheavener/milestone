import { createPageTitle } from "@/lib";
import { RegisterForm } from "../ui/register";
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
