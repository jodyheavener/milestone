import { redirect } from "react-router";
import { AuthContext } from "@/lib/supabase";
import { createConversation } from "../api/conversations";
import type { Route } from "./+types/new";

export async function loader({ params, context }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const { projectId } = params;

	if (!projectId) {
		throw redirect("/projects");
	}

	// Create a new conversation
	const conversation = await createConversation(supabase, projectId);

	// Redirect to the conversation view
	throw redirect(`/projects/${projectId}/conversations/${conversation.id}`);
}

export default function Component() {
	// This component should not render as we always redirect
	return null;
}
