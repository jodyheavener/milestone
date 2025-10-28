import { useState } from "react";
import { Link, redirect, Form, useNavigation } from "react-router";
import { createPageTitle } from "~/library/utilities";
import { AuthContext } from "~/library/supabase/auth";
import { getRecord, updateRecord } from "~/features/records";
import { getProjects } from "~/features/projects";
import { ProjectSelector } from "~/features/records";
import { cn } from "~/library/utilities";
import type { Route } from "./+types/edit";

export async function loader({ context, params }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const [record, projects] = await Promise.all([
		getRecord(supabase, params.id),
		getProjects(supabase),
	]);

	if (!record) {
		throw redirect("/records");
	}

	return { record, projects };
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const { supabase } = context.get(AuthContext);
	const formData = await request.formData();
	const content = formData.get("content");
	const projectIds = formData.getAll("projectIds") as string[];

	if (!content) {
		return {
			error: "Content is required",
		};
	}

	try {
		await updateRecord(supabase, params.id, {
			content: content.toString().trim(),
			projectIds: projectIds.filter(Boolean),
		});

		throw redirect(`/records/${params.id}`);
	} catch (error) {
		if (error instanceof Response) {
			throw error;
		}

		return {
			error: error instanceof Error ? error.message : "Failed to update record",
		};
	}
}

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{
			title: createPageTitle(`Edit Record: ${loaderData.record.created_at}`),
		},
	];
}

export default function Component({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { record, projects } = loaderData;
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";
	const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
		() => record.projects?.map((p: { id: string }) => p.id) || []
	);

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

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
					{actionData?.error && (
						<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
							{actionData.error}
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
													{record.file.file_kind} •{" "}
													{formatFileSize(record.file.file_size)}
												</div>
											</div>
											<a
												href={`/api/files/${record.file.id}/download`}
												download
												className={cn(
													"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
													"h-8 px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90"
												)}
											>
												Download
											</a>
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
