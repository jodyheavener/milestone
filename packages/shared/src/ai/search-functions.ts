import type { Json } from "../db-types";

export type SearchResult = {
	id: string;
	source_type: string;
	source_id: string;
	text: string;
	chunk_index: number;
	similarity: number;
	metadata?: Json;
};

export type RecordSearchResult = {
	id: string;
	record_id: string;
	content: string;
	similarity: number;
	metadata?: Json;
};

export interface SearchOptions {
	matchThreshold?: number;
	matchCount?: number;
	includeMetadata?: boolean;
}

export const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions> = {
	matchThreshold: 0.7,
	matchCount: 10,
	includeMetadata: true,
};

/**
 * Search content chunks using vector similarity
 */
export interface ContentSearchQuery {
	queryEmbedding: number[];
	projectId: string;
	sourceTypes?: string[];
	options?: SearchOptions;
}

/**
 * Search records using vector similarity
 */
export interface RecordSearchQuery {
	queryEmbedding: number[];
	projectId: string;
	excludeRecordId?: string;
	options?: SearchOptions;
}

/**
 * Conversation-informed search for large topic queries
 */
export interface ConversationSearchQuery {
	topicDescription: string;
	projectId: string;
	conversationHistory?: Array<{
		role: "user" | "assistant" | "system";
		content: string;
	}>;
	sourceTypes?: string[];
	options?: SearchOptions;
}

/**
 * Search result with conversation context
 */
export type ConversationSearchResult = SearchResult & {
	relevanceScore: number;
	contextSnippets: string[];
	suggestedQuestions: string[];
};

/**
 * Utility to convert embedding array to PostgreSQL vector format
 */
export function embeddingToVector(embedding: number[]): string {
	return `[${embedding.join(",")}]`;
}

/**
 * Utility to parse PostgreSQL vector format to array
 */
export function vectorToEmbedding(vector: string): number[] {
	return vector.slice(1, -1).split(",").map(Number);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new Error("Vectors must have the same length");
	}

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	if (normA === 0 || normB === 0) {
		return 0;
	}

	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate suggested follow-up questions based on search results
 */
export function generateSuggestedQuestions(
	searchResults: SearchResult[],
	topicDescription: string
): string[] {
	const questions: string[] = [];

	// Extract key topics from search results
	const topics = new Set<string>();
	searchResults.forEach((result) => {
		const words = result.text.toLowerCase().split(/\s+/);
		words.forEach((word) => {
			if (word.length > 4 && !stopWords.has(word)) {
				topics.add(word);
			}
		});
	});

	// Generate questions based on topics and original description
	if (topics.size > 0) {
		questions.push(
			`What are the key aspects of ${Array.from(topics).slice(0, 3).join(", ")}?`
		);
		questions.push(`How do these topics relate to ${topicDescription}?`);
		questions.push(
			`What are the main challenges or opportunities in this area?`
		);
	}

	return questions.slice(0, 3);
}

/**
 * Extract context snippets from search results
 */
export function extractContextSnippets(
	searchResults: SearchResult[],
	maxSnippets: number = 3
): string[] {
	return searchResults.slice(0, maxSnippets).map((result) => {
		// Extract a meaningful snippet around the most relevant part
		const words = result.text.split(" ");
		const snippetLength = Math.min(50, words.length);
		const start = Math.max(0, Math.floor(words.length / 2) - snippetLength / 2);
		return words.slice(start, start + snippetLength).join(" ");
	});
}

// Common stop words for question generation
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
	"up",
	"about",
	"into",
	"through",
	"during",
	"before",
	"after",
	"above",
	"below",
	"between",
	"among",
	"is",
	"are",
	"was",
	"were",
	"be",
	"been",
	"being",
	"have",
	"has",
	"had",
	"do",
	"does",
	"did",
	"will",
	"would",
	"could",
	"should",
	"may",
	"might",
	"must",
	"can",
	"this",
	"that",
	"these",
	"those",
]);
