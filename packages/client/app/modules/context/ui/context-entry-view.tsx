import { Form, Link } from "react-router";
import { cn } from "@/lib";
import { formatFileSize } from "../../../lib/formatters";
import type { ContextEntryWithProjects } from "../model/types";

interface ContextEntryViewProps {
	contextEntry: ContextEntryWithProjects;
}

export function ContextEntryView({ contextEntry }: ContextEntryViewProps) {
	return (
		<div className="p-8">
			<div className="max-w-6xl mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<Link
						to="/context"
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						← Back to Context
					</Link>
					<div className="flex gap-2">
						<Link
							to={`/context/${contextEntry.id}/edit`}
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
											"Are you sure you want to delete this context entry? This action cannot be undone."
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
						{new Date(contextEntry.created_at).toLocaleDateString()}
					</div>

					{contextEntry.title && (
						<h2 className="text-2xl font-bold">{contextEntry.title}</h2>
					)}

					<div className="whitespace-pre-wrap text-sm">
						{contextEntry.content}
					</div>

					{contextEntry.projects && contextEntry.projects.length > 0 && (
						<div className="space-y-2">
							<h3 className="text-sm font-medium">Associated Projects:</h3>
							<div className="flex flex-wrap gap-2">
								{contextEntry.projects.map(
									(project: { id: string; title: string }) => (
										<Link
											key={project.id}
											to={`/projects/${project.id}`}
											className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80"
										>
											{project.title}
										</Link>
									)
								)}
							</div>
						</div>
					)}

					{(!contextEntry.projects || contextEntry.projects.length === 0) && (
						<div className="space-y-2">
							<h3 className="text-sm font-medium">Availability:</h3>
							<span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
								Available to all projects
							</span>
						</div>
					)}

					{/* Attachment details */}
					{(contextEntry.file || contextEntry.website) && (
						<div className="space-y-2">
							<h3 className="text-sm font-medium">Attachment:</h3>
							<div className="p-3 border border-border rounded-lg bg-card">
								{contextEntry.file ? (
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<div>
												<div className="text-sm font-medium">
													File Attachment
												</div>
												<div className="text-xs text-muted-foreground">
													{contextEntry.file.mime_type} •{" "}
													{formatFileSize(contextEntry.file.file_size)}
												</div>
											</div>
										</div>
									</div>
								) : contextEntry.website ? (
									<div className="space-y-2">
										<div className="text-sm font-medium">Website Reference</div>
										<div className="text-xs text-muted-foreground">
											{contextEntry.website.page_title || "Untitled"}
										</div>
										<a
											href={contextEntry.website.address}
											target="_blank"
											rel="noopener noreferrer"
											className="text-sm text-primary hover:underline"
										>
											{contextEntry.website.address}
										</a>
									</div>
								) : null}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
