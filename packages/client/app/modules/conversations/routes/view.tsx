import { Form, Link, redirect } from "react-router";
import { createPageTitle } from "@/lib";
import { cn } from "@/lib";
import { AuthContext } from "@/lib/supabase";
import { getProject } from "@/modules/projects/api/projects";
import {
	deleteConversation,
	getConversation,
	sendMessage,
	updateConversation,
} from "../api/conversations";
import { ChatInterface } from "../ui/chat-interface";
import { ConversationTitleEditor } from "../ui/conversation-title-editor";
import type { Route } from "./+types/view";

export async function loader({ params, context }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const [project, conversation] = await Promise.all([
		getProject(supabase, params.projectId),
		getConversation(supabase, params.conversationId),
	]);

	if (!project) {
		throw redirect("/projects");
	}

	if (!conversation) {
		throw redirect(`/projects/${params.projectId}`);
	}

	return { project, conversation };
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const { supabase } = context.get(AuthContext);
	const formData = await request.formData();
	const intent = formData.get("intent");

	if (intent === "delete") {
		await deleteConversation(supabase, params.conversationId);
		throw redirect(`/projects/${params.projectId}`);
	}

	if (intent === "update_title") {
		const title = formData.get("title")?.toString() || null;
		await updateConversation(supabase, params.conversationId, { title });
		return { success: true };
	}

	if (intent === "send_message") {
		const message = formData.get("message")?.toString();
		const conversationId = formData.get("conversation_id")?.toString();

		if (!message || !conversationId) {
			return { error: "Message is required" };
		}

		try {
			await sendMessage(supabase, conversationId, message);
			// Reload to get updated conversation with new entries
			return redirect(
				`/projects/${params.projectId}/conversations/${params.conversationId}`
			);
		} catch (error) {
			return {
				error:
					error instanceof Error
						? error.message
						: "Failed to send message. Please try again.",
			};
		}
	}

	return null;
}

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{
			title: createPageTitle(
				`Conversation: ${loaderData.conversation.title || "New Conversation"}`
			),
		},
	];
}

export default function Component({ loaderData }: Route.ComponentProps) {
	const { project, conversation } = loaderData;

	return (
		<div className="flex flex-col h-screen">
			<div className="border-b border-border p-4">
				<div className="max-w-4xl mx-auto flex items-center gap-4">
					<Link
						to={`/projects/${project.id}`}
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						← Back to Project
					</Link>
					<div className="flex-1">
						<ConversationTitleEditor
							conversationId={conversation.id}
							title={conversation.title}
						/>
					</div>
					<Form method="post" className="inline">
						<input type="hidden" name="intent" value="delete" />
						<button
							type="submit"
							onClick={(e) => {
								if (
									!confirm(
										"Are you sure you want to delete this conversation? This action cannot be undone."
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

			<div className="flex-1 overflow-hidden">
				<div className="h-full max-w-4xl mx-auto">
					<ChatInterface
						conversationId={conversation.id}
						entries={conversation.conversation_entry || []}
					/>
				</div>
			</div>
		</div>
	);
}
