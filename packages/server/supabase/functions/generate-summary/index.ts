import "@supabase/functions-js";
import { Hono, z } from "@/lib";
import { getUserClient } from "@/lib";
import { getAuthHeader, getUserOrThrow } from "@/lib";
import { handleRequest, json, logger, withCORS } from "@/lib";
import { getOpenaiClient } from "@/lib";

const app = new Hono();

// Validation schema
const GenerateSummarySchema = z.object({
	title: z.string().optional(),
	content: z.string().min(1),
});

// Preflight
app.options("*", () => new Response(null, { status: 204 }));

/**
 * Generate a summary for manual context entry content
 */
app.post(
	"/generate-summary",
	handleRequest(async (c, requestId) => {
		// Auth as user
		const sbUserClient = getUserClient(getAuthHeader(c.req.raw));
		const user = await getUserOrThrow(sbUserClient);

		// Validate input
		const body = await c.req.json();
		const input = GenerateSummarySchema.parse(body);

		logger.info("Generate summary for manual entry", {
			userId: user.id,
			contentLength: input.content.length,
		});

		// Generate summary using OpenAI
		let summary: string;
		try {
			const maxInputLength = 80000; // Cap at ~80k chars
			const truncatedContent = input.content.length > maxInputLength
				? input.content.substring(0, maxInputLength) + "..."
				: input.content;

			const systemPrompt =
				"You are a helpful assistant that analyzes and summarizes content. Your task is to create a comprehensive summary that captures the key information, main topics, and important details from the content.";

			const userPrompt = input.title
				? `Please analyze the following content titled "${input.title}":\n\n${truncatedContent}\n\nGenerate a comprehensive summary (maximum 1000 characters) that captures the main topics, key information, and important details.`
				: `Please analyze the following content:\n\n${truncatedContent}\n\nGenerate a comprehensive summary (maximum 1000 characters) that captures the main topics, key information, and important details.`;

			const client = getOpenaiClient();
			const response = await client.responses.create({
				input: [
					{
						content: systemPrompt,
						role: "system",
					},
					{
						content: userPrompt,
						role: "user",
					},
				],
				model: "gpt-4o-mini",
				text: {
					format: {
						name: "manual_entry_summary",
						schema: {
							type: "object",
							properties: {
								summary: {
									type: "string",
									description:
										"A comprehensive summary that captures the main topics, key information, and important details (maximum 1000 characters)",
									maxLength: 1000,
								},
							},
							required: ["summary"],
							additionalProperties: false,
						},
						type: "json_schema",
					},
				},
			});

			const result = JSON.parse(response.output_text || "{}");
			summary = result.summary || truncatedContent.substring(0, 500);
		} catch (error) {
			logger.error("Failed to generate summary", {
				userId: user.id,
				error: error instanceof Error
					? { message: error.message, stack: error.stack }
					: String(error),
			});
			// Fallback to truncated content
			summary = input.content.substring(0, 500) +
				(input.content.length > 500 ? "..." : "");
		}

		logger.info("Summary generated successfully", {
			userId: user.id,
			summaryLength: summary.length,
		});

		return json({
			summary,
			requestId,
		});
	}),
);

export default {
	fetch: async (req: Request) => {
		const res = await app.fetch(req);
		return withCORS()(req, res);
	},
};
