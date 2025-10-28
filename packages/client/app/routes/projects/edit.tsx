import { Link, redirect, Form, useNavigation } from "react-router";
import { createPageTitle } from "~/library/utilities";
import { AuthContext } from "~/library/supabase/auth";
import { getProject, updateProject } from "~/features/projects";
import { cn } from "~/library/utilities";
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

export function meta({ data }: Route.MetaArgs) {
	return [
		{
			title: createPageTitle("Edit Project"),
		},
	];
}

export default function Component({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { project } = loaderData;
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

	return (
		<div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
			<div className="w-full max-w-2xl p-8 space-y-6">
				<div>
					<h1 className="text-2xl font-bold">Edit Project</h1>
					<p className="mt-2 text-muted-foreground">
						Update your project details
					</p>
				</div>

				<Form method="post" className="space-y-4">
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
							disabled={isSubmitting}
							className={cn(
								"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
								"h-10 px-4 py-2 flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
							)}
						>
							{isSubmitting ? "Saving..." : "Save Changes"}
						</button>
						<Link
							to={`/projects/${project.id}`}
							className={cn(
								"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
								"h-10 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
							)}
						>
							Cancel
						</Link>
					</div>
				</Form>
			</div>
		</div>
	);
}
