import "@supabase/functions-js";
import { ServiceError } from "@milestone/shared";
import type OpenAI from "openai";
import { Hono, z } from "@/lib";
import { getServiceClient, getUserClient } from "@/lib";
import { getAuthHeader, getUserOrThrow } from "@/lib";
import { handleRequest, json, logger, withCORS } from "@/lib";
import { getOpenaiClient } from "@/lib";

const app = new Hono();

// Validation schemas
const ConversationRequestSchema = z.object({
	action: z.enum([
		"get-conversations",
		"create-conversation",
		"send-message",
		"update-conversation-title",
		"delete-conversation",
	]),
	projectId: z.string().uuid().optional(),
	conversationId: z.string().uuid().optional(),
	message: z.string().min(1).optional(),
	title: z.string().min(1).optional(),
});

// Preflight
app.options("*", () => new Response(null, { status: 204 }));

/**
 * Get project records with files and websites for context
 */
async function getProjectContext(
	sbServiceClient: ReturnType<typeof getServiceClient>,
	projectId: string,
): Promise<
	Array<{
		content: string;
		file?: { extracted_text: string | null };
		website?: { extracted_content: string | null };
	}>
> {
	// Get records linked to this project
	const { data: recordProjects, error: rpError } = await sbServiceClient
		.from("record_project")
		.select("record_id")
		.eq("project_id", projectId);

	if (rpError) {
		logger.error("Error fetching record projects", { error: rpError.message });
		return [];
	}

	if (!recordProjects || recordProjects.length === 0) {
		return [];
	}

	const recordIds = recordProjects.map((rp) => rp.record_id);

	// Get records with their files and websites
	const { data: records, error } = await sbServiceClient
		.from("record")
		.select(
			`
			id,
			content,
			file (
				extracted_text
			),
			website (
				extracted_content
			)
		`,
		)
		.in("id", recordIds);

	if (error) {
		logger.error("Error fetching project context", { error: error.message });
		return [];
	}

	return (records || []).map((record) => ({
		content: record.content,
		file: Array.isArray(record.file)
			? record.file[0]
			: record.file || undefined,
		website: Array.isArray(record.website)
			? record.website[0]
			: record.website || undefined,
	}));
}

/**
 * Build context string from project records
 */
function buildContextString(
	records: Array<{
		content: string;
		file?: { extracted_text: string | null };
		website?: { extracted_content: string | null };
	}>,
	projectGoal: string,
): string {
	let context = `Project Goal: ${projectGoal}\n\n`;
	context += "Available Context from Records:\n\n";

	records.forEach((record, index) => {
		context += `Record ${index + 1}:\n`;
		context += `Content: ${record.content}\n`;

		if (record.file?.extracted_text) {
			context += `File Content: ${
				record.file.extracted_text.substring(0, 2000)
			}\n`;
		}

		if (record.website?.extracted_content) {
			context += `Website Content: ${
				record.website.extracted_content.substring(0, 2000)
			}\n`;
		}

		context += "\n---\n\n";
	});

	return context;
}

/**
 * Generate conversation title from first message
 */
async function generateConversationTitle(
	firstMessage: string,
	projectGoal: string,
): Promise<string> {
	try {
		const client = getOpenaiClient();
		const response = await client.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content:
						"You are a helpful assistant that generates concise, descriptive titles for conversations. Generate a short title (maximum 50 characters) based on the user's first message and the project goal.",
				},
				{
					role: "user",
					content:
						`Project Goal: ${projectGoal}\n\nFirst Message: ${firstMessage}\n\nGenerate a concise title for this conversation.`,
				},
			],
			max_tokens: 50,
			temperature: 0.7,
		});

		const title = response.choices[0]?.message?.content?.trim() ||
			"New Conversation";
		return title.length > 50 ? title.substring(0, 50) : title;
	} catch (error) {
		logger.error("Error generating conversation title", { error });
		return "New Conversation";
	}
}

/**
 * Main conversation endpoint - routes to different actions
 */
app.post(
	"/",
	handleRequest(async (c, requestId) => {
		const sbUserClient = getUserClient(getAuthHeader(c.req.raw));
		const user = await getUserOrThrow(sbUserClient);
		const sbServiceClient = getServiceClient();

		const body = await c.req.json();
		const input = ConversationRequestSchema.parse(body);

		// Route based on action
		switch (input.action) {
			case "get-conversations": {
				if (!input.projectId) {
					throw new ServiceError("INVALID_REQUEST", {
						debugInfo: "projectId is required for get-conversations",
					});
				}

				logger.info("Get conversations", {
					userId: user.id,
					projectId: input.projectId,
				});

				// Verify project belongs to user
				const { data: project, error: projectError } = await sbUserClient
					.from("project")
					.select("id")
					.eq("id", input.projectId)
					.eq("user_id", user.id)
					.single();

				if (projectError || !project) {
					throw new ServiceError("NOT_FOUND", {
						debugInfo: "Project not found",
					});
				}

				// Get conversations
				const { data: conversations, error } = await sbUserClient
					.from("conversation")
					.select("*")
					.eq("project_id", input.projectId)
					.order("updated_at", { ascending: false });

				if (error) {
					throw new ServiceError("INTERNAL_ERROR", {
						debugInfo: `Failed to fetch conversations: ${error.message}`,
					});
				}

				return json({
					conversations: conversations || [],
					requestId,
				});
			}

			case "create-conversation": {
				if (!input.projectId) {
					throw new ServiceError("INVALID_REQUEST", {
						debugInfo: "projectId is required for create-conversation",
					});
				}

				logger.info("Create conversation", {
					userId: user.id,
					projectId: input.projectId,
				});

				// Verify project belongs to user
				const { data: project, error: projectError } = await sbUserClient
					.from("project")
					.select("id, goal")
					.eq("id", input.projectId)
					.eq("user_id", user.id)
					.single();

				if (projectError || !project) {
					throw new ServiceError("NOT_FOUND", {
						debugInfo: "Project not found",
					});
				}

				// Create conversation
				const { data: conversation, error } = await sbUserClient
					.from("conversation")
					.insert({
						project_id: input.projectId,
						title: null, // Will be set after first message
					})
					.select()
					.single();

				if (error) {
					throw new ServiceError("INTERNAL_ERROR", {
						debugInfo: `Failed to create conversation: ${error.message}`,
					});
				}

				return json({
					conversation,
					requestId,
				});
			}

			case "send-message": {
				if (!input.conversationId || !input.message) {
					throw new ServiceError("INVALID_REQUEST", {
						debugInfo:
							"conversationId and message are required for send-message",
					});
				}

				logger.info("Send message", {
					userId: user.id,
					conversationId: input.conversationId,
				});

				// Authorize operation (agentic_request)
				const { data: authData, error: authError } = await sbServiceClient.rpc(
					"authorize_operation",
					{
						p_user_id: user.id,
						p_op_type: "agentic_request",
					},
				);

				if (authError || !authData) {
					throw new ServiceError("INTERNAL_ERROR", {
						debugInfo: `Authorization failed: ${authError?.message}`,
					});
				}

				const authResult = authData as {
					allowed: boolean;
					reason?: string;
					remaining?: number;
				};

				if (!authResult.allowed) {
					throw new ServiceError("UNAUTHORIZED", {
						debugInfo: authResult.reason || "Operation not allowed",
					});
				}

				// Get conversation and verify ownership
				const { data: conversation, error: convError } = await sbUserClient
					.from("conversation")
					.select("*")
					.eq("id", input.conversationId)
					.single();

				if (convError || !conversation) {
					throw new ServiceError("NOT_FOUND", {
						debugInfo: "Conversation not found",
					});
				}

				// Get project and verify ownership
				const { data: project, error: projectError } = await sbUserClient
					.from("project")
					.select("id, goal, user_id")
					.eq("id", conversation.project_id)
					.single();

				if (projectError || !project || project.user_id !== user.id) {
					throw new ServiceError("UNAUTHORIZED", {
						debugInfo: "Access denied",
					});
				}

				// Get conversation history
				const { data: entries, error: entriesError } = await sbUserClient
					.from("conversation_entry")
					.select("*")
					.eq("conversation_id", input.conversationId)
					.order("created_at", { ascending: true });

				if (entriesError) {
					throw new ServiceError("INTERNAL_ERROR", {
						debugInfo:
							`Failed to fetch conversation history: ${entriesError.message}`,
					});
				}

				// Get project context (records with files and websites)
				const projectRecords = await getProjectContext(
					sbServiceClient,
					conversation.project_id,
				);
				const contextString = buildContextString(
					projectRecords,
					project.goal || "",
				);

				// Create user message entry
				const { data: userEntry, error: userEntryError } = await sbUserClient
					.from("conversation_entry")
					.insert({
						conversation_id: input.conversationId,
						role: "user",
						content: input.message,
					})
					.select()
					.single();

				if (userEntryError) {
					throw new ServiceError("INTERNAL_ERROR", {
						debugInfo: `Failed to create user entry: ${userEntryError.message}`,
					});
				}

				// Build messages for OpenAI
				const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
					{
						role: "system",
						content:
							`You are a helpful AI assistant helping the user work towards their project goal. Use the provided context from their records, files, and websites to provide informed, relevant responses.

Project Goal: ${project.goal || "Not specified"}

${contextString}

Guidelines:
- Focus on helping the user achieve their project goal
- Reference specific information from the provided context when relevant
- Be concise but thorough
- Ask clarifying questions when needed
- If the context doesn't contain relevant information, say so clearly`,
					},
				];

				// Add conversation history (excluding system messages)
				(entries || []).forEach((entry) => {
					if (entry.role === "user" || entry.role === "assistant") {
						messages.push({
							role: entry.role as "user" | "assistant",
							content: entry.content,
						});
					}
				});

				// Add current user message
				messages.push({
					role: "user",
					content: input.message,
				});

				// Generate AI response
				let assistantResponse = "";
				try {
					const client = getOpenaiClient();
					const response = await client.chat.completions.create({
						model: "gpt-4o-mini",
						messages,
						temperature: 0.7,
						max_tokens: 2000,
					});

					assistantResponse = response.choices[0]?.message?.content ||
						"I apologize, but I couldn't generate a response.";
				} catch (error) {
					logger.error("OpenAI API error", { error });
					assistantResponse =
						"I apologize, but I encountered an error while generating a response. Please try again.";
				}

				// Create assistant message entry
				const { data: assistantEntry, error: assistantEntryError } =
					await sbUserClient
						.from("conversation_entry")
						.insert({
							conversation_id: input.conversationId,
							role: "assistant",
							content: assistantResponse,
						})
						.select()
						.single();

				if (assistantEntryError) {
					throw new ServiceError("INTERNAL_ERROR", {
						debugInfo:
							`Failed to create assistant entry: ${assistantEntryError.message}`,
					});
				}

				// Update conversation title if this is the first message
				if (!conversation.title && entries && entries.length === 0) {
					const title = await generateConversationTitle(
						input.message,
						project.goal || "",
					);
					await sbUserClient
						.from("conversation")
						.update({ title })
						.eq("id", input.conversationId);
				}

				// Update conversation updated_at
				await sbUserClient
					.from("conversation")
					.update({ updated_at: new Date().toISOString() })
					.eq("id", input.conversationId);

				return json({
					userEntry,
					assistantEntry,
					requestId,
				});
			}

			case "update-conversation-title": {
				if (!input.conversationId) {
					throw new ServiceError("INVALID_REQUEST", {
						debugInfo:
							"conversationId is required for update-conversation-title",
					});
				}

				logger.info("Update conversation title", {
					userId: user.id,
					conversationId: input.conversationId,
				});

				// Get conversation and verify ownership
				const { data: conversation, error: convError } = await sbUserClient
					.from("conversation")
					.select("*")
					.eq("id", input.conversationId)
					.single();

				if (convError || !conversation) {
					throw new ServiceError("NOT_FOUND", {
						debugInfo: "Conversation not found",
					});
				}

				// Get project and verify ownership
				const { data: project, error: projectError } = await sbUserClient
					.from("project")
					.select("id, goal, user_id")
					.eq("id", conversation.project_id)
					.single();

				if (projectError || !project || project.user_id !== user.id) {
					throw new ServiceError("UNAUTHORIZED", {
						debugInfo: "Access denied",
					});
				}

				// Update title (or generate if not provided)
				let title = input.title;
				if (!title) {
					// Get first user message to generate title
					const { data: firstEntry } = await sbUserClient
						.from("conversation_entry")
						.select("content")
						.eq("conversation_id", input.conversationId)
						.eq("role", "user")
						.order("created_at", { ascending: true })
						.limit(1)
						.single();

					if (firstEntry) {
						title = await generateConversationTitle(
							firstEntry.content,
							project.goal || "",
						);
					} else {
						title = "New Conversation";
					}
				}

				const { data: updated, error } = await sbUserClient
					.from("conversation")
					.update({ title })
					.eq("id", input.conversationId)
					.select()
					.single();

				if (error) {
					throw new ServiceError("INTERNAL_ERROR", {
						debugInfo: `Failed to update conversation: ${error.message}`,
					});
				}

				return json({
					conversation: updated,
					requestId,
				});
			}

			case "delete-conversation": {
				if (!input.conversationId) {
					throw new ServiceError("INVALID_REQUEST", {
						debugInfo: "conversationId is required for delete-conversation",
					});
				}

				logger.info("Delete conversation", {
					userId: user.id,
					conversationId: input.conversationId,
				});

				// Get conversation and verify ownership
				const { data: conversation, error: convError } = await sbUserClient
					.from("conversation")
					.select("*")
					.eq("id", input.conversationId)
					.single();

				if (convError || !conversation) {
					throw new ServiceError("NOT_FOUND", {
						debugInfo: "Conversation not found",
					});
				}

				// Get project and verify ownership
				const { data: project, error: projectError } = await sbUserClient
					.from("project")
					.select("id, user_id")
					.eq("id", conversation.project_id)
					.single();

				if (projectError || !project || project.user_id !== user.id) {
					throw new ServiceError("UNAUTHORIZED", {
						debugInfo: "Access denied",
					});
				}

				// Delete conversation (cascade will delete entries)
				const { error } = await sbUserClient
					.from("conversation")
					.delete()
					.eq("id", input.conversationId);

				if (error) {
					throw new ServiceError("INTERNAL_ERROR", {
						debugInfo: `Failed to delete conversation: ${error.message}`,
					});
				}

				return json({
					success: true,
					requestId,
				});
			}

			default:
				throw new ServiceError("INVALID_REQUEST", {
					debugInfo: `Unknown action: ${input.action}`,
				});
		}
	}),
);

export default {
	fetch: async (req: Request) => {
		const res = await app.fetch(req);
		return withCORS()(req, res);
	},
};
