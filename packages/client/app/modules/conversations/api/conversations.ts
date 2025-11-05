import type { SupabaseClient } from "@/lib/supabase";
import type {
	ChatResponse,
	Conversation,
	ConversationUpdate,
	ConversationWithEntries,
} from "../model/types";

/**
 * Create a new conversation
 */
export async function createConversation(
	supabase: SupabaseClient,
	projectId: string
): Promise<Conversation> {
	const { data: conversation, error } = await supabase
		.from("conversation")
		.insert({
			project_id: projectId,
		})
		.select()
		.single();

	if (error) {
		throw error;
	}

	return conversation;
}

/**
 * Get all conversations for a project
 */
export async function getConversationsForProject(
	supabase: SupabaseClient,
	projectId: string
): Promise<Conversation[]> {
	const { data: conversations, error } = await supabase
		.from("conversation")
		.select("*")
		.eq("project_id", projectId)
		.order("updated_at", {
			ascending: false,
		});

	if (error) {
		throw error;
	}

	return conversations;
}

/**
 * Get a conversation by ID with its entries
 */
export async function getConversation(
	supabase: SupabaseClient,
	id: string
): Promise<ConversationWithEntries | null> {
	const { data: conversation, error } = await supabase
		.from("conversation")
		.select(
			`
			*,
			conversation_entry (
				*
			)
		`
		)
		.eq("id", id)
		.single();

	if (error) {
		// @todo - Move error type to constant
		if (error.code === "PGRST116") {
			// Not found
			return null;
		}
		throw error;
	}

	// Sort entries by created_at
	if (conversation.conversation_entry) {
		conversation.conversation_entry.sort(
			(a, b) =>
				new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
		);
	}

	return conversation as ConversationWithEntries;
}

/**
 * Update a conversation (e.g., title)
 */
export async function updateConversation(
	supabase: SupabaseClient,
	id: string,
	data: ConversationUpdate
): Promise<Conversation> {
	const { data: conversation, error } = await supabase
		.from("conversation")
		.update(data)
		.eq("id", id)
		.select()
		.single();

	if (error) {
		throw error;
	}

	return conversation;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(
	supabase: SupabaseClient,
	id: string
): Promise<void> {
	const { error } = await supabase.from("conversation").delete().eq("id", id);

	if (error) {
		throw error;
	}
}

/**
 * Send a message to the AI and get a response
 */
export async function sendMessage(
	supabase: SupabaseClient,
	conversationId: string,
	message: string
): Promise<ChatResponse> {
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		throw new Error("No active session");
	}

	const { data, error } = await supabase.functions.invoke<ChatResponse>(
		"conversation-chat",
		{
			body: {
				conversation_id: conversationId,
				message,
			},
			headers: {
				Authorization: `Bearer ${session.access_token}`,
			},
		}
	);

	if (error) {
		throw error;
	}

	if (!data) {
		throw new Error("No data returned from conversation chat");
	}

	return data;
}
