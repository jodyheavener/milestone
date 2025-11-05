import "@supabase/functions-js";
import { ServiceError } from "@milestone/shared";
import {
	createAISearchService,
	createContentChunks,
	type EmbeddingProvider,
} from "@/lib";
import { Hono, z } from "@/lib";
import { getServiceClient, getUserClient } from "@/lib";
import { getAuthHeader, getUserOrThrow } from "@/lib";
import { handleRequest, json, logger, withCORS } from "@/lib";
import { getOpenaiClient } from "@/lib";

const app = new Hono();

// Validation schemas
const ChatRequestSchema = z.object({
	conversation_id: z.string().uuid(),
	message: z.string().min(1).max(10000),
});

// Preflight
app.options("*", () => new Response(null, { status: 204 }));

/**
 * OpenAI Embedding Provider for server-side use
 */
class ServerEmbeddingProvider implements EmbeddingProvider {
	constructor(private apiKey: string) {}

	async generateEmbedding(text: string, model: string): Promise<number[]> {
		try {
			const response = await fetch("https://api.openai.com/v1/embeddings", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					input: text,
					model: model,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				logger.error("OpenAI API error", {
					status: response.status,
					statusText: response.statusText,
					errorText,
				});
				throw new Error(
					`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`,
				);
			}

			const data = await response.json();
			const embedding = data.data[0]?.embedding;

			if (!embedding) {
				logger.error("Invalid embedding response", { data });
				throw new Error("Invalid embedding response from OpenAI API");
			}

			return embedding;
		} catch (error) {
			logger.error("Failed to generate embedding", {
				error: error instanceof Error
					? { message: error.message, stack: error.stack }
					: String(error),
				model,
			});
			throw error;
		}
	}
}

/**
 * Get conversation history entries
 */
async function getConversationHistory(
	supabase: ReturnType<typeof getServiceClient>,
	conversationId: string,
) {
	const { data, error } = await supabase
		.from("conversation_entry")
		.select("role, content")
		.eq("conversation_id", conversationId)
		.order("created_at", { ascending: true });

	if (error) {
		throw new Error(`Failed to get conversation history: ${error.message}`);
	}

	return data || [];
}

/**
 * Process records that haven't been indexed yet for this project
 */
async function processUnindexedRecords(
	supabase: ReturnType<typeof getServiceClient>,
	aiSearch: ReturnType<typeof createAISearchService>,
	projectId: string,
) {
	try {
		// Get records associated with this project that don't have chunks yet
		const { data: recordProjects, error: rpError } = await supabase
			.from("record_project")
			.select("record_id")
			.eq("project_id", projectId);

		if (rpError || !recordProjects || recordProjects.length === 0) {
			return;
		}

		const recordIds = recordProjects.map((rp) => rp.record_id);

		// Find records that don't have content chunks yet
		const { data: recordsWithChunks, error: chunksError } = await supabase
			.from("content_chunk")
			.select("source_id")
			.eq("project_id", projectId)
			.eq("source_type", "record")
			.in("source_id", recordIds);

		if (chunksError) {
			logger.warn("Error checking for existing chunks", {
				error: chunksError.message,
			});
			return;
		}

		const indexedRecordIds = new Set(
			(recordsWithChunks || []).map((chunk) => chunk.source_id),
		);

		// Get records that need indexing
		const unindexedRecordIds = recordIds.filter(
			(id) => !indexedRecordIds.has(id),
		);

		if (unindexedRecordIds.length === 0) {
			return;
		}

		// Get the full record data with files and websites
		const { data: records, error: recordsError } = await supabase
			.from("record")
			.select(
				`
				id,
				content,
				file (
					id,
					extracted_text
				),
				website (
					id,
					extracted_content
				)
			`,
			)
			.in("id", unindexedRecordIds);

		if (recordsError || !records || records.length === 0) {
			return;
		}

		logger.info("Processing unindexed records", {
			projectId,
			count: records.length,
		});

		// Process each record and its attachments
		for (const record of records) {
			// Process record content
			if (record.content && record.content.trim().length > 0) {
				try {
					await aiSearch.processContent(
						"record",
						record.id,
						projectId,
						record.content,
					);
					logger.info("Successfully indexed record", {
						recordId: record.id,
						projectId,
					});
				} catch (processError) {
					logger.error("Failed to process record for search", {
						recordId: record.id,
						projectId,
						error: processError instanceof Error
							? processError.message
							: String(processError),
					});
				}
			}

			// Process file attachments
			const files = Array.isArray(record.file)
				? record.file
				: record.file
				? [record.file]
				: [];
			for (const file of files) {
				if (file.extracted_text && file.extracted_text.trim().length > 0) {
					try {
						// Check if file is already indexed
						const { data: existingChunks } = await supabase
							.from("content_chunk")
							.select("id")
							.eq("source_type", "file")
							.eq("source_id", file.id)
							.eq("project_id", projectId)
							.limit(1);

						if (!existingChunks || existingChunks.length === 0) {
							// For files and websites, we need to create chunks manually
							// since processContent tries to create record embeddings
							const config = await aiSearch.getSearchConfig(projectId);
							if (config) {
								const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
								if (!openaiApiKey) {
									throw new Error(
										"OPENAI_API_KEY environment variable is not set",
									);
								}
								const embeddingProvider = new ServerEmbeddingProvider(
									openaiApiKey,
								);
								const chunks = await createContentChunks(
									"file",
									file.id,
									projectId,
									file.extracted_text,
									{
										chunkSize: config.chunk_size,
										chunkOverlap: config.chunk_overlap,
									},
									embeddingProvider,
									config.embedding_model,
								);

								const { error: chunksError } = await supabase
									.from("content_chunk")
									.insert(chunks);

								if (chunksError) {
									throw chunksError;
								}

								logger.info("Successfully indexed file", {
									fileId: file.id,
									recordId: record.id,
									projectId,
								});
							}
						}
					} catch (processError) {
						logger.error("Failed to process file for search", {
							fileId: file.id,
							recordId: record.id,
							projectId,
							error: processError instanceof Error
								? processError.message
								: String(processError),
						});
					}
				}
			}

			// Process website attachments
			const websites = Array.isArray(record.website)
				? record.website
				: record.website
				? [record.website]
				: [];
			for (const website of websites) {
				if (
					website.extracted_content &&
					website.extracted_content.trim().length > 0
				) {
					try {
						// Check if website is already indexed
						const { data: existingChunks } = await supabase
							.from("content_chunk")
							.select("id")
							.eq("source_type", "website")
							.eq("source_id", website.id)
							.eq("project_id", projectId)
							.limit(1);

						if (!existingChunks || existingChunks.length === 0) {
							// For files and websites, we need to create chunks manually
							// since processContent tries to create record embeddings
							const config = await aiSearch.getSearchConfig(projectId);
							if (config) {
								const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
								if (!openaiApiKey) {
									throw new Error(
										"OPENAI_API_KEY environment variable is not set",
									);
								}
								const embeddingProvider = new ServerEmbeddingProvider(
									openaiApiKey,
								);
								const chunks = await createContentChunks(
									"website",
									website.id,
									projectId,
									website.extracted_content,
									{
										chunkSize: config.chunk_size,
										chunkOverlap: config.chunk_overlap,
									},
									embeddingProvider,
									config.embedding_model,
								);

								const { error: chunksError } = await supabase
									.from("content_chunk")
									.insert(chunks);

								if (chunksError) {
									throw chunksError;
								}

								logger.info("Successfully indexed website", {
									websiteId: website.id,
									recordId: record.id,
									projectId,
								});
							}
						}
					} catch (processError) {
						logger.error("Failed to process website for search", {
							websiteId: website.id,
							recordId: record.id,
							projectId,
							error: processError instanceof Error
								? processError.message
								: String(processError),
						});
					}
				}
			}
		}
	} catch (error) {
		logger.error("Error in processUnindexedRecords", {
			error: error instanceof Error ? error.message : String(error),
			projectId,
		});
		// Don't throw - allow search to continue even if indexing fails
	}
}

/**
 * Fallback: Get record context directly from database when vector search fails
 */
async function getFallbackRecordContext(
	supabase: ReturnType<typeof getServiceClient>,
	projectId: string,
): Promise<Array<{ text: string; source_type: string }>> {
	try {
		const { data: recordProjects, error: rpError } = await supabase
			.from("record_project")
			.select(
				`
				record_id,
				record:record_id (
					id,
					content,
					file (
						id,
						extracted_text
					),
					website (
						id,
						extracted_content
					)
				)
			`,
			)
			.eq("project_id", projectId)
			.order("created_at", { ascending: false })
			.limit(5); // Limit to 5 most recent records

		if (rpError || !recordProjects) {
			return [];
		}

		const contextItems: Array<{ text: string; source_type: string }> = [];

		for (const rp of recordProjects) {
			const record = Array.isArray(rp.record) ? rp.record[0] : rp.record;
			if (!record) continue;

			// Add record content
			if (record.content) {
				contextItems.push({
					text: record.content.substring(0, 1000), // Limit length
					source_type: "record",
				});
			}

			// Add file content if available
			if (record.file && Array.isArray(record.file) && record.file.length > 0) {
				const file = record.file[0];
				if (file.extracted_text) {
					contextItems.push({
						text: file.extracted_text.substring(0, 1000),
						source_type: "file",
					});
				}
			}

			// Add website content if available
			if (
				record.website &&
				Array.isArray(record.website) &&
				record.website.length > 0
			) {
				const website = record.website[0];
				if (website.extracted_content) {
					contextItems.push({
						text: website.extracted_content.substring(0, 1000),
						source_type: "website",
					});
				}
			}
		}

		return contextItems;
	} catch (error) {
		logger.error("Error in getFallbackRecordContext", {
			error: error instanceof Error ? error.message : String(error),
			projectId,
		});
		return [];
	}
}

/**
 * Generate conversation title from first user message
 */
async function generateConversationTitle(
	firstMessage: string,
	projectGoal: string,
): Promise<string> {
	try {
		const client = getOpenaiClient();
		const response = await client.responses.create({
			input: [
				{
					content:
						"You are a helpful assistant that generates concise, descriptive titles for conversations. Generate a title that captures the main topic or question from the first message. Keep it under 60 characters.",
					role: "system",
				},
				{
					content:
						`Project Goal: ${projectGoal}\n\nFirst Message: ${firstMessage}\n\nGenerate a concise title for this conversation:`,
					role: "user",
				},
			],
			model: "gpt-4o-mini",
			text: {
				format: {
					name: "conversation_title",
					schema: {
						type: "object",
						properties: {
							title: {
								type: "string",
								description:
									"A concise title for the conversation (maximum 60 characters)",
								maxLength: 60,
							},
						},
						required: ["title"],
						additionalProperties: false,
					},
					type: "json_schema",
				},
			},
		});

		const result = JSON.parse(response.output_text || "{}");
		return result.title || firstMessage.substring(0, 60);
	} catch (error) {
		logger.error("Failed to generate conversation title", { error });
		// Fallback to first 60 chars of message
		return firstMessage.substring(0, 60);
	}
}

/**
 * Generate AI response using OpenAI with project context
 */
async function generateAIResponse(
	userMessage: string,
	projectGoal: string,
	conversationHistory: Array<{ role: string; content: string }>,
	contextChunks: Array<{ text: string; source_type: string }>,
): Promise<string> {
	const client = getOpenaiClient();

	// Build context from relevant chunks
	const contextText = contextChunks
		.slice(0, 10) // Limit to top 10 chunks
		.map((chunk) => `[From ${chunk.source_type}]: ${chunk.text}`)
		.join("\n\n");

	// Build system prompt with project goal
	const systemPrompt =
		`You are a helpful AI assistant helping the user work towards their project goal.

Project Goal: ${projectGoal}

Your role is to:
1. Guide the conversation towards achieving the project goal
2. Use the provided context from the user's records, files, and websites to provide informed responses
3. Ask clarifying questions when needed
4. Be concise but thorough in your responses

${
			contextText
				? `\nRelevant Context from Project Records:\n${contextText}`
				: ""
		}`;

	// Build messages array
	const messages = [
		{ role: "system" as const, content: systemPrompt },
		...conversationHistory.map((entry) => ({
			role: entry.role as "system" | "user" | "assistant",
			content: entry.content,
		})),
		{ role: "user" as const, content: userMessage },
	] as Array<{ role: "system" | "user" | "assistant"; content: string }>;

	// Call OpenAI
	const response = await client.responses.create({
		input: messages,
		model: "gpt-4o",
		text: {
			format: {
				name: "assistant_response",
				schema: {
					type: "object",
					properties: {
						response: {
							type: "string",
							description:
								"Your helpful response to the user's message, using the project context when relevant",
						},
					},
					required: ["response"],
					additionalProperties: false,
				},
				type: "json_schema",
			},
		},
	});

	const result = JSON.parse(response.output_text || "{}");
	return result.response || "I apologize, but I couldn't generate a response.";
}

/**
 * Chat endpoint - handles AI conversations
 */
app.post(
	"/conversation-chat",
	handleRequest(async (c, requestId) => {
		// Auth as user
		const sbUserClient = getUserClient(getAuthHeader(c.req.raw));
		const user = await getUserOrThrow(sbUserClient);

		// Validate input
		const body = await c.req.json();
		const input = ChatRequestSchema.parse(body);

		logger.info("Conversation chat request", {
			userId: user.id,
			conversationId: input.conversation_id,
		});

		// Use service role for database operations
		const sbServiceClient = getServiceClient();

		// 1. Authorize operation (check usage limits)
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
			throw new ServiceError("RATE_LIMIT_EXCEEDED", {
				debugInfo: authResult.reason || "Usage limit exceeded",
			});
		}

		// 2. Get conversation and verify ownership
		const { data: conversation, error: convError } = await sbServiceClient
			.from("conversation")
			.select("id, project_id, title")
			.eq("id", input.conversation_id)
			.single();

		if (convError || !conversation) {
			throw new ServiceError("NOT_FOUND", {
				debugInfo: "Conversation not found",
			});
		}

		// 3. Get project to verify ownership and get goal
		const { data: project, error: projectError } = await sbServiceClient
			.from("project")
			.select("id, goal, user_id")
			.eq("id", conversation.project_id)
			.single();

		if (projectError || !project) {
			throw new ServiceError("NOT_FOUND", {
				debugInfo: "Project not found",
			});
		}

		if (project.user_id !== user.id) {
			throw new ServiceError("UNAUTHORIZED", {
				debugInfo: "You don't have access to this conversation",
			});
		}

		// 4. Get conversation history
		const history = await getConversationHistory(
			sbServiceClient,
			input.conversation_id,
		);

		// 5. Save user message
		const { error: userMessageError } = await sbServiceClient
			.from("conversation_entry")
			.insert({
				conversation_id: input.conversation_id,
				role: "user",
				content: input.message,
			});

		if (userMessageError) {
			logger.error("Failed to save user message", {
				error: userMessageError.message,
			});
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: "Failed to save user message",
			});
		}

		// 6. Search for relevant context from project records
		let contextChunks: Array<{ text: string; source_type: string }> = [];
		try {
			const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
			if (!openaiApiKey) {
				throw new Error("OPENAI_API_KEY environment variable is not set");
			}

			const embeddingProvider = new ServerEmbeddingProvider(openaiApiKey);
			const aiSearch = createAISearchService(
				sbServiceClient,
				embeddingProvider,
				"text-embedding-3-small",
			);

			// Ensure search config exists for this project
			let searchConfig = await aiSearch.getSearchConfig(
				conversation.project_id,
			);
			if (!searchConfig) {
				logger.info("Initializing search config for project", {
					projectId: conversation.project_id,
				});
				await aiSearch.initializeSearchConfig(conversation.project_id);
				searchConfig = await aiSearch.getSearchConfig(conversation.project_id);
			}

			// Process any unindexed records for this project
			await processUnindexedRecords(
				sbServiceClient,
				aiSearch,
				conversation.project_id,
			);

			// Search for relevant content
			const searchResults = await aiSearch.searchContent(
				input.message,
				conversation.project_id,
				["record", "file", "website"],
				0.7, // Match threshold
				10, // Max results
			);

			contextChunks = searchResults.map((result) => ({
				text: result.text,
				source_type: result.source_type,
			}));

			// If no chunks found, try fallback: get records directly
			if (contextChunks.length === 0) {
				contextChunks = await getFallbackRecordContext(
					sbServiceClient,
					conversation.project_id,
				);
			}
		} catch (searchError) {
			// Extract meaningful error information
			const errorMessage = searchError instanceof Error
				? searchError.message
				: String(searchError);
			const errorStack = searchError instanceof Error
				? searchError.stack
				: undefined;
			const errorName = searchError instanceof Error
				? searchError.name
				: "UnknownError";

			logger.warn("Context search failed, trying fallback", {
				error: {
					message: errorMessage,
					name: errorName,
					stack: errorStack,
				},
				conversationId: input.conversation_id,
				projectId: conversation.project_id,
			});

			// Try fallback: get records directly
			try {
				contextChunks = await getFallbackRecordContext(
					sbServiceClient,
					conversation.project_id,
				);
			} catch (fallbackError) {
				logger.warn("Fallback context retrieval also failed", {
					error: fallbackError,
				});
				// Continue without context if both fail
			}
		}

		// 7. Generate AI response
		const assistantResponse = await generateAIResponse(
			input.message,
			project.goal,
			history,
			contextChunks,
		);

		// 8. Save assistant response
		const { error: assistantMessageError } = await sbServiceClient
			.from("conversation_entry")
			.insert({
				conversation_id: input.conversation_id,
				role: "assistant",
				content: assistantResponse,
			});

		if (assistantMessageError) {
			logger.error("Failed to save assistant message", {
				error: assistantMessageError.message,
			});
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: "Failed to save assistant message",
			});
		}

		// 9. Generate/update conversation title if this is the first message
		if (!conversation.title && history.length === 0) {
			try {
				const title = await generateConversationTitle(
					input.message,
					project.goal,
				);

				await sbServiceClient
					.from("conversation")
					.update({ title })
					.eq("id", input.conversation_id);
			} catch (titleError) {
				logger.warn("Failed to generate conversation title", {
					error: titleError,
				});
				// Non-critical, continue
			}
		}

		return json({
			response: assistantResponse,
			remaining: authResult.remaining ?? null,
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
