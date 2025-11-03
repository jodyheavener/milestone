import { redirect } from "react-router";
import { createPageTitle } from "@/lib";
import { AuthContext } from "@/lib/supabase";
import { getProjects } from "@/modules/projects/api/projects";
import { getRecord, updateRecord } from "../api/records";
import { EditRecordForm } from "../ui/edit-record-form";
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

	return (
		<EditRecordForm
			record={record}
			projects={projects}
			error={actionData?.error}
		/>
	);
}
