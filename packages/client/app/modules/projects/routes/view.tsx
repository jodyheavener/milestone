import { Form, Link, redirect } from "react-router";
import { createPageTitle } from "@/lib";
import { cn } from "@/lib";
import { AuthContext } from "@/lib/supabase";
import { getRecordsForProject } from "@/modules/records/api/records";
import { RecordListForProject } from "@/modules/records/ui/record-list-for-project";
import { getTasksForProject } from "@/modules/tasks/api/tasks";
import { TaskList } from "@/modules/tasks/ui/task-list";
import { deleteProject, getProject } from "../api/projects";
import type { Route } from "./+types/view";

export async function loader({ context, params }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const [project, records, tasks] = await Promise.all([
		getProject(supabase, params.id),
		getRecordsForProject(supabase, params.id),
		getTasksForProject(supabase, params.id),
	]);

	if (!project) {
		throw redirect("/projects");
	}

	return { project, records, tasks };
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const { supabase } = context.get(AuthContext);
	const formData = await request.formData();
	const intent = formData.get("intent");

	if (intent === "delete") {
		await deleteProject(supabase, params.id);
		throw redirect("/projects");
	}
}

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{
			title: createPageTitle(`Project: ${loaderData.project.title}`),
		},
	];
}

export default function Component({ loaderData }: Route.ComponentProps) {
	const { project, records, tasks } = loaderData;

	return (
		<div className="p-8">
			<div className="max-w-6xl mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<Link
						to="/projects"
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						← Back to Projects
					</Link>
					<div className="flex gap-2">
						<Link
							to={`/projects/${project.id}/edit`}
							className={cn(
								"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
								"h-9 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
							)}
						>
							Edit
						</Link>
						<Form method="post" className="inline">
							<input type="hidden" name="intent" value="delete" />
							<button
								type="submit"
								onClick={(e) => {
									if (
										!confirm(
											"Are you sure you want to delete this project? This action cannot be undone."
										)
									) {
										e.preventDefault();
									}
								}}
								className={cn(
									"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
									"h-9 px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
								)}
							>
								Delete
							</button>
						</Form>
					</div>
				</div>

				<div className="space-y-4">
					<h1 className="text-3xl font-bold">{project.title}</h1>
					<div className="text-muted-foreground whitespace-pre-wrap">
						{project.goal}
					</div>
				</div>

				<div className="space-y-6">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold">Tasks</h2>
						<Link
							to={`/tasks/new?project=${project.id}`}
							className={cn(
								"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
								"h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
							)}
						>
							+ New Task
						</Link>
					</div>

					<TaskList tasks={tasks} projectId={project.id} />
				</div>

				<div className="space-y-6">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold">Records</h2>
						<Link
							to={`/records/new?project=${project.id}`}
							className={cn(
								"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
								"h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
							)}
						>
							+ New Record
						</Link>
					</div>

					<RecordListForProject records={records} projectId={project.id} />
				</div>
			</div>
		</div>
	);
}
