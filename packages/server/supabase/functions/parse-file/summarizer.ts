import { getOpenaiClient, logger } from "@/lib";

/**
 * Generates a title and summary of extracted text using OpenAI
 */
export async function generateTitleAndSummary(
	text: string,
	mimeType: string,
	fileName?: string,
): Promise<{ title: string; summary: string }> {
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
						"You are a helpful assistant that analyzes extracted text from files. Generate a concise title and summary for the content.",
					role: "system",
				},
				{
					content:
						`Please analyze the following text extracted from a ${mimeType} file${
							fileName ? ` named "${fileName}"` : ""
						}:\n\n${truncatedText}\n\nGenerate a descriptive title (maximum 100 characters) and a concise summary (maximum 1000 characters) for this content.`,
					role: "user",
				},
			],
			model: "gpt-4o-mini",
			text: {
				format: {
					name: "file_title_and_summary",
					schema: {
						type: "object",
						properties: {
							title: {
								type: "string",
								description:
									"A concise, descriptive title for the file content (maximum 100 characters)",
								maxLength: 100,
							},
							summary: {
								type: "string",
								description:
									"A concise summary of the extracted text content (maximum 1000 characters)",
								maxLength: 1000,
							},
						},
						required: ["title", "summary"],
						additionalProperties: false,
					},
					type: "json_schema",
				},
			},
		});

		const result = JSON.parse(response.output_text || "{}");
		return {
			title: result.title ||
				(fileName ? fileName.replace(/\.[^/.]+$/, "") : "Untitled Document"),
			summary: result.summary || truncatedText.substring(0, 500),
		};
	} catch (error) {
		logger.error("OpenAI API error", { error });
		// Fallback to naive title and summary
		const fallbackTitle = fileName
			? fileName.replace(/\.[^/.]+$/, "")
			: "Untitled Document";
		return {
			title: fallbackTitle,
			summary: truncatedText.substring(0, 500) +
				(truncatedText.length > 500 ? "..." : ""),
		};
	}
}

/**
 * Generates a concise summary of extracted text using OpenAI
 * @deprecated Use generateTitleAndSummary instead
 */
export async function generateSummary(
	text: string,
	mimeType: string,
): Promise<string> {
	const result = await generateTitleAndSummary(text, mimeType);
	return result.summary;
}
