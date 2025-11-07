import { redirect } from "react-router";
import { createPageTitle } from "@/lib";
import { AuthContext } from "@/lib/supabase";
import { getProjects } from "@/modules/projects/api/projects";
import { getContextEntry, updateContextEntry } from "../api/context";
import { EditContextEntryForm } from "../ui/edit-context-entry-form";
import type { Route } from "./+types/edit";

export async function loader({ context, params }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const [contextEntry, projects] = await Promise.all([
		getContextEntry(supabase, params.id),
		getProjects(supabase),
	]);

	if (!contextEntry) {
		throw redirect("/context");
	}

	return { contextEntry, projects };
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const { supabase } = context.get(AuthContext);
	const formData = await request.formData();
	const title = formData.get("title") as string;
	const content = formData.get("content");
	const projectIds = formData.getAll("projectIds") as string[];

	if (!content) {
		return {
			error: "Content is required",
		};
	}

	try {
		await updateContextEntry(supabase, params.id, {
			title: title?.trim() || undefined,
			content: content.toString().trim(),
			projectIds: projectIds.filter(Boolean),
		});

		throw redirect(`/context/${params.id}`);
	} catch (error) {
		if (error instanceof Response) {
			throw error;
		}

		return {
			error:
				error instanceof Error
					? error.message
					: "Failed to update context entry",
		};
	}
}

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{
			title: createPageTitle(
				`Edit Context Entry: ${loaderData.contextEntry.created_at}`
			),
		},
	];
}

export default function Component({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { contextEntry, projects } = loaderData;

	return (
		<EditContextEntryForm
			contextEntry={contextEntry}
			projects={projects}
			error={actionData?.error}
		/>
	);
}
