import type { Project } from "@/modules/projects/model/types";

interface ProjectSelectorProps {
	projects: Project[];
	selectedProjectIds: string[];
	onSelectionChange: (projectIds: string[]) => void;
}

export function ProjectSelector({
	projects,
	selectedProjectIds,
	onSelectionChange,
}: ProjectSelectorProps) {
	const handleProjectToggle = (projectId: string) => {
		if (selectedProjectIds.includes(projectId)) {
			onSelectionChange(selectedProjectIds.filter((id) => id !== projectId));
		} else {
			onSelectionChange([...selectedProjectIds, projectId]);
		}
	};

	return (
		<div className="space-y-3">
			<div>
				<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
					Projects
				</label>
				<p className="text-xs text-muted-foreground mt-1">
					Select specific projects for this record, or leave empty to make it
					available to all projects.
				</p>
			</div>

			{projects.length === 0 ? (
				<div className="text-sm text-muted-foreground">
					No projects available. This record will be available to all projects.
				</div>
			) : (
				<div className="space-y-2">
					{projects.map((project) => (
						<label
							key={project.id}
							className="flex items-center space-x-2 cursor-pointer"
						>
							<input
								type="checkbox"
								checked={selectedProjectIds.includes(project.id)}
								onChange={() => handleProjectToggle(project.id)}
								className="rounded border-border"
							/>
							<span className="text-sm">{project.title}</span>
						</label>
					))}
				</div>
			)}

			{selectedProjectIds.length === 0 && projects.length > 0 && (
				<div className="text-xs text-muted-foreground bg-primary/10 p-2 rounded">
					This record will be available to all projects.
				</div>
			)}
		</div>
	);
}
