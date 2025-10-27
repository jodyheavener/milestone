import { Link } from "react-router";
import { createPageTitle } from "~/library/utilities";
import { useLoaderData } from "react-router";
import { UserInfo, ProjectList, getProjects } from "~/features/projects";
import { AuthContext } from "~/library/supabase/auth";
import { cn } from "~/library/utilities";
import type { Route } from "./+types/list";

export async function loader({ context }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const projects = await getProjects(supabase);
	return { projects };
}

export function meta({}: Route.MetaArgs) {
	return [
		{
			title: createPageTitle("Projects"),
		},
	];
}

export default function Component({}: Route.ComponentProps) {
	const { projects } = useLoaderData<typeof loader>();

	return (
		<div className="flex flex-col min-h-dvh">
			<div className="flex-1 p-8">
				<div className="max-w-6xl mx-auto space-y-8">
					<div className="flex items-center justify-between">
						<h1 className="text-3xl font-bold">Projects</h1>
						<div className="flex items-center gap-4">
							<UserInfo />
							<Link
								to="/projects/new"
								className={cn(
									"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
									"h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
								)}
							>
								+ New Project
							</Link>
						</div>
					</div>

					<ProjectList projects={projects} />
				</div>
			</div>
		</div>
	);
}
