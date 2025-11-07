import { Link } from "react-router";
import { cn } from "@/lib";
import type { ContextEntryWithProjects } from "../model/types";

interface ContextEntryListProps {
	contextEntries: ContextEntryWithProjects[];
}

export function ContextEntryList({ contextEntries }: ContextEntryListProps) {
	if (contextEntries.length === 0) {
		return (
			<div className="text-center py-12">
				<p className="text-muted-foreground">
					No context entries yet. Create your first context entry to get
					started!
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{contextEntries.map((contextEntry) => (
				<Link
					key={contextEntry.id}
					to={`/context/${contextEntry.id}`}
					className={cn(
						"block p-6 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
					)}
				>
					<div className="space-y-2">
						<div className="text-sm text-muted-foreground">
							{new Date(contextEntry.created_at).toLocaleDateString()}
						</div>
						{contextEntry.title && (
							<div className="text-base font-medium">{contextEntry.title}</div>
						)}
						<div className="text-sm text-muted-foreground line-clamp-3">
							{contextEntry.content}
						</div>
						{contextEntry.projects && contextEntry.projects.length > 0 && (
							<div className="flex flex-wrap gap-1">
								{contextEntry.projects.map(
									(project: { id: string; title: string }) => (
										<span
											key={project.id}
											className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground"
										>
											{project.title}
										</span>
									)
								)}
							</div>
						)}
						{(!contextEntry.projects || contextEntry.projects.length === 0) && (
							<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
								All Projects
							</span>
						)}

						{/* Attachment indicator */}
						{(contextEntry.file || contextEntry.website) && (
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<span className="inline-flex items-center px-2 py-1 rounded-full bg-accent text-accent-foreground">
									{contextEntry.file ? "📎 File" : "🌐 Website"}
								</span>
							</div>
						)}
					</div>
				</Link>
			))}
		</div>
	);
}
