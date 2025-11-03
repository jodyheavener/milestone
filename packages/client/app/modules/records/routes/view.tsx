import { redirect } from "react-router";
import { createPageTitle } from "@/lib";
import { AuthContext } from "@/lib/supabase";
import { deleteRecord, getRecord } from "../api/records";
import { RecordView } from "../ui/record-view";
import type { Route } from "./+types/view";

export async function loader({ context, params }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const record = await getRecord(supabase, params.id);

	if (!record) {
		throw redirect("/records");
	}

	return { record };
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const { supabase } = context.get(AuthContext);
	const formData = await request.formData();
	const intent = formData.get("intent");

	if (intent === "delete") {
		await deleteRecord(supabase, params.id);
		throw redirect("/records");
	}
}

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{
			title: createPageTitle(`Record: ${loaderData.record.created_at}`),
		},
	];
}

export default function Component({ loaderData }: Route.ComponentProps) {
	const { record } = loaderData;

	return <RecordView record={record} />;
}
