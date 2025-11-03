import { redirect, useSearchParams } from "react-router";
import { createPageTitle } from "@/lib";
import { AuthContext } from "@/lib/supabase";
import { getProjects } from "@/modules/projects/api/projects";
import { createRecord } from "../api/records";
import { NewRecordForm } from "../ui/new-record-form";
import type { Route } from "./+types/new";

export async function loader({ context }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const projects = await getProjects(supabase);
	return { projects };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { supabase, user } = context.get(AuthContext);

	if (!user) {
		return { error: "User not authenticated" };
	}

	const formData = await request.formData();
	const content = formData.get("content");
	const projectIds = formData.getAll("projectIds") as string[];
	const attachmentType = formData.get("attachmentType") as string;
	const attachmentFile = formData.get("attachmentFile") as File | null;
	const attachmentWebsiteUrl = formData.get("attachmentWebsiteUrl") as string;
	const websitePageTitle = formData.get("websitePageTitle") as string;
	const websiteExtractedContent = formData.get(
		"websiteExtractedContent"
	) as string;
	const parsedFileData = formData.get("parsedFileData") as string;
	const fileSize = formData.get("fileSize") as string;
	const fileName = formData.get("fileName") as string;
	const fileType = formData.get("fileType") as string;

	if (!content) {
		return {
			error: "Content is required",
		};
	}

	try {
		const attachmentData = attachmentType
			? {
					type: attachmentType as "file" | "website",
					file: attachmentFile || undefined,
					websiteUrl: attachmentWebsiteUrl || undefined,
					websiteData:
						attachmentType === "website"
							? {
									pageTitle: websitePageTitle,
									extractedContent: websiteExtractedContent,
								}
							: undefined,
					parsedData: parsedFileData ? JSON.parse(parsedFileData) : undefined,
					fileMetadata:
						attachmentType === "file"
							? {
									name: fileName,
									size: fileSize ? parseInt(fileSize) : 0,
									type: fileType,
								}
							: undefined,
				}
			: undefined;

		await createRecord(supabase, user, {
			content: content.toString().trim(),
			projectIds: projectIds.filter(Boolean),
			attachment: attachmentData,
		});

		throw redirect("/records");
	} catch (error) {
		// Re-throw redirects immediately without logging
		if (error instanceof Response) {
			throw error;
		}

		console.error("Error creating record:", error);

		// Log more details about the error for debugging
		if (error instanceof Error) {
			console.error("Error details:", {
				message: error.message,
				stack: error.stack,
				name: error.name,
			});
		}

		return {
			error: error instanceof Error ? error.message : "Failed to create record",
		};
	}
}

export function meta({}: Route.MetaArgs) {
	return [
		{
			title: createPageTitle("New Record"),
		},
	];
}

export default function Component({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { projects } = loaderData;
	const [searchParams] = useSearchParams();

	// Initialize with pre-selected project from URL params
	const projectParam = searchParams.get("project");
	const initialProjectIds =
		projectParam && projects.some((p: { id: string }) => p.id === projectParam)
			? [projectParam]
			: [];

	return (
		<NewRecordForm
			projects={projects}
			initialProjectIds={initialProjectIds}
			error={actionData?.error}
		/>
	);
}
