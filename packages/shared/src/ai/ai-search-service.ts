import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db-types";
import {
	type ChunkingOptions,
	type EmbeddingProvider,
	processContentForSearch,
	type SourceType,
} from "./content-processing";
import {
	type ConversationSearchService,
	createConversationSearchService,
} from "./conversation-search";
import { createSearchConfig, type SearchConfigOptions } from "./search-config";
import {
	type ConversationSearchQuery,
	embeddingToVector,
	type RecordSearchResult,
	type SearchResult,
} from "./search-functions";

// Re-export types for external use
export type { ConversationSearchQuery, EmbeddingProvider };

export class AISearchService {
	private conversationSearch: ConversationSearchService;

	constructor(
		private supabase: SupabaseClient<Database>,
		private embeddingProvider: EmbeddingProvider,
		private embeddingModel: string = "text-embedding-3-small"
	) {
		this.conversationSearch = createConversationSearchService(
			embeddingProvider,
			embeddingModel
		);
	}

	/**
	 * Initialize search configuration for a project
	 */
	async initializeSearchConfig(
		projectId: string,
		options: SearchConfigOptions = {}
	): Promise<string> {
		const config = createSearchConfig(projectId, options);

		const { data, error } = await this.supabase.rpc("init_search_config", {
			project_id: config.project_id,
			embedding_model: config.embedding_model,
			embedding_dim: config.embedding_dim,
			chunk_size: config.chunk_size,
			chunk_overlap: config.chunk_overlap,
			rerank_model: config.rerank_model ?? undefined,
			filters: config.filters,
		});

		if (error) {
			throw new Error(`Failed to initialize search config: ${error.message}`);
		}

		return data;
	}

	/**
	 * Get search configuration for a project
	 */
	async getSearchConfig(projectId: string) {
		const { data, error } = await this.supabase.rpc("get_search_config", {
			project_id: projectId,
		});

		if (error) {
			throw new Error(`Failed to get search config: ${error.message}`);
		}

		return data?.[0] || null;
	}

	/**
	 * Process content for search (create chunks and embeddings)
	 */
	async processContent(
		sourceType: SourceType,
		sourceId: string,
		projectId: string,
		content: string
	): Promise<void> {
		// Get search configuration
		const config = await this.getSearchConfig(projectId);
		if (!config) {
			throw new Error("Search configuration not found for project");
		}

		const chunkingOptions: ChunkingOptions = {
			chunkSize: config.chunk_size,
			chunkOverlap: config.chunk_overlap,
		};

		// Process content
		const result = await processContentForSearch(
			sourceType,
			sourceId,
			projectId,
			content,
			chunkingOptions,
			this.embeddingProvider,
			config.embedding_model
		);

		// Insert chunks into database
		const { error: chunksError } = await this.supabase
			.from("content_chunk")
			.insert(result.chunks);

		if (chunksError) {
			throw new Error(
				`Failed to insert content chunks: ${chunksError.message}`
			);
		}

		// Insert record embedding
		const { error: embeddingError } = await this.supabase
			.from("record_embedding")
			.insert(result.recordEmbedding);

		if (embeddingError) {
			throw new Error(
				`Failed to insert record embedding: ${embeddingError.message}`
			);
		}
	}

	/**
	 * Search content chunks using vector similarity
	 */
	async searchContent(
		query: string,
		projectId: string,
		sourceTypes?: string[],
		matchThreshold: number = 0.7,
		matchCount: number = 10
	): Promise<SearchResult[]> {
		// Generate query embedding
		const queryEmbedding = await this.embeddingProvider.generateEmbedding(
			query,
			this.embeddingModel
		);

		// Search using database function
		const { data, error } = await this.supabase.rpc("search_content_chunks", {
			query_embedding: embeddingToVector(queryEmbedding),
			project_id: projectId,
			source_types: sourceTypes,
			match_threshold: matchThreshold,
			match_count: matchCount,
		});

		if (error) {
			throw new Error(`Search failed: ${error.message}`);
		}

		return (data as SearchResult[]) || [];
	}

	/**
	 * Search similar records
	 */
	async searchSimilarRecords(
		query: string,
		projectId: string,
		excludeRecordId?: string,
		matchThreshold: number = 0.8,
		matchCount: number = 5
	): Promise<RecordSearchResult[]> {
		// Generate query embedding
		const queryEmbedding = await this.embeddingProvider.generateEmbedding(
			query,
			this.embeddingModel
		);

		// Search using database function
		const { data, error } = await this.supabase.rpc("search_similar_records", {
			query_embedding: embeddingToVector(queryEmbedding),
			project_id: projectId,
			exclude_record_id: excludeRecordId,
			match_threshold: matchThreshold,
			match_count: matchCount,
		});

		if (error) {
			throw new Error(`Record search failed: ${error.message}`);
		}

		return (data as RecordSearchResult[]) || [];
	}

	/**
	 * Conversation-informed search for large topic queries
	 */
	async searchWithConversationContext(
		query: ConversationSearchQuery
	): Promise<SearchResult[]> {
		return this.conversationSearch.searchWithConversationContext(query);
	}

	/**
	 * Hybrid search (text + vector similarity)
	 */
	async hybridSearch(
		query: string,
		projectId: string,
		sourceTypes?: string[],
		matchThreshold: number = 0.7,
		matchCount: number = 10,
		textWeight: number = 0.3,
		vectorWeight: number = 0.7
	): Promise<SearchResult[]> {
		const { data, error } = await this.supabase.rpc("search_content_hybrid", {
			query_text: query,
			project_id: projectId,
			source_types: sourceTypes,
			match_threshold: matchThreshold,
			match_count: matchCount,
			text_weight: textWeight,
			vector_weight: vectorWeight,
		});

		if (error) {
			throw new Error(`Hybrid search failed: ${error.message}`);
		}

		return (data as SearchResult[]) || [];
	}

	/**
	 * Delete content chunks for a source
	 */
	async deleteContentChunks(
		sourceType: SourceType,
		sourceId: string
	): Promise<void> {
		const { error } = await this.supabase
			.from("content_chunk")
			.delete()
			.eq("source_type", sourceType)
			.eq("source_id", sourceId);

		if (error) {
			throw new Error(`Failed to delete content chunks: ${error.message}`);
		}
	}

	/**
	 * Delete record embedding
	 */
	async deleteRecordEmbedding(recordId: string): Promise<void> {
		const { error } = await this.supabase
			.from("record_embedding")
			.delete()
			.eq("record_id", recordId);

		if (error) {
			throw new Error(`Failed to delete record embedding: ${error.message}`);
		}
	}

	/**
	 * Update content (reprocess chunks and embeddings)
	 */
	async updateContent(
		sourceType: SourceType,
		sourceId: string,
		projectId: string,
		newContent: string
	): Promise<void> {
		// Delete existing chunks and embeddings
		await this.deleteContentChunks(sourceType, sourceId);
		if (sourceType === "record") {
			await this.deleteRecordEmbedding(sourceId);
		}

		// Process new content
		await this.processContent(sourceType, sourceId, projectId, newContent);
	}
}

/**
 * Create an AI search service instance
 */
export function createAISearchService(
	supabase: SupabaseClient<Database>,
	embeddingProvider: EmbeddingProvider,
	embeddingModel: string = "text-embedding-3-small"
): AISearchService {
	return new AISearchService(supabase, embeddingProvider, embeddingModel);
}
