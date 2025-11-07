import "@supabase/functions-js";
import { ServiceError } from "@milestone/shared";
import { Hono, z } from "@/lib";
import { getUserClient } from "@/lib";
import { getAuthHeader, getUserOrThrow } from "@/lib";
import { handleRequest, json, logger, withCORS } from "@/lib";
import { downloadFile, extractTextFromFile } from "./extraction.ts";
import { generateTitleAndSummary } from "./summarizer.ts";

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

		// Extract filename from storage path for title generation
		const fileName = input.storagePath.split("/").pop() || undefined;

		// Generate title and summary using OpenAI
		let title: string;
		let summary: string;
		try {
			const titleAndSummary = await generateTitleAndSummary(
				extractionResult.text,
				mimeType,
				fileName,
			);
			title = titleAndSummary.title;
			summary = titleAndSummary.summary;
		} catch (error) {
			logger.error("Failed to generate title and summary", {
				userId: user.id,
				storagePath: input.storagePath,
				error: error instanceof Error
					? { message: error.message, stack: error.stack }
					: String(error),
			});
			// Continue with fallback title and summary rather than failing
			title = fileName
				? fileName.replace(/\.[^/.]+$/, "")
				: "Untitled Document";
			summary = "";
		}

		logger.info("File parsed successfully", {
			userId: user.id,
			storagePath: input.storagePath,
			parser: extractionResult.parser,
			textLength: extractionResult.text.length,
		});

		const response = {
			extractedText: extractionResult.text,
			title,
			summary,
			parser: extractionResult.parser,
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
