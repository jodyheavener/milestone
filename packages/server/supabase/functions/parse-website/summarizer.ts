import { getOpenaiClient, logger } from "@/lib";

/**
 * Generates a concise summary of extracted web page content using OpenAI
 */
export async function generateWebsiteSummary(
	content: string,
	pageTitle?: string,
): Promise<string> {
	const maxInputLength = 80000; // Cap at ~80k chars
	const truncatedContent = content.length > maxInputLength
		? content.substring(0, maxInputLength) + "..."
		: content;

	try {
		const systemPrompt =
			`You are a helpful assistant that analyzes and summarizes web page content. Your task is to create a concise, informative summary that captures the key information, main topics, and important details from the webpage content. Focus on:

1. Main topics and themes
2. Key information and facts
3. Important details or insights
4. Any notable conclusions or recommendations

Write the summary in a clear, professional tone that would be useful for someone who wants to understand the webpage's content without reading it in full.`;

		const userPrompt = pageTitle
			? `Please analyze and summarize the following web page content from "${pageTitle}":\n\n${truncatedContent}`
			: `Please analyze and summarize the following web page content:\n\n${truncatedContent}`;

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
					name: "website_summary",
					schema: {
						type: "object",
						properties: {
							summary: {
								type: "string",
								description:
									"A comprehensive summary of the web page content that captures the main topics, key information, and important details (maximum 1000 characters)",
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
		return result.summary || truncatedContent.substring(0, 500);
	} catch (error) {
		logger.error("OpenAI API error for website summary", { error });
		// Fallback to naive summary
		return (
			truncatedContent.substring(0, 500) +
			(truncatedContent.length > 500 ? "..." : "")
		);
	}
}
