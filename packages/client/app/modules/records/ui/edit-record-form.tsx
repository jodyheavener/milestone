import { useState } from "react";
import { Form, Link, useNavigation } from "react-router";
import { cn } from "@/lib";
import type { Project } from "@/modules/projects/model/types";
import { formatFileSize } from "../../../lib/formatters";
import type { RecordWithProjects } from "../model/types";
import { ProjectSelector } from "./project-selector";

interface EditRecordFormProps {
	record: RecordWithProjects;
	projects: Project[];
	error?: string;
}

export function EditRecordForm({
	record,
	projects,
	error,
}: EditRecordFormProps) {
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";
	const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
		() => record.projects?.map((p: { id: string }) => p.id) || []
	);

	return (
		<div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
			<div className="w-full max-w-2xl p-8 space-y-6">
				<div>
					<h1 className="text-2xl font-bold">Edit Record</h1>
					<p className="mt-2 text-muted-foreground">
						Update your record details
					</p>
				</div>

				<Form method="post" className="space-y-4">
					{error && (
						<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
							{error}
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
							defaultValue={record.content}
							required
							rows={8}
							className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] resize-none"
						/>
					</div>

					<ProjectSelector
						projects={projects}
						selectedProjectIds={selectedProjectIds}
						onSelectionChange={setSelectedProjectIds}
					/>

					{/* Attachment context (read-only) */}
					{(record.file || record.website) && (
						<div className="space-y-3">
							<div>
								<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
									Attachment
								</label>
								<p className="text-xs text-muted-foreground mt-1">
									Attachments cannot be modified in edit mode
								</p>
							</div>
							<div className="p-3 border border-border rounded-lg bg-muted/50">
								{record.file ? (
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<div>
												<div className="text-sm font-medium">
													File Attachment
												</div>
												<div className="text-xs text-muted-foreground">
													{record.file.mime_type} •{" "}
													{formatFileSize(record.file.file_size)}
												</div>
											</div>
										</div>
									</div>
								) : record.website ? (
									<div className="space-y-2">
										<div className="text-sm font-medium">Website Reference</div>
										<div className="text-xs text-muted-foreground">
											{record.website.page_title || "Untitled"}
										</div>
										<a
											href={record.website.address}
											target="_blank"
											rel="noopener noreferrer"
											className="text-sm text-primary hover:underline"
										>
											{record.website.address}
										</a>
									</div>
								) : null}
							</div>
						</div>
					)}

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
							{isSubmitting ? "Saving..." : "Save Changes"}
						</button>
						<Link
							to={`/records/${record.id}`}
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
