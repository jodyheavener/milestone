import "@supabase/functions-js";
import { ServiceError } from "@milestone/shared";
import { Hono, z } from "@/lib";
import { getServiceClient, getUserClient } from "@/lib";
import { getAuthHeader, getUserOrThrow } from "@/lib";
import { handleRequest, json, logger, withCORS } from "@/lib";
import { getOpenaiClient } from "@/lib";
import { getProjectContext } from "./context-retrieval.ts";
import { generateConversationTitle } from "./title-generator.ts";

const app = new Hono();

// Validation schema
const ChatRequestSchema = z.object({
	conversationId: z.string().uuid().optional(),
	projectId: z.string().uuid(),
	message: z.string().min(1),
});

// Preflight
app.options("*", () => new Response(null, { status: 204 }));

/**
 * Chat endpoint for AI-powered conversations in projects
 * - Authorizes operation (gated by subscription)
 * - Retrieves relevant context from project context entries
 * - Generates AI response using OpenAI
 * - Stores conversation entries
 * - Generates title for new conversations
 */
app.post(
	"/chat",
	handleRequest(async (c, requestId) => {
		// Auth as user
		const sbUserClient = getUserClient(getAuthHeader(c.req.raw));
		const user = await getUserOrThrow(sbUserClient);

		// Validate input
		const body = await c.req.json();
		const input = ChatRequestSchema.parse(body);

		logger.info("Chat request", {
			userId: user.id,
			projectId: input.projectId,
			conversationId: input.conversationId,
		});

		// Authorize operation using service client (bypasses RLS)
		const sbServiceClient = getServiceClient();
		const { data: authData, error: authError } = await sbServiceClient.rpc(
			"authorize_operation",
			{
				p_user_id: user.id,
				p_op_type: "agentic_request",
			},
		);

		if (authError) {
			logger.error("Authorization error", {
				userId: user.id,
				error: authError.message,
			});
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: `Authorization error: ${authError.message}`,
			});
		}

		const authResult = authData as {
			allowed: boolean;
			reason?: string;
			remaining?: number;
		};

		if (!authResult.allowed) {
			logger.warn("Operation not allowed", {
				userId: user.id,
				reason: authResult.reason,
				remaining: authResult.remaining,
			});
			throw new ServiceError("RATE_LIMIT_EXCEEDED", {
				debugInfo: authResult.reason || "Agentic request limit exceeded",
			});
		}

		// Get project details
		const { data: project, error: projectError } = await sbUserClient
			.from("project")
			.select("id, title, goal")
			.eq("id", input.projectId)
			.single();

		if (projectError || !project) {
			logger.error("Project not found", {
				userId: user.id,
				projectId: input.projectId,
				error: projectError?.message,
			});
			throw new ServiceError("NOT_FOUND", {
				debugInfo: "Project not found",
			});
		}

		// Get or create conversation
		let conversationId = input.conversationId;
		let conversationTitle: string | null = null;

		if (!conversationId) {
			// Create new conversation - title will be generated after first message
			const { data: newConversation, error: convError } = await sbUserClient
				.from("conversation")
				.insert({
					project_id: input.projectId,
					title: null, // Will be set after first response
				})
				.select()
				.single();

			if (convError || !newConversation) {
				logger.error("Failed to create conversation", {
					userId: user.id,
					projectId: input.projectId,
					error: convError?.message,
				});
				throw new ServiceError("INTERNAL_ERROR", {
					debugInfo: "Failed to create conversation",
				});
			}

			conversationId = newConversation.id;
		} else {
			// Verify conversation belongs to project
			const { data: existingConv, error: convCheckError } = await sbUserClient
				.from("conversation")
				.select("id, title")
				.eq("id", conversationId)
				.eq("project_id", input.projectId)
				.single();

			if (convCheckError || !existingConv) {
				logger.error("Conversation not found", {
					userId: user.id,
					conversationId,
					projectId: input.projectId,
					error: convCheckError?.message,
				});
				throw new ServiceError("NOT_FOUND", {
					debugInfo: "Conversation not found",
				});
			}

			conversationTitle = existingConv.title;
		}

		// Get conversation history
		const { data: historyEntries, error: historyError } = await sbUserClient
			.from("conversation_entry")
			.select("role, content")
			.eq("conversation_id", conversationId)
			.order("created_at", { ascending: true });

		if (historyError) {
			logger.error("Failed to get conversation history", {
				error: historyError.message,
			});
		}

		// Get relevant context from project context entries
		const context = await getProjectContext(
			sbUserClient,
			input.projectId,
			input.message,
			historyEntries || [],
		);

		// Build messages for OpenAI
		const messages: Array<{
			role: "system" | "user" | "assistant";
			content: string;
		}> = [];

		// System prompt with project goal
		const systemPrompt =
			`You are a helpful AI assistant helping the user work towards their project goal.

Project Goal: ${project.goal}

Your role is to:
1. Guide the conversation towards achieving this project goal
2. Use the provided context from the user's context entries to inform your responses
3. Be concise, helpful, and focused on actionable insights
4. Ask clarifying questions when needed to better understand the user's needs

Context from the user's context entries will be provided to help you give informed responses.`;

		messages.push({
			role: "system",
			content: systemPrompt,
		});

		// Add context if available
		if (context.length > 0) {
			const contextText = context
				.map((c, idx) => `[Context ${idx + 1}]\n${c.text}`)
				.join("\n\n");
			messages.push({
				role: "user",
				content:
					`Here is relevant context from my context entries:\n\n${contextText}\n\n---\n\nNow, ${input.message}`,
			});
		} else {
			messages.push({
				role: "user",
				content: input.message,
			});
		}

		// Add conversation history (skip system messages)
		const historyMessages = historyEntries?.filter((e) =>
			e.role !== "system"
		) || [];
		for (const entry of historyMessages) {
			messages.push({
				role: entry.role as "user" | "assistant",
				content: entry.content,
			});
		}

		// Call OpenAI
		const openai = getOpenaiClient();
		let assistantResponse: string;

		try {
			const response = await openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages,
				temperature: 0.7,
				max_tokens: 2000,
			});

			assistantResponse = response.choices[0]?.message?.content ||
				"I apologize, but I couldn't generate a response. Please try again.";

			if (!assistantResponse) {
				throw new Error("Empty response from OpenAI");
			}
		} catch (error) {
			logger.error("OpenAI API error", { error });
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: "Failed to generate AI response",
			});
		}

		// Store user message
		const { error: userEntryError } = await sbUserClient
			.from("conversation_entry")
			.insert({
				conversation_id: conversationId,
				role: "user",
				content: input.message,
			});

		if (userEntryError) {
			logger.error("Failed to store user message", {
				error: userEntryError.message,
			});
		}

		// Store assistant response
		const { error: assistantEntryError } = await sbUserClient
			.from("conversation_entry")
			.insert({
				conversation_id: conversationId,
				role: "assistant",
				content: assistantResponse,
			});

		if (assistantEntryError) {
			logger.error("Failed to store assistant message", {
				error: assistantEntryError.message,
			});
		}

		// Generate title if this is a new conversation (first exchange)
		if (!conversationTitle) {
			const newTitle = await generateConversationTitle(
				input.message,
				assistantResponse,
			);

			if (newTitle) {
				const { error: titleUpdateError } = await sbUserClient
					.from("conversation")
					.update({ title: newTitle })
					.eq("id", conversationId);

				if (titleUpdateError) {
					logger.error("Failed to update conversation title", {
						error: titleUpdateError.message,
					});
				} else {
					conversationTitle = newTitle;
				}
			}
		}

		logger.info("Chat request completed", {
			userId: user.id,
			conversationId,
			projectId: input.projectId,
		});

		return json({
			conversationId,
			title: conversationTitle,
			response: assistantResponse,
			requestId,
		});
	}),
);

export default {
	fetch: async (req: Request) => {
		const res = await app.fetch(req);
		return withCORS()(req, res);
	},
};
