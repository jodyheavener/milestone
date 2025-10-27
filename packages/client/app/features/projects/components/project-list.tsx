import { Link } from "react-router";
import type { Project } from "~/features/projects";
import { cn } from "~/library/utilities";

interface ProjectListProps {
	projects: Project[];
}

export function ProjectList({ projects }: ProjectListProps) {
	if (projects.length === 0) {
		return (
			<div className="text-center py-12">
				<p className="text-muted-foreground">
					No projects yet. Create your first project to get started!
				</p>
			</div>
		);
	}

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{projects.map((project) => (
				<Link
					key={project.id}
					to={`/projects/${project.id}`}
					className={cn(
						"flex flex-col gap-2 p-6 rounded-lg border border-border bg-card hover:bg-accent transition-colors",
						"min-h-[120px]"
					)}
				>
					<h3 className="font-semibold text-lg leading-none">
						{project.title}
					</h3>
					<p className="text-sm text-muted-foreground line-clamp-2">
						{project.goal}
					</p>
				</Link>
			))}
		</div>
	);
}
