import type {
	SearchResult,
	ConversationSearchResult,
	ConversationSearchQuery,
	SearchOptions,
} from "./search-functions";
import type { EmbeddingProvider } from "./content-processing";

/**
 * Conversation-informed search that understands context and generates intelligent responses
 */
export class ConversationSearchService {
	constructor(
		private embeddingProvider: EmbeddingProvider,
		private embeddingModel: string
	) {}

	/**
	 * Perform conversation-informed search for large topic queries
	 */
	async searchWithConversationContext(
		query: ConversationSearchQuery
	): Promise<ConversationSearchResult[]> {
		// 1. Build context-aware query
		const contextualQuery = await this.buildContextualQuery(query);

		// 2. Generate embedding for the contextual query
		const queryEmbedding = await this.embeddingProvider.generateEmbedding(
			contextualQuery,
			this.embeddingModel
		);

		// 3. Perform vector search (this would call your database function)
		const searchResults = await this.performVectorSearch({
			queryEmbedding,
			projectId: query.projectId,
			sourceTypes: query.sourceTypes,
			options: query.options,
		});

		// 4. Enhance results with conversation context
		return this.enhanceResultsWithContext(searchResults, query);
	}

	/**
	 * Build a context-aware query by incorporating conversation history
	 */
	private async buildContextualQuery(
		query: ConversationSearchQuery
	): Promise<string> {
		let contextualQuery = query.topicDescription;

		if (query.conversationHistory && query.conversationHistory.length > 0) {
			// Extract key themes from conversation history
			const conversationThemes = this.extractConversationThemes(
				query.conversationHistory
			);

			if (conversationThemes.length > 0) {
				contextualQuery = `${query.topicDescription}\n\nRelated context: ${conversationThemes.join(", ")}`;
			}
		}

		return contextualQuery;
	}

	/**
	 * Extract key themes from conversation history
	 */
	private extractConversationThemes(
		conversationHistory: Array<{ role: string; content: string }>
	): string[] {
		const themes = new Set<string>();

		// Focus on user messages and assistant responses
		const relevantMessages = conversationHistory.filter(
			(msg) => msg.role === "user" || msg.role === "assistant"
		);

		relevantMessages.forEach((message) => {
			const words = message.content.toLowerCase().split(/\s+/);
			words.forEach((word) => {
				// Extract meaningful terms (longer words, not stop words)
				if (word.length > 4 && !this.isStopWord(word)) {
					themes.add(word);
				}
			});
		});

		return Array.from(themes).slice(0, 5); // Limit to top 5 themes
	}

	/**
	 * Enhance search results with conversation context
	 */
	private enhanceResultsWithContext(
		searchResults: SearchResult[],
		query: ConversationSearchQuery
	): ConversationSearchResult[] {
		return searchResults.map((result) => ({
			...result,
			relevanceScore: this.calculateRelevanceScore(result, query),
			contextSnippets: this.extractContextSnippets(searchResults),
			suggestedQuestions: this.generateSuggestedQuestions(
				searchResults,
				query.topicDescription
			),
		}));
	}

	/**
	 * Calculate relevance score based on conversation context
	 */
	private calculateRelevanceScore(
		result: SearchResult,
		query: ConversationSearchQuery
	): number {
		let score = result.similarity;

		// Boost score if result contains conversation themes
		if (query.conversationHistory && query.conversationHistory.length > 0) {
			const themes = this.extractConversationThemes(query.conversationHistory);
			const themeMatches = themes.filter((theme) =>
				result.text.toLowerCase().includes(theme.toLowerCase())
			).length;

			score += (themeMatches / themes.length) * 0.2; // Boost up to 20%
		}

		return Math.min(score, 1.0); // Cap at 1.0
	}

	/**
	 * Extract context snippets from search results
	 */
	private extractContextSnippets(searchResults: SearchResult[]): string[] {
		return searchResults.slice(0, 3).map((result) => {
			const words = result.text.split(" ");
			const snippetLength = Math.min(50, words.length);
			const start = Math.max(
				0,
				Math.floor(words.length / 2) - snippetLength / 2
			);
			return words.slice(start, start + snippetLength).join(" ");
		});
	}

	/**
	 * Generate suggested follow-up questions
	 */
	private generateSuggestedQuestions(
		searchResults: SearchResult[],
		topicDescription: string
	): string[] {
		const questions: string[] = [];

		// Extract key topics from search results
		const topics = new Set<string>();
		searchResults.forEach((result) => {
			const words = result.text.toLowerCase().split(/\s+/);
			words.forEach((word) => {
				if (word.length > 4 && !this.isStopWord(word)) {
					topics.add(word);
				}
			});
		});

		// Generate contextual questions
		if (topics.size > 0) {
			const topicArray = Array.from(topics).slice(0, 3);
			questions.push(`What are the key aspects of ${topicArray.join(", ")}?`);
			questions.push(`How do these topics relate to ${topicDescription}?`);
			questions.push(
				`What are the main challenges or opportunities in this area?`
			);
		}

		return questions.slice(0, 3);
	}

	/**
	 * Check if a word is a stop word
	 */
	private isStopWord(word: string): boolean {
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

		return stopWords.has(word.toLowerCase());
	}

	/**
	 * Placeholder for actual vector search implementation
	 * This would call your Supabase RPC function
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private async performVectorSearch(params: {
		queryEmbedding: number[];
		projectId: string;
		sourceTypes?: string[];
		options?: SearchOptions;
	}): Promise<SearchResult[]> {
		// This is a placeholder - you would implement the actual database call here
		// Example:
		// const { data } = await supabase.rpc('search_content_chunks', {
		//   query_embedding: embeddingToVector(params.queryEmbedding),
		//   project_id: params.projectId,
		//   source_types: params.sourceTypes,
		//   match_threshold: params.options?.matchThreshold || 0.7,
		//   match_count: params.options?.matchCount || 10
		// });
		// return data || [];

		return []; // Placeholder return
	}
}

/**
 * Utility function to create a conversation search service
 */
export function createConversationSearchService(
	embeddingProvider: EmbeddingProvider,
	embeddingModel: string = "text-embedding-3-small"
): ConversationSearchService {
	return new ConversationSearchService(embeddingProvider, embeddingModel);
}
