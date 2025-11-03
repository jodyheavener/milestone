import { Link, redirect } from "react-router";
import { useLoaderData } from "react-router";
import { createPageTitle } from "@/lib";
import { cn } from "@/lib";
import { AuthContext } from "@/lib/supabase";
import { getTasksForProject } from "../api/tasks";
import { TaskList } from "../ui/task-list";
import type { Route } from "./+types/list";

export async function loader({ context, request }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const url = new URL(request.url);
	const projectId = url.searchParams.get("project");

	// If no project specified, redirect to projects list
	if (!projectId) {
		throw redirect("/projects");
	}

	const tasks = await getTasksForProject(supabase, projectId);
	return { tasks, projectId };
}

export function meta({}: Route.MetaArgs) {
	return [
		{
			title: createPageTitle("Tasks"),
		},
	];
}

export default function Component({}: Route.ComponentProps) {
	const { tasks, projectId } = useLoaderData<typeof loader>();

	return (
		<div className="p-8">
			<div className="max-w-6xl mx-auto space-y-8">
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold">Tasks</h1>
					<Link
						to={`/tasks/new?project=${projectId}`}
						className={cn(
							"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
							"h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
						)}
					>
						+ New Task
					</Link>
				</div>

				<TaskList tasks={tasks} projectId={projectId} />
			</div>
		</div>
	);
}
