import { Form, Link, useNavigation } from "react-router";
import { cn } from "@/lib";
import type { Project } from "@/modules/projects/model/types";

interface NewTaskFormProps {
	project: Project;
	error?: string;
}

export function NewTaskForm({ project, error }: NewTaskFormProps) {
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

	return (
		<div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
			<div className="w-full max-w-md p-8 space-y-6">
				<div className="text-center">
					<h1 className="text-2xl font-bold">New Task</h1>
					<p className="mt-2 text-muted-foreground">
						Add a new task to {project.title}
					</p>
				</div>

				<Form method="post" className="space-y-4">
					{error && (
						<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
							{error}
						</div>
					)}

					<input type="hidden" name="projectId" value={project.id} />

					<div className="space-y-2">
						<label
							htmlFor="description"
							className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Description
						</label>
						<textarea
							id="description"
							name="description"
							required
							rows={4}
							className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-none"
							placeholder="Enter task description..."
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
							{isSubmitting ? "Creating..." : "Create Task"}
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
