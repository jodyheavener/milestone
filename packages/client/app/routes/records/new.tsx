import { useState } from "react";
import { Link, redirect, Form, useNavigation } from "react-router";
import { createPageTitle } from "~/library/utilities";
import { AuthContext } from "~/library/supabase/auth";
import { createRecord } from "~/features/records";
import { getProjects } from "~/features/projects";
import { ProjectSelector } from "~/features/records";
import { cn } from "~/library/utilities";
import type { Route } from "./+types/new";

export async function loader({ context }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const projects = await getProjects(supabase);
	return { projects };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { supabase, user } = context.get(AuthContext);

	if (!user) {
		return { error: "User not authenticated" };
	}

	const formData = await request.formData();
	const content = formData.get("content");
	const projectIds = formData.getAll("projectIds") as string[];

	if (!content) {
		return {
			error: "Content is required",
		};
	}

	try {
		await createRecord(supabase, user, {
			content: content.toString().trim(),
			projectIds: projectIds.filter(Boolean),
		});

		throw redirect("/records");
	} catch (error) {
		if (error instanceof Response) {
			throw error;
		}

		return {
			error: error instanceof Error ? error.message : "Failed to create record",
		};
	}
}

export function meta({}: Route.MetaArgs) {
	return [
		{
			title: createPageTitle("New Record"),
		},
	];
}

export default function Component({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { projects } = loaderData;
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";
	const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

	return (
		<div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
			<div className="w-full max-w-2xl p-8 space-y-6">
				<div className="text-center">
					<h1 className="text-2xl font-bold">New Record</h1>
					<p className="mt-2 text-muted-foreground">
						Create a new record to track your milestones
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
							htmlFor="content"
							className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Content
						</label>
						<textarea
							id="content"
							name="content"
							required
							rows={8}
							className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] resize-none"
							placeholder="Enter your record content here..."
						/>
					</div>

					<ProjectSelector
						projects={projects}
						selectedProjectIds={selectedProjectIds}
						onSelectionChange={setSelectedProjectIds}
					/>

					{/* Hidden inputs for selected project IDs */}
					{selectedProjectIds.map((projectId) => (
						<input
							key={projectId}
							type="hidden"
							name="projectIds"
							value={projectId}
						/>
					))}

					<div className="flex gap-4">
						<button
							type="submit"
							disabled={isSubmitting}
							className={cn(
								"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
								"h-10 px-4 py-2 flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
							)}
						>
							{isSubmitting ? "Creating..." : "Create Record"}
						</button>
						<Link
							to="/records"
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
