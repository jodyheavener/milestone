import { redirect } from "react-router";
import { createPageTitle } from "@/lib";
import { AuthContext } from "@/lib/supabase";
import { getProject, updateProject } from "../api/projects";
import { EditProjectForm } from "../ui/edit-project-form";
import type { Route } from "./+types/edit";

export async function loader({ context, params }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const project = await getProject(supabase, params.id);

	if (!project) {
		throw redirect("/projects");
	}

	return { project };
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const { supabase } = context.get(AuthContext);
	const formData = await request.formData();
	const title = formData.get("title");
	const goal = formData.get("goal");

	if (!title || !goal) {
		return {
			error: "Title and goal are required",
		};
	}

	try {
		await updateProject(supabase, params.id, {
			title: title.toString().trim(),
			goal: goal.toString().trim(),
		});

		throw redirect(`/projects/${params.id}`);
	} catch (error) {
		if (error instanceof Response) {
			throw error;
		}

		return {
			error:
				error instanceof Error ? error.message : "Failed to update project",
		};
	}
}

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{
			title: createPageTitle(`Edit Project: ${loaderData.project.title}`),
		},
	];
}

export default function Component({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { project } = loaderData;

	return <EditProjectForm project={project} error={actionData?.error} />;
}
