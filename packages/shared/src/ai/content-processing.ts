import type { Database } from "../db-types";

export type ContentChunk = Database["public"]["Tables"]["content_chunk"]["Row"];
export type ContentChunkInsert =
	Database["public"]["Tables"]["content_chunk"]["Insert"];
export type RecordEmbedding =
	Database["public"]["Tables"]["record_embedding"]["Row"];
export type RecordEmbeddingInsert =
	Database["public"]["Tables"]["record_embedding"]["Insert"];

export type SourceType = "record" | "file" | "website";

export interface ChunkingOptions {
	chunkSize: number;
	chunkOverlap: number;
}

export interface ContentProcessingResult {
	chunks: ContentChunkInsert[];
	recordEmbedding: RecordEmbeddingInsert;
}

export interface EmbeddingProvider {
	generateEmbedding(text: string, model: string): Promise<number[]>;
}

/**
 * Chunks text content based on the provided options
 */
export function chunkText(text: string, options: ChunkingOptions): string[] {
	const { chunkSize, chunkOverlap } = options;
	const chunks: string[] = [];

	if (text.length <= chunkSize) {
		return [text];
	}

	let start = 0;
	while (start < text.length) {
		const end = Math.min(start + chunkSize, text.length);
		let chunk = text.slice(start, end);

		// Try to break at word boundaries if we're not at the end
		if (end < text.length) {
			const lastSpaceIndex = chunk.lastIndexOf(" ");
			if (lastSpaceIndex > chunkSize * 0.5) {
				// Only break at word if it's not too short
				chunk = chunk.slice(0, lastSpaceIndex);
			}
		}

		chunks.push(chunk.trim());
		start += chunk.length - chunkOverlap;
	}

	return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Creates content chunks for a given source
 */
export async function createContentChunks(
	sourceType: SourceType,
	sourceId: string,
	projectId: string,
	text: string,
	chunkingOptions: ChunkingOptions,
	embeddingProvider: EmbeddingProvider,
	embeddingModel: string
): Promise<ContentChunkInsert[]> {
	const chunks = chunkText(text, chunkingOptions);
	const chunkInserts: ContentChunkInsert[] = [];

	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		const embedding = await embeddingProvider.generateEmbedding(
			chunk,
			embeddingModel
		);

		chunkInserts.push({
			source_type: sourceType,
			source_id: sourceId,
			project_id: projectId,
			chunk_index: i,
			text: chunk,
			embedding: `[${embedding.join(",")}]`, // Convert array to PostgreSQL vector format
			model: embeddingModel,
		});
	}

	return chunkInserts;
}

/**
 * Creates a record embedding for the full content
 */
export async function createRecordEmbedding(
	recordId: string,
	projectId: string,
	content: string,
	embeddingProvider: EmbeddingProvider,
	embeddingModel: string
): Promise<RecordEmbeddingInsert> {
	const embedding = await embeddingProvider.generateEmbedding(
		content,
		embeddingModel
	);

	return {
		record_id: recordId,
		project_id: projectId,
		embedding: `[${embedding.join(",")}]`, // Convert array to PostgreSQL vector format
		model: embeddingModel,
	};
}

/**
 * Processes content for search - creates both chunks and record embedding
 */
export async function processContentForSearch(
	sourceType: SourceType,
	sourceId: string,
	projectId: string,
	content: string,
	chunkingOptions: ChunkingOptions,
	embeddingProvider: EmbeddingProvider,
	embeddingModel: string
): Promise<ContentProcessingResult> {
	const chunks = await createContentChunks(
		sourceType,
		sourceId,
		projectId,
		content,
		chunkingOptions,
		embeddingProvider,
		embeddingModel
	);

	const recordEmbedding = await createRecordEmbedding(
		sourceId, // For records, sourceId is the recordId
		projectId,
		content,
		embeddingProvider,
		embeddingModel
	);

	return {
		chunks,
		recordEmbedding,
	};
}

/**
 * Utility to clean and prepare text for chunking
 */
export function prepareTextForChunking(text: string): string {
	return text
		.replace(/\s+/g, " ") // Normalize whitespace
		.replace(/\n\s*\n/g, "\n") // Remove empty lines
		.trim();
}
