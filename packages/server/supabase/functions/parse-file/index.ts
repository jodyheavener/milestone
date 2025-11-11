import "@supabase/functions-js";
import { ServiceError } from "@milestone/shared";
import { Hono, z } from "@/lib";
import { getServiceClient, getUserClient } from "@/lib";
import { getAuthHeader, getUserOrThrow } from "@/lib";
import { handleRequest, json, logger, withCORS } from "@/lib";
import { downloadFile, extractTextFromFile } from "./extraction.ts";
import { generateTitleAndSummary } from "./summarizer.ts";

/**
 * Computes SHA-256 hash of content as bytea
 */
async function computeContentHash(content: Uint8Array): Promise<Uint8Array> {
	// Ensure we have an ArrayBuffer for crypto.subtle.digest
	const buffer = new Uint8Array(content).buffer;
	const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
	return new Uint8Array(hashBuffer);
}

/**
 * Computes SHA-256 hash and returns as hex string
 */
async function computeSha256Hex(content: Uint8Array): Promise<string> {
	// Ensure we have an ArrayBuffer for crypto.subtle.digest
	const buffer = new Uint8Array(content).buffer;
	const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const app = new Hono();

// Validation schema
const ParseFileSchema = z.object({
	storagePath: z.string().min(1),
});

// Preflight
app.options("*", () => new Response(null, { status: 204 }));

/**
 * Parse file from storage and extract text content
 * Supports PDF, images, and CSV files
 * Returns extracted text and AI-generated summary
 */
app.post(
	"/parse-file",
	handleRequest(async (c, requestId) => {
		// Auth as user
		const sbUserClient = getUserClient(getAuthHeader(c.req.raw));
		const user = await getUserOrThrow(sbUserClient);

		// Validate input
		const body = await c.req.json();
		const input = ParseFileSchema.parse(body);

		logger.info("Parse file", {
			userId: user.id,
			storagePath: input.storagePath,
		});

		// Validate storage path belongs to user
		if (!input.storagePath.startsWith(`${user.id}/`)) {
			throw new ServiceError("UNAUTHORIZED", {
				debugInfo: "Storage path does not belong to user",
			});
		}

		// Download file and get mime type
		let buffer: Uint8Array;
		let mimeType: string;
		try {
			const downloadResult = await downloadFile(input.storagePath);
			buffer = downloadResult.buffer;
			mimeType = downloadResult.mimeType;
		} catch (error) {
			logger.error("Failed to download file", {
				userId: user.id,
				storagePath: input.storagePath,
				error: error instanceof Error
					? { message: error.message, stack: error.stack }
					: String(error),
			});
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: "Failed to download file",
			});
		}

		// Extract text based on mime type
		let extractionResult;
		try {
			extractionResult = await extractTextFromFile(buffer, mimeType);
		} catch (error) {
			logger.error("Failed to extract text from file", {
				userId: user.id,
				storagePath: input.storagePath,
				mimeType,
				error: error instanceof Error
					? { message: error.message, stack: error.stack }
					: String(error),
			});
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: "Failed to extract text from file",
			});
		}

		// Clear buffer from memory after extraction
		buffer = new Uint8Array(0);

		// Extract filename from storage path
		const fileName = input.storagePath.split("/").pop() || "unknown";
		const originalFileName = fileName.replace(/^\d+-/, ""); // Remove timestamp prefix if present

		// Compute SHA256 hash of file content
		const sha256 = await computeSha256Hex(buffer);

		// Use service client to store file data (bypasses RLS)
		const sbServiceClient = getServiceClient();

		// Check if file already exists by SHA256
		const { data: existingFile } = await sbServiceClient
			.from("file")
			.select("id")
			.eq("sha256", sha256)
			.single();

		let fileId: string;
		if (existingFile) {
			fileId = existingFile.id;
			// Update storage_path to the current one (same file can be uploaded with different paths)
			await sbServiceClient
				.from("file")
				.update({ storage_path: input.storagePath })
				.eq("id", fileId);
			logger.info("File already exists, updated storage path", {
				userId: user.id,
				storagePath: input.storagePath,
				fileId,
			});
		} else {
			// Insert file record
			const { data: file, error: fileError } = await sbServiceClient
				.from("file")
				.insert({
					sha256,
					storage_path: input.storagePath,
					mime_type: mimeType,
					byte_size: buffer.length,
					original_filename: originalFileName,
					source: "user_upload",
					uploaded_by: user.id,
				})
				.select("id")
				.single();

			if (fileError) {
				logger.error("Failed to insert file", {
					userId: user.id,
					storagePath: input.storagePath,
					error: fileError,
				});
				throw new ServiceError("INTERNAL_ERROR", {
					debugInfo: "Failed to store file data",
				});
			}

			fileId = file.id;
			logger.info("File stored", {
				userId: user.id,
				storagePath: input.storagePath,
				fileId,
			});
		}

		// Generate title and summary using OpenAI
		let title: string;
		let summaryContent: {
			executive_md?: string;
			detailed_md?: string;
			facts_md?: string;
		} = {};
		try {
			const titleAndSummary = await generateTitleAndSummary(
				extractionResult.text,
				mimeType,
				originalFileName,
			);
			title = titleAndSummary.title;
			// Store summary in structured format
			summaryContent = {
				executive_md: titleAndSummary.summary,
				detailed_md: titleAndSummary.summary,
			};
		} catch (error) {
			logger.error("Failed to generate title and summary", {
				userId: user.id,
				storagePath: input.storagePath,
				error: error instanceof Error
					? { message: error.message, stack: error.stack }
					: String(error),
			});
			// Continue with fallback title
			title = originalFileName
				? originalFileName.replace(/\.[^/.]+$/, "")
				: "Untitled Document";
			summaryContent = {
				executive_md: "",
				detailed_md: "",
			};
		}

		// Compute source checksum and prompt hash
		// Use a truncated version for checksum to save memory (first 100k chars should be enough for uniqueness)
		const textForChecksum = extractionResult.text.length > 100000
			? extractionResult.text.substring(0, 100000)
			: extractionResult.text;
		const sourceChecksum = await computeSha256Hex(
			new TextEncoder().encode(textForChecksum),
		);
		const systemPrompt =
			"You are a helpful assistant that analyzes extracted text from files.";
		const userPrompt =
			`Please analyze the following text extracted from a ${mimeType} file${
				originalFileName ? ` named "${originalFileName}"` : ""
			}:\n\n${
				extractionResult.text.substring(0, 80000)
			}\n\nGenerate a descriptive title and a concise summary.`;
		const promptHashBytes = await computeContentHash(
			new TextEncoder().encode(systemPrompt + userPrompt),
		);
		const promptHashHex = `\\x${
			Array.from(promptHashBytes).map((b) => b.toString(16).padStart(2, "0"))
				.join("")
		}`;

		// Store summary in summary table (only if it doesn't already exist)
		const { data: existingSummary, error: summaryCheckError } = await sbServiceClient
			.from("summary")
			.select("id")
			.eq("file_id", fileId)
			.eq("version", 1)
			.maybeSingle();

		// If summary doesn't exist (or check failed), create it
		if (!existingSummary && !summaryCheckError) {
			const { error: summaryError } = await sbServiceClient
				.from("summary")
				.insert({
					file_id: fileId,
					version: 1,
					status: "final",
					executive_md: summaryContent.executive_md || "",
					detailed_md: summaryContent.detailed_md || "",
					source_checksum: sourceChecksum,
					prompt_version: "v1",
					model: "gpt-4o-mini",
					created_by: user.id,
				})
				.select("id")
				.single();

			if (summaryError) {
				logger.error("Failed to insert summary", {
					userId: user.id,
					storagePath: input.storagePath,
					error: summaryError,
				});
				// Don't fail the request if summary insertion fails
			}
		} else {
			logger.info("Summary already exists for file", {
				userId: user.id,
				storagePath: input.storagePath,
				fileId,
			});
		}

		// Store record for context entry linking
		const { error: recordError } = await sbServiceClient
			.from("record")
			.insert({
				user_id: user.id,
				file_id: fileId,
				content: {
					tldr: summaryContent.executive_md || "",
					key_takeaways: [],
				},
				model_name: "gpt-4o-mini",
				prompt_hash: promptHashHex,
				tokens_in: 0, // TODO: Get from OpenAI response
				tokens_out: 0, // TODO: Get from OpenAI response
			});

		if (recordError) {
			logger.error("Failed to insert record", {
				userId: user.id,
				storagePath: input.storagePath,
				error: recordError,
			});
			// Don't fail the request if record insertion fails
		}

		// Create file_chunk records from extracted text
		// Check if chunks already exist for this file
		const { data: existingChunks } = await sbServiceClient
			.from("file_chunk")
			.select("id")
			.eq("file_id", fileId)
			.limit(1);

		// Only create chunks if they don't already exist
		// Skip chunk creation for very large files to avoid CPU timeout - they'll be chunked during indexing
		const maxTextLengthForChunking = 200000; // 200k chars max to avoid timeout
		if ((!existingChunks || existingChunks.length === 0) && 
			extractionResult.text.trim().length > 0 &&
			extractionResult.text.length <= maxTextLengthForChunking) {
			try {
				const textToChunk = extractionResult.text;

				// Use a reasonable default chunk size (1000 chars with 200 overlap)
				// These will be re-chunked with project-specific settings when indexed
				const chunkSize = 1000;
				const chunkOverlap = 200;
				const batchSize = 200; // Larger batches for faster insertion

				// Process chunks in batches to avoid loading everything into memory
				let chunkIndex = 0;
				let start = 0;
				let batch: Array<{ file_id: string; chunk_index: number; content_text: string; token_count: null }> = [];

				while (start < textToChunk.length) {
					const end = Math.min(start + chunkSize, textToChunk.length);
					let chunk = textToChunk.slice(start, end);

					// Try to break at word boundaries if not at end
					if (end < textToChunk.length) {
						const lastSpaceIndex = chunk.lastIndexOf(" ");
						if (lastSpaceIndex > chunkSize * 0.5) {
							chunk = chunk.slice(0, lastSpaceIndex);
						}
					}

					if (chunk.trim().length > 0) {
						batch.push({
							file_id: fileId,
							chunk_index: chunkIndex,
							content_text: chunk.trim(),
							token_count: null,
						});
						chunkIndex++;
					}

					start += chunk.length - chunkOverlap;

					// Insert batch when it reaches batchSize
					if (batch.length >= batchSize) {
						const { error: batchError } = await sbServiceClient
							.from("file_chunk")
							.insert(batch);

						if (batchError) {
							logger.error("Failed to insert file chunk batch", {
								userId: user.id,
								storagePath: input.storagePath,
								fileId,
								batchStart: chunkIndex - batch.length,
								error: batchError,
							});
							// Continue with next batch even if one fails
						}

						// Clear batch from memory
						batch = [];
					}
				}

				// Insert remaining chunks
				if (batch.length > 0) {
					const { error: batchError } = await sbServiceClient
						.from("file_chunk")
						.insert(batch);

					if (batchError) {
						logger.error("Failed to insert final file chunk batch", {
							userId: user.id,
							storagePath: input.storagePath,
							fileId,
							error: batchError,
						});
					}
				}

				if (chunkIndex > 0) {
					logger.info("File chunks created", {
						userId: user.id,
						storagePath: input.storagePath,
						fileId,
						chunkCount: chunkIndex,
					});
				}
			} catch (chunkError) {
				logger.error("Error creating file chunks", {
					userId: user.id,
					storagePath: input.storagePath,
					fileId,
					error: chunkError instanceof Error
						? { message: chunkError.message, stack: chunkError.stack }
						: String(chunkError),
				});
				// Don't fail the request if chunk creation fails
			}
		} else if (extractionResult.text.length > maxTextLengthForChunking) {
			logger.info("Skipping chunk creation for large file - will be chunked during indexing", {
				userId: user.id,
				storagePath: input.storagePath,
				fileId,
				textLength: extractionResult.text.length,
			});
		}

		logger.info("File parsed successfully", {
			userId: user.id,
			storagePath: input.storagePath,
			parser: extractionResult.parser,
			textLength: extractionResult.text.length,
			fileId,
		});

		// Only return the title (not the summary)
		const response = {
			title,
			...(extractionResult.date && { date: extractionResult.date }),
			requestId,
		};

		return json(response);
	}),
);

export default {
	fetch: async (req: Request) => {
		const res = await app.fetch(req);
		return withCORS()(req, res);
	},
};
