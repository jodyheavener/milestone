import { redirect } from "react-router";
import { createPageTitle } from "@/lib";
import { AuthContext } from "@/lib/supabase";
import { getProject } from "@/modules/projects/api/projects";
import { deleteTask, getTask, toggleTaskCompletion } from "../api/tasks";
import { TaskView } from "../ui/task-view";
import type { Route } from "./+types/view";

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
	const intent = formData.get("intent");

	const task = await getTask(supabase, params.id);
	if (!task) {
		throw redirect("/projects");
	}

	if (intent === "delete") {
		await deleteTask(supabase, params.id);
		throw redirect(`/projects/${task.project_id}`);
	}

	if (intent === "toggle") {
		const isCompleted = formData.get("completed") === "true";
		await toggleTaskCompletion(supabase, params.id, isCompleted);
		throw redirect(`/tasks/${params.id}`);
	}
}

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{
			title: createPageTitle(`Task: ${loaderData.task.description}`),
		},
	];
}

export default function Component({ loaderData }: Route.ComponentProps) {
	const { task, project } = loaderData;

	return <TaskView task={task} project={project} />;
}
