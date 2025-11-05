import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib";
import { logger } from "@/lib";

interface ContextItem {
	text: string;
	source_type: string;
	source_id: string;
	similarity?: number;
}

/**
 * Retrieves relevant context from project records for the conversation
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

		// Use hybrid search to find relevant content chunks
		const { data: searchResults, error: searchError } = await supabase.rpc(
			"search_content_hybrid",
			{
				query_text: contextualQuery,
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
			// Fallback: get recent records directly
			return await getRecentRecordsContext(supabase, projectId);
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
 * Fallback: Get recent records as context when vector search fails
 */
async function getRecentRecordsContext(
	supabase: SupabaseClient<Database>,
	projectId: string,
): Promise<ContextItem[]> {
	try {
		// Get records linked to this project
		const { data: records, error } = await supabase
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
			.limit(3);

		if (error || !records) {
			return [];
		}

		const contextItems: ContextItem[] = [];

		for (const recordProject of records) {
			const record = recordProject.record;
			if (!record) continue;

			// Add record content
			if (record.content) {
				contextItems.push({
					text: record.content.substring(0, 1000), // Limit length
					source_type: "record",
					source_id: record.id,
				});
			}

			// Add file content if available
			if (record.file && record.file.length > 0) {
				const file = record.file[0];
				if (file.extracted_text) {
					contextItems.push({
						text: file.extracted_text.substring(0, 1000),
						source_type: "file",
						source_id: file.id,
					});
				}
			}

			// Add website content if available
			if (record.website && record.website.length > 0) {
				const website = record.website[0];
				if (website.extracted_content) {
					contextItems.push({
						text: website.extracted_content.substring(0, 1000),
						source_type: "website",
						source_id: website.id,
					});
				}
			}
		}

		return contextItems;
	} catch (error) {
		logger.error("Failed to get recent records context", { error });
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
