import { Form, Link, redirect } from "react-router";
import { createPageTitle } from "~/library/utilities";
import { AuthContext } from "~/library/supabase/auth";
import { getRecord, deleteRecord } from "~/features/records";
import { cn } from "~/library/utilities";
import type { Route } from "./+types/view";

export async function loader({ context, params }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const record = await getRecord(supabase, params.id);

	if (!record) {
		throw redirect("/records");
	}

	return { record };
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const { supabase } = context.get(AuthContext);
	const formData = await request.formData();
	const intent = formData.get("intent");

	if (intent === "delete") {
		await deleteRecord(supabase, params.id);
		throw redirect("/records");
	}
}

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{
			title: createPageTitle(`Record: ${loaderData.record.created_at}`),
		},
	];
}

export default function Component({ loaderData }: Route.ComponentProps) {
	const { record } = loaderData;

	return (
		<div className="p-8">
			<div className="max-w-6xl mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<Link
						to="/records"
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						← Back to Records
					</Link>
					<div className="flex gap-2">
						<Link
							to={`/records/${record.id}/edit`}
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
											"Are you sure you want to delete this record? This action cannot be undone."
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
					<div className="text-sm text-muted-foreground">
						{new Date(record.created_at).toLocaleDateString()}
					</div>

					<div className="whitespace-pre-wrap text-sm">{record.content}</div>

					{record.projects && record.projects.length > 0 && (
						<div className="space-y-2">
							<h3 className="text-sm font-medium">Associated Projects:</h3>
							<div className="flex flex-wrap gap-2">
								{record.projects.map((project) => (
									<Link
										key={project.id}
										to={`/projects/${project.id}`}
										className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80"
									>
										{project.title}
									</Link>
								))}
							</div>
						</div>
					)}

					{(!record.projects || record.projects.length === 0) && (
						<div className="space-y-2">
							<h3 className="text-sm font-medium">Availability:</h3>
							<span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
								Available to all projects
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
