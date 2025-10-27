import { useState } from "react";
import { Form, Link, redirect } from "react-router";
import { createPageTitle } from "~/library/utilities";
import { AuthContext } from "~/library/supabase/auth";
import { getProject, updateProject, deleteProject } from "~/features/projects";
import { cn } from "~/library/utilities";
import type { Route } from "./+types/view";

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
	const intent = formData.get("intent");

	if (intent === "delete") {
		await deleteProject(supabase, params.id);
		throw redirect("/projects");
	}

	if (intent === "update") {
		const title = formData.get("title");
		const goal = formData.get("goal");

		if (!title || !goal) {
			return {
				error: "Title and goal are required",
			};
		}

		const updatedProject = await updateProject(supabase, params.id, {
			title: title.toString().trim(),
			goal: goal.toString().trim(),
		});

		return { success: true, project: updatedProject };
	}

	return {};
}

export function meta({ data }: Route.MetaArgs) {
	return [
		{
			title: createPageTitle(data.project.title),
		},
	];
}

export default function Component({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { project } = loaderData;
	const [isEditing, setIsEditing] = useState(false);

	const handleEdit = () => setIsEditing(true);
	const handleCancel = () => setIsEditing(false);

	if (isEditing) {
		return (
			<div className="flex items-center justify-center min-h-dvh">
				<div className="w-full max-w-2xl p-8 space-y-6">
					<div>
						<h1 className="text-2xl font-bold">Edit Project</h1>
						<p className="mt-2 text-muted-foreground">
							Update your project details
						</p>
					</div>

					<Form method="post" className="space-y-4">
						<input type="hidden" name="intent" value="update" />
						{actionData?.error && (
							<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
								{actionData.error}
							</div>
						)}

						<div className="space-y-2">
							<label
								htmlFor="title"
								className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								Title
							</label>
							<input
								id="title"
								name="title"
								type="text"
								defaultValue={project.title}
								required
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							/>
						</div>

						<div className="space-y-2">
							<label
								htmlFor="goal"
								className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								Goal
							</label>
							<textarea
								id="goal"
								name="goal"
								defaultValue={project.goal}
								required
								rows={8}
								className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] resize-none"
							/>
						</div>

						<div className="flex gap-4">
							<button
								type="submit"
								className={cn(
									"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
									"h-10 px-4 py-2 flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
								)}
							>
								Save Changes
							</button>
							<button
								type="button"
								onClick={handleCancel}
								className={cn(
									"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
									"h-10 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
								)}
							>
								Cancel
							</button>
						</div>
					</Form>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col min-h-dvh">
			<div className="flex items-center justify-center flex-1">
				<div className="w-full max-w-4xl p-8 space-y-6">
					<div className="flex items-center justify-between">
						<Link
							to="/projects"
							className="text-sm text-muted-foreground hover:text-foreground"
						>
							← Back to Projects
						</Link>
						<div className="flex gap-2">
							<button
								onClick={handleEdit}
								className={cn(
									"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
									"h-9 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
								)}
							>
								Edit
							</button>
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
				</div>
			</div>
		</div>
	);
}
