import { Link } from "react-router";
import type { RecordWithProjects } from "~/features/records";
import { cn } from "~/library/utilities";

interface RecordListProps {
	records: RecordWithProjects[];
}

export function RecordList({ records }: RecordListProps) {
	if (records.length === 0) {
		return (
			<div className="text-center py-12">
				<p className="text-muted-foreground">
					No records yet. Create your first record to get started!
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{records.map((record) => (
				<Link
					key={record.id}
					to={`/records/${record.id}`}
					className={cn(
						"block p-6 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
					)}
				>
					<div className="space-y-2">
						<div className="text-sm text-muted-foreground">
							{new Date(record.created_at).toLocaleDateString()}
						</div>
						<div className="text-sm text-muted-foreground line-clamp-3">
							{record.content}
						</div>
						{record.projects && record.projects.length > 0 && (
							<div className="flex flex-wrap gap-1">
								{record.projects.map((project) => (
									<span
										key={project.id}
										className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground"
									>
										{project.title}
									</span>
								))}
							</div>
						)}
						{(!record.projects || record.projects.length === 0) && (
							<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
								All Projects
							</span>
						)}
					</div>
				</Link>
			))}
		</div>
	);
}
