import { Form, Link, redirect } from "react-router";
import { createPageTitle } from "~/library/utilities";
import { AuthContext } from "~/library/supabase/auth";
import { getTask, deleteTask, toggleTaskCompletion } from "~/features/tasks";
import { getProject } from "~/features/projects";
import { cn } from "~/library/utilities";
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

	return (
		<div className="p-8">
			<div className="max-w-6xl mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<Link
						to={`/projects/${project.id}`}
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						← Back to {project.title}
					</Link>
					<div className="flex gap-2">
						<Link
							to={`/tasks/${task.id}/edit`}
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
											"Are you sure you want to delete this task? This action cannot be undone."
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
					<div className="flex items-center gap-3">
						<Form method="post" className="inline">
							<input type="hidden" name="intent" value="toggle" />
							<input
								type="hidden"
								name="completed"
								value={task.completed_at ? "false" : "true"}
							/>
							<button
								type="submit"
								className={cn(
									"w-6 h-6 rounded border-2 flex items-center justify-center transition-colors",
									task.completed_at
										? "bg-primary border-primary text-primary-foreground"
										: "border-muted-foreground hover:border-primary"
								)}
							>
								{task.completed_at && (
									<svg
										className="w-4 h-4"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clipRule="evenodd"
										/>
									</svg>
								)}
							</button>
						</Form>
						<h1
							className={cn(
								"text-3xl font-bold",
								task.completed_at && "line-through text-muted-foreground"
							)}
						>
							{task.description}
						</h1>
					</div>

					<div className="text-sm text-muted-foreground">
						Created {new Date(task.created_at).toLocaleDateString()}
						{task.completed_at && (
							<span className="ml-2">
								• Completed {new Date(task.completed_at).toLocaleDateString()}
							</span>
						)}
					</div>

					<div className="space-y-2">
						<h3 className="text-sm font-medium">Project:</h3>
						<Link
							to={`/projects/${project.id}`}
							className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80"
						>
							{project.title}
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
