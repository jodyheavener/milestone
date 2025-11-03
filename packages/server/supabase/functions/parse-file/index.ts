import "@supabase/functions-js";
import { Hono, z } from "@/lib";
import { getUserClient } from "@/lib";
import { getAuthHeader, getUserOrThrow } from "@/lib";
import { handleRequest, json, logger, withCORS } from "@/lib";
import { ServiceError } from "@milestone/shared";
import { generateSummary } from "./summarizer.ts";
import { downloadFile, extractTextFromFile } from "./extraction.ts";

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
		const { buffer, mimeType } = await downloadFile(input.storagePath);

		// Extract text based on mime type
		const extractionResult = await extractTextFromFile(buffer, mimeType);

		// Generate summary using OpenAI
		const summary = await generateSummary(extractionResult.text, mimeType);

		const response = {
			extractedText: extractionResult.text,
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
