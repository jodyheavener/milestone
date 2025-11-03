import { redirect } from "react-router";
import { createPageTitle } from "@/lib";
import { AuthContext } from "@/lib/supabase";
import { getProject } from "@/modules/projects/api/projects";
import { createTask } from "../api/tasks";
import { NewTaskForm } from "../ui/new-task-form";
import type { Route } from "./+types/new";

export async function loader({ context, request }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const url = new URL(request.url);
	const projectId = url.searchParams.get("project");

	if (!projectId) {
		throw new Response("Project ID is required", { status: 400 });
	}

	const project = await getProject(supabase, projectId);
	if (!project) {
		throw redirect("/projects");
	}

	return { project };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { supabase } = context.get(AuthContext);
	const formData = await request.formData();
	const description = formData.get("description");
	const projectId = formData.get("projectId");

	if (!description || !projectId) {
		return {
			error: "Description and project ID are required",
		};
	}

	try {
		await createTask(supabase, {
			description: description.toString().trim(),
			projectId: projectId.toString(),
		});

		throw redirect(`/projects/${projectId}`);
	} catch (error) {
		if (error instanceof Response) {
			throw error;
		}

		return {
			error: error instanceof Error ? error.message : "Failed to create task",
		};
	}
}

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{
			title: createPageTitle(`New Task: ${loaderData.project.title}`),
		},
	];
}

export default function Component({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { project } = loaderData;

	return <NewTaskForm project={project} error={actionData?.error} />;
}
