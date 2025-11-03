import { redirect } from "react-router";
import { createPageTitle } from "@/lib";
import { AuthContext } from "@/lib/supabase";
import {
	canCreateProject,
	getEntitlements,
} from "@/modules/account/api/billing";
import { createProject } from "../api/projects";
import { NewProjectForm } from "../ui/new-project-form";
import type { Route } from "./+types/new";

export async function loader({ context }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw redirect("/login");
	}

	// Check if user can create a project
	const canCreate = await canCreateProject(supabase);
	const entitlements = await getEntitlements(supabase).catch(() => null);

	return {
		canCreate: canCreate.allowed,
		reason: canCreate.reason,
		entitlements,
	};
}

export async function action({ request, context }: Route.ActionArgs) {
	const { supabase, user } = context.get(AuthContext);

	if (!user) {
		return { error: "User not authenticated" };
	}

	// Double-check entitlement before creation
	const canCreate = await canCreateProject(supabase);
	if (!canCreate.allowed) {
		return {
			error:
				canCreate.reason || "Project limit exceeded. Please upgrade your plan.",
		};
	}

	const formData = await request.formData();
	const title = formData.get("title");
	const goal = formData.get("goal");

	if (!title || !goal) {
		return {
			error: "Title and goal are required",
		};
	}

	try {
		await createProject(supabase, user, {
			title: title.toString().trim(),
			goal: goal.toString().trim(),
		});

		throw redirect("/projects");
	} catch (error) {
		if (error instanceof Response) {
			throw error;
		}

		return {
			error:
				error instanceof Error ? error.message : "Failed to create project",
		};
	}
}

export function meta({}: Route.MetaArgs) {
	return [
		{
			title: createPageTitle("New Project"),
		},
	];
}

export default function Component({
	actionData,
	loaderData,
}: Route.ComponentProps) {
	const { canCreate, reason, entitlements } = loaderData;

	return (
		<NewProjectForm
			canCreate={canCreate}
			reason={reason}
			entitlements={entitlements}
			error={actionData?.error}
		/>
	);
}
