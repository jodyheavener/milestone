import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib";
import { logger } from "@/lib";
import { embeddingToVector } from "@/lib";

interface ContextItem {
	text: string;
	source_type: string;
	source_id: string;
	similarity?: number;
}

/**
 * OpenAI Embedding Provider for server-side use
 */
class ServerEmbeddingProvider {
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
 * Retrieves relevant context from project context entries for the conversation
 * Uses vector search to find the most relevant content chunks
 */
export async function getProjectContext(
	supabase: SupabaseClient<Database>,
	projectId: string,
	query: string,
	conversationHistory: Array<{ role: string; content: string }>,
): Promise<ContextItem[]> {
	try {
		// Build contextual query from user message and conversation history
		const contextualQuery = buildContextualQuery(query, conversationHistory);

		// Generate query embedding
		const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
		if (!openaiApiKey) {
			logger.error("OPENAI_API_KEY not set, falling back to text-only search");
			// Fallback: get recent context entries directly
			return await getRecentContextEntriesContext(supabase, projectId);
		}

		const embeddingProvider = new ServerEmbeddingProvider(openaiApiKey);
		const queryEmbedding = await embeddingProvider.generateEmbedding(
			contextualQuery,
			"text-embedding-3-small",
		);

		// Use hybrid search to find relevant content chunks
		const { data: searchResults, error: searchError } = await supabase.rpc(
			"search_content_hybrid",
			{
				query_text: contextualQuery,
				query_embedding: embeddingToVector(queryEmbedding),
				project_id: projectId,
				source_types: undefined, // Search all source types
				match_threshold: 0.6, // Lower threshold to get more results
				match_count: 5, // Limit to top 5 most relevant chunks
				text_weight: 0.3,
				vector_weight: 0.7,
			},
		);

		if (searchError) {
			logger.error("Search error", { error: searchError.message });
			return [];
		}

		if (!searchResults || searchResults.length === 0) {
			// Fallback: get recent context entries directly
			return await getRecentContextEntriesContext(supabase, projectId);
		}

		// Return formatted context items
		return searchResults.map((result) => ({
			text: result.text,
			source_type: result.source_type,
			source_id: result.source_id,
			similarity: result.similarity,
		}));
	} catch (error) {
		logger.error("Context retrieval error", { error });
		return [];
	}
}

/**
 * Builds a contextual query by incorporating conversation history
 */
function buildContextualQuery(
	currentQuery: string,
	history: Array<{ role: string; content: string }>,
): string {
	if (history.length === 0) {
		return currentQuery;
	}

	// Extract key terms from recent conversation history
	const recentMessages = history.slice(-4); // Last 4 messages
	const contextTerms: string[] = [];

	for (const msg of recentMessages) {
		if (msg.role === "user" || msg.role === "assistant") {
			// Extract meaningful words (longer than 4 chars, not stop words)
			const words = msg.content
				.toLowerCase()
				.split(/\s+/)
				.filter((w) => w.length > 4 && !isStopWord(w));
			contextTerms.push(...words.slice(0, 5)); // Limit per message
		}
	}

	// Combine current query with context terms
	if (contextTerms.length > 0) {
		return `${currentQuery} ${contextTerms.join(" ")}`;
	}

	return currentQuery;
}

/**
 * Fallback: Get recent context entries as context when vector search fails
 */
async function getRecentContextEntriesContext(
	supabase: SupabaseClient<Database>,
	projectId: string,
): Promise<ContextItem[]> {
	try {
		// Get context entries linked to this project
		const { data: contextEntryProjects, error } = await supabase
			.from("context_entry_project")
			.select(
				`
				context_entry_id,
				context_entry:context_entry_id (
					id,
					title,
					content
				)
			`,
			)
			.eq("project_id", projectId)
			.order("created_at", { ascending: false })
			.limit(3);

		if (error || !contextEntryProjects) {
			return [];
		}

		const contextItems: ContextItem[] = [];

		for (const contextEntryProject of contextEntryProjects) {
			const contextEntry = contextEntryProject.context_entry;
			if (!contextEntry) continue;

			// Get summary from record table for this context entry
			const { data: record } = await supabase
				.from("record")
				.select("content")
				.eq("context_entry_id", contextEntry.id)
				.order("created_at", { ascending: false })
				.limit(1)
				.single();

			// Use summary if available, otherwise fall back to content
			let text = "";
			if (record?.content) {
				// Extract summary text from JSONB content
				const summary = record.content as {
					tldr?: string;
					key_takeaways?: string[];
					[key: string]: unknown;
				};
				text = summary.tldr || JSON.stringify(summary);
			} else if (contextEntry.content) {
				text = contextEntry.content;
			}

			if (text) {
				const titlePrefix = contextEntry.title
					? `[${contextEntry.title}] `
					: "";
				contextItems.push({
					text: `${titlePrefix}${text.substring(0, 1000)}`, // Limit length
					source_type: "context_entry",
					source_id: contextEntry.id,
				});
			}
		}

		return contextItems;
	} catch (error) {
		logger.error("Failed to get recent context entries context", { error });
		return [];
	}
}

/**
 * Check if a word is a stop word
 */
function isStopWord(word: string): boolean {
	const stopWords = new Set([
		"the",
		"a",
		"an",
		"and",
		"or",
		"but",
		"in",
		"on",
		"at",
		"to",
		"for",
		"of",
		"with",
		"by",
		"from",
		"this",
		"that",
		"these",
		"those",
		"what",
		"which",
		"who",
		"when",
		"where",
		"why",
		"how",
		"would",
		"could",
		"should",
		"will",
		"can",
		"may",
		"might",
		"must",
	]);
	return stopWords.has(word.toLowerCase());
}
