import { Form, Link, useNavigation } from "react-router";
import { cn } from "@/lib";

interface NewProjectFormProps {
	canCreate: boolean;
	reason?: string;
	entitlements?: {
		projects_limit: number;
	} | null;
	error?: string;
}

export function NewProjectForm({
	canCreate,
	reason,
	entitlements,
	error,
}: NewProjectFormProps) {
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";
	const showUpsell = !canCreate;

	return (
		<div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
			<div className="w-full max-w-md p-8 space-y-6">
				<div className="text-center">
					<h1 className="text-2xl font-bold">New Project</h1>
					<p className="mt-2 text-muted-foreground">
						Create a new project to track your milestones
					</p>
				</div>

				{showUpsell && (
					<div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
						<p className="text-yellow-700 text-sm mb-3">
							{reason || "You've reached your project limit."}
						</p>
						{entitlements && entitlements.projects_limit > 0 && (
							<p className="text-sm text-muted-foreground mb-3">
								Current: {entitlements.projects_limit} project
								{entitlements.projects_limit !== 1 ? "s" : ""}
							</p>
						)}
						<Link
							to="/pricing"
							className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-semibold"
						>
							Upgrade Plan
						</Link>
					</div>
				)}

				<Form method="post" className="space-y-4">
					{error && (
						<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
							{error}
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
							required
							rows={4}
							className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-none"
						/>
					</div>

					<div className="flex gap-4">
						<button
							type="submit"
							disabled={isSubmitting || !canCreate}
							className={cn(
								"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
								"h-10 px-4 py-2 flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
							)}
						>
							{isSubmitting ? "Creating..." : "Create Project"}
						</button>
						<Link
							to="/projects"
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
