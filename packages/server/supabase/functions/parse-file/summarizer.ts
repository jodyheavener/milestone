import { getOpenaiClient, logger } from "~/library";

/**
 * Generates a concise summary of extracted text using OpenAI
 */
export async function generateSummary(
	text: string,
	mimeType: string,
): Promise<string> {
	const maxInputLength = 80000; // Cap at ~80k chars
	const truncatedText = text.length > maxInputLength
		? text.substring(0, maxInputLength) + "..."
		: text;

	try {
		const client = getOpenaiClient();
		const response = await client.responses.create({
			input: [
				{
					content:
						"You are a helpful assistant that summarizes extracted text from files. Provide a concise summary of the content.",
					role: "system",
				},
				{
					content:
						`Please summarize the following text extracted from a ${mimeType} file:\n\n${truncatedText}`,
					role: "user",
				},
			],
			model: "gpt-4o-mini",
			text: {
				format: {
					name: "file_summary",
					schema: {
						type: "object",
						properties: {
							summary: {
								type: "string",
								description:
									"A concise summary of the extracted text content (maximum 1000 characters)",
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
		return result.summary || truncatedText.substring(0, 500);
	} catch (error) {
		logger.error("OpenAI API error", { error });
		// Fallback to naive summary
		return (
			truncatedText.substring(0, 500) +
			(truncatedText.length > 500 ? "..." : "")
		);
	}
}
