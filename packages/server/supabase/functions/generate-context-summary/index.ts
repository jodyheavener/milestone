import "@supabase/functions-js";
import { type Json, ServiceError } from "@milestone/shared";
import { Hono, z } from "@/lib";
import { getServiceClient, getUserClient } from "@/lib";
import { getAuthHeader, getUserOrThrow } from "@/lib";
import { handleRequest, json, logger, withCORS } from "@/lib";
import { getOpenaiClient } from "@/lib";

const app = new Hono();

// Validation schema
const GenerateSummarySchema = z.object({
	contextEntryId: z.string().uuid(),
	title: z.string().optional(),
	content: z.string().min(1),
	projectIds: z.array(z.string().uuid()).optional().default([]),
});

// Preflight
app.options("*", () => new Response(null, { status: 204 }));

/**
 * Generate summary for a manual context entry
 */
app.post(
	"/generate-context-summary",
	handleRequest(async (c, requestId) => {
		// Auth as user
		const sbUserClient = getUserClient(getAuthHeader(c.req.raw));
		const user = await getUserOrThrow(sbUserClient);

		// Validate input
		const body = await c.req.json();
		const input = GenerateSummarySchema.parse(body);

		logger.info("Generate context summary", {
			userId: user.id,
			contextEntryId: input.contextEntryId,
		});

		// Verify context entry belongs to user
		const { data: contextEntry, error: contextError } = await sbUserClient
			.from("context_entry")
			.select("id, title, content, user_id")
			.eq("id", input.contextEntryId)
			.single();

		if (contextError || !contextEntry || contextEntry.user_id !== user.id) {
			throw new ServiceError("NOT_FOUND", {
				debugInfo: "Context entry not found",
			});
		}

		// Generate summary using OpenAI
		const maxInputLength = 80000;
		const truncatedContent = input.content.length > maxInputLength
			? input.content.substring(0, maxInputLength) + "..."
			: input.content;

		let summaryContent: {
			tldr?: string;
			key_takeaways?: string[];
			metrics?: Json;
		} = {};

		try {
			const systemPrompt =
				"You are a helpful assistant that analyzes and summarizes content. Your task is to create a comprehensive summary that captures the key information, main topics, and important details.";

			const userPrompt = `Please analyze the following content${
				input.title ? ` titled "${input.title}"` : ""
			}:\n\n${truncatedContent}\n\nGenerate a concise summary (maximum 1000 characters) that captures the main points and key information.`;

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
						name: "context_summary",
						schema: {
							type: "object",
							properties: {
								summary: {
									type: "string",
									description:
										"A comprehensive summary of the content that captures the main topics, key information, and important details (maximum 1000 characters)",
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
			summaryContent = {
				tldr: result.summary || truncatedContent.substring(0, 500),
				key_takeaways: [],
			};
		} catch (error) {
			logger.error("Failed to generate summary", {
				userId: user.id,
				contextEntryId: input.contextEntryId,
				error: error instanceof Error
					? { message: error.message, stack: error.stack }
					: String(error),
			});
			// Fallback to truncated content
			summaryContent = {
				tldr: truncatedContent.substring(0, 500) +
					(truncatedContent.length > 500 ? "..." : ""),
				key_takeaways: [],
			};
		}

		// Compute prompt hash
		const systemPrompt =
			"You are a helpful assistant that analyzes and summarizes content.";
		const userPrompt = `Please analyze the following content${
			input.title ? ` titled "${input.title}"` : ""
		}:\n\n${truncatedContent}\n\nGenerate a concise summary.`;
		const promptText = systemPrompt + userPrompt;
		const promptHashBuffer = await crypto.subtle.digest(
			"SHA-256",
			new TextEncoder().encode(promptText),
		);
		const promptHashBytes = new Uint8Array(promptHashBuffer);
		const promptHashHex = `\\x${
			Array.from(promptHashBytes).map((b) => b.toString(16).padStart(2, "0"))
				.join("")
		}`;

		// Store summary in record table using service client
		const sbServiceClient = getServiceClient();
		const { error: recordError } = await sbServiceClient
			.from("record")
			.insert({
				user_id: user.id,
				context_entry_id: input.contextEntryId,
				projects: input.projectIds || [],
				content: summaryContent,
				model_name: "gpt-4o-mini",
				prompt_hash: promptHashHex,
				tokens_in: 0, // TODO: Get from OpenAI response
				tokens_out: 0, // TODO: Get from OpenAI response
			});

		if (recordError) {
			logger.error("Failed to insert record", {
				userId: user.id,
				contextEntryId: input.contextEntryId,
				error: recordError,
			});
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: "Failed to store summary",
			});
		}

		logger.info("Summary generated successfully", {
			userId: user.id,
			contextEntryId: input.contextEntryId,
		});

		return json({
			success: true,
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
