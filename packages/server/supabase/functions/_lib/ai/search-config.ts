import type { Database, Json } from "@milestone/shared";

export type SearchConfig = Database["public"]["Tables"]["search_config"]["Row"];
export type SearchConfigInsert =
	Database["public"]["Tables"]["search_config"]["Insert"];
export type SearchConfigUpdate =
	Database["public"]["Tables"]["search_config"]["Update"];

export interface SearchConfigOptions {
	embeddingModel?: string;
	embeddingDim?: number;
	chunkSize?: number;
	chunkOverlap?: number;
	rerankModel?: string | null;
	filters?: Json;
}

export const DEFAULT_SEARCH_CONFIG: Required<SearchConfigOptions> = {
	embeddingModel: "text-embedding-3-small",
	embeddingDim: 1536,
	chunkSize: 1000,
	chunkOverlap: 200,
	rerankModel: null,
	filters: {},
};

export function createSearchConfig(
	projectId: string,
	options: SearchConfigOptions = {},
): SearchConfigInsert {
	return {
		project_id: projectId,
		embedding_model: options.embeddingModel ??
			DEFAULT_SEARCH_CONFIG.embeddingModel,
		embedding_dim: options.embeddingDim ?? DEFAULT_SEARCH_CONFIG.embeddingDim,
		chunk_size: options.chunkSize ?? DEFAULT_SEARCH_CONFIG.chunkSize,
		chunk_overlap: options.chunkOverlap ?? DEFAULT_SEARCH_CONFIG.chunkOverlap,
		rerank_model: options.rerankModel ?? DEFAULT_SEARCH_CONFIG.rerankModel,
		filters: options.filters ?? DEFAULT_SEARCH_CONFIG.filters,
	};
}

export function validateSearchConfig(config: SearchConfigOptions): string[] {
	const errors: string[] = [];

	if (config.embeddingDim && config.embeddingDim <= 0) {
		errors.push("Embedding dimension must be positive");
	}

	if (config.chunkSize && config.chunkSize <= 0) {
		errors.push("Chunk size must be positive");
	}

	if (config.chunkOverlap && config.chunkOverlap < 0) {
		errors.push("Chunk overlap must be non-negative");
	}

	if (
		config.chunkSize &&
		config.chunkOverlap &&
		config.chunkOverlap >= config.chunkSize
	) {
		errors.push("Chunk overlap must be less than chunk size");
	}

	return errors;
}
