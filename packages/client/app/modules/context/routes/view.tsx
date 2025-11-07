import { redirect } from "react-router";
import { createPageTitle } from "@/lib";
import { AuthContext } from "@/lib/supabase";
import { deleteContextEntry, getContextEntry } from "../api/context";
import { ContextEntryView } from "../ui/context-entry-view";
import type { Route } from "./+types/view";

export async function loader({ context, params }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const contextEntry = await getContextEntry(supabase, params.id);

	if (!contextEntry) {
		throw redirect("/context");
	}

	return { contextEntry };
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const { supabase } = context.get(AuthContext);
	const formData = await request.formData();
	const intent = formData.get("intent");

	if (intent === "delete") {
		await deleteContextEntry(supabase, params.id);
		throw redirect("/context");
	}
}

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{
			title: createPageTitle(
				`Context Entry: ${loaderData.contextEntry.created_at}`
			),
		},
	];
}

export default function Component({ loaderData }: Route.ComponentProps) {
	const { contextEntry } = loaderData;

	return <ContextEntryView contextEntry={contextEntry} />;
}
