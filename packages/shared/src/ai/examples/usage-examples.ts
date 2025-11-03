import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db-types";
import {
	type ConversationSearchQuery,
	createAISearchService,
} from "../ai-search-service";
import type { EmbeddingProvider } from "../content-processing";

/**
 * Example OpenAI embedding provider implementation
 */
class OpenAIEmbeddingProvider implements EmbeddingProvider {
	constructor(private apiKey: string) {}

	async generateEmbedding(text: string, model: string): Promise<number[]> {
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
			throw new Error(`OpenAI API error: ${response.statusText}`);
		}

		const data = await response.json();
		return data.data[0].embedding;
	}
}

/**
 * Example usage of the AI Search Service
 */
export class AISearchExamples {
	private aiSearch: ReturnType<typeof createAISearchService>;
	private supabase: SupabaseClient<Database>;

	constructor(supabase: SupabaseClient<Database>, openaiApiKey: string) {
		this.supabase = supabase;
		const embeddingProvider = new OpenAIEmbeddingProvider(openaiApiKey);
		this.aiSearch = createAISearchService(supabase, embeddingProvider);
	}

	/**
	 * Example: Initialize search for a new project
	 */
	async initializeProjectSearch(projectId: string) {
		try {
			const configId = await this.aiSearch.initializeSearchConfig(projectId, {
				embeddingModel: "text-embedding-3-small",
				chunkSize: 1000,
				chunkOverlap: 200,
				rerankModel: null,
				filters: {
					includeFileTypes: ["pdf", "txt", "md"],
					excludeFileTypes: ["exe", "zip"],
				},
			});

			console.log(`Search configuration created: ${configId}`);
			return configId;
		} catch (error) {
			console.error("Failed to initialize search config:", error);
			throw error;
		}
	}

	/**
	 * Example: Process a record for search
	 */
	async processRecord(recordId: string, projectId: string, content: string) {
		try {
			await this.aiSearch.processContent(
				"record",
				recordId,
				projectId,
				content
			);
			console.log(`Record ${recordId} processed for search`);
		} catch (error) {
			console.error("Failed to process record:", error);
			throw error;
		}
	}

	/**
	 * Example: Process a file for search
	 */
	async processFile(fileId: string, projectId: string, extractedText: string) {
		try {
			await this.aiSearch.processContent(
				"file",
				fileId,
				projectId,
				extractedText
			);
			console.log(`File ${fileId} processed for search`);
		} catch (error) {
			console.error("Failed to process file:", error);
			throw error;
		}
	}

	/**
	 * Example: Process a website for search
	 */
	async processWebsite(
		websiteId: string,
		projectId: string,
		extractedContent: string
	) {
		try {
			await this.aiSearch.processContent(
				"website",
				websiteId,
				projectId,
				extractedContent
			);
			console.log(`Website ${websiteId} processed for search`);
		} catch (error) {
			console.error("Failed to process website:", error);
			throw error;
		}
	}

	/**
	 * Example: Search for content
	 */
	async searchContent(query: string, projectId: string) {
		try {
			const results = await this.aiSearch.searchContent(
				query,
				projectId,
				["record", "file", "website"], // Search all content types
				0.7, // Match threshold
				10 // Max results
			);

			console.log(`Found ${results.length} results for query: "${query}"`);
			return results;
		} catch (error) {
			console.error("Search failed:", error);
			throw error;
		}
	}

	/**
	 * Example: Find similar records
	 */
	async findSimilarRecords(recordId: string, projectId: string) {
		try {
			// First get the record content to use as query
			const { data: record } = await this.supabase
				.from("record")
				.select("content")
				.eq("id", recordId)
				.single();

			if (!record) {
				throw new Error("Record not found");
			}

			const results = await this.aiSearch.searchSimilarRecords(
				record.content,
				projectId,
				recordId, // Exclude the current record
				0.8, // Higher threshold for similar records
				5 // Max results
			);

			console.log(`Found ${results.length} similar records`);
			return results;
		} catch (error) {
			console.error("Similar records search failed:", error);
			throw error;
		}
	}

	/**
	 * Example: Conversation-informed search
	 */
	async searchWithConversationContext(
		topicDescription: string,
		projectId: string,
		conversationHistory?: Array<{
			role: "user" | "assistant" | "system";
			content: string;
		}>
	) {
		try {
			const query: ConversationSearchQuery = {
				topicDescription,
				projectId,
				conversationHistory,
				sourceTypes: ["record", "file", "website"],
				options: {
					matchThreshold: 0.6, // Lower threshold for broader results
					matchCount: 15,
					includeMetadata: true,
				},
			};

			const results = await this.aiSearch.searchWithConversationContext(query);

			console.log(`Found ${results.length} contextually relevant results`);
			return results;
		} catch (error) {
			console.error("Conversation search failed:", error);
			throw error;
		}
	}

	/**
	 * Example: Hybrid search (text + vector)
	 */
	async hybridSearch(query: string, projectId: string) {
		try {
			const results = await this.aiSearch.hybridSearch(
				query,
				projectId,
				["record", "file", "website"],
				0.6, // Match threshold
				10, // Max results
				0.3, // Text weight
				0.7 // Vector weight
			);

			console.log(`Found ${results.length} hybrid search results`);
			return results;
		} catch (error) {
			console.error("Hybrid search failed:", error);
			throw error;
		}
	}

	/**
	 * Example: Update content when it changes
	 */
	async updateRecordContent(
		recordId: string,
		projectId: string,
		newContent: string
	) {
		try {
			await this.aiSearch.updateContent(
				"record",
				recordId,
				projectId,
				newContent
			);
			console.log(`Record ${recordId} content updated and reprocessed`);
		} catch (error) {
			console.error("Failed to update record content:", error);
			throw error;
		}
	}

	/**
	 * Example: Complete workflow for a new project
	 */
	async setupNewProject(
		projectId: string,
		initialRecords: Array<{ id: string; content: string }>
	) {
		try {
			// 1. Initialize search configuration
			await this.initializeProjectSearch(projectId);

			// 2. Process initial records
			for (const record of initialRecords) {
				await this.processRecord(record.id, projectId, record.content);
			}

			console.log(
				`Project ${projectId} setup complete with ${initialRecords.length} records`
			);
		} catch (error) {
			console.error("Project setup failed:", error);
			throw error;
		}
	}
}
