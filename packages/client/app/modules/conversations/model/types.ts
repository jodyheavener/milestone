import type { Tables, TablesInsert, TablesUpdate } from "@milestone/shared";

export type Conversation = Tables<"conversation">;
export type ConversationInsert = TablesInsert<"conversation">;
export type ConversationUpdate = TablesUpdate<"conversation">;

export type ConversationEntry = Tables<"conversation_entry">;
export type ConversationEntryInsert = TablesInsert<"conversation_entry">;
export type ConversationEntryUpdate = TablesUpdate<"conversation_entry">;

export interface ConversationWithEntries extends Conversation {
	conversation_entry: ConversationEntry[];
}

export interface ChatResponse {
	response: string;
	remaining: number | null;
	requestId: string;
}
