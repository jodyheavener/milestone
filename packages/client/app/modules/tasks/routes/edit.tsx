import { redirect } from "react-router";
import { createPageTitle } from "@/lib";
import { AuthContext } from "@/lib/supabase";
import { getProject } from "@/modules/projects/api/projects";
import { getTask, updateTask } from "../api/tasks";
import { EditTaskForm } from "../ui/edit-task-form";
import type { Route } from "./+types/edit";

export async function loader({ context, params }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const task = await getTask(supabase, params.id);

	if (!task) {
		throw redirect("/projects");
	}

	const project = await getProject(supabase, task.project_id);
	if (!project) {
		throw redirect("/projects");
	}

	return { task, project };
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const { supabase } = context.get(AuthContext);
	const formData = await request.formData();
	const description = formData.get("description");

	if (!description) {
		return {
			error: "Description is required",
		};
	}

	try {
		await updateTask(supabase, params.id, {
			description: description.toString().trim(),
		});

		throw redirect(`/tasks/${params.id}`);
	} catch (error) {
		if (error instanceof Response) {
			throw error;
		}

		return {
			error: error instanceof Error ? error.message : "Failed to update task",
		};
	}
}

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{
			title: createPageTitle(`Edit Task: ${loaderData.task.description}`),
		},
	];
}

export default function Component({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { task, project } = loaderData;

	return (
		<EditTaskForm task={task} project={project} error={actionData?.error} />
	);
}
