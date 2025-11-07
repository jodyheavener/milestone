import { getOpenaiClient, logger } from "@/lib";

/**
 * Generates a title and summary of extracted web page content using OpenAI
 */
export async function generateWebsiteTitleAndSummary(
	content: string,
	pageTitle?: string,
	url?: string,
): Promise<{ title: string; summary: string }> {
	const maxInputLength = 80000; // Cap at ~80k chars
	const truncatedContent = content.length > maxInputLength
		? content.substring(0, maxInputLength) + "..."
		: content;

	try {
		const systemPrompt =
			`You are a helpful assistant that analyzes and summarizes web page content. Your task is to create a concise, descriptive title and a comprehensive summary that captures the key information, main topics, and important details from the webpage content.`;

		const userPrompt = pageTitle
			? `Please analyze the following web page content from "${pageTitle}":\n\n${truncatedContent}\n\nGenerate a descriptive title (maximum 100 characters, prefer using or improving the page title if it's good) and a comprehensive summary (maximum 1000 characters) for this content.`
			: `Please analyze the following web page content${
				url ? ` from ${url}` : ""
			}:\n\n${truncatedContent}\n\nGenerate a descriptive title (maximum 100 characters) and a comprehensive summary (maximum 1000 characters) for this content.`;

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
					name: "website_title_and_summary",
					schema: {
						type: "object",
						properties: {
							title: {
								type: "string",
								description:
									"A concise, descriptive title for the web page (maximum 100 characters). Prefer using or improving the page title if provided.",
								maxLength: 100,
							},
							summary: {
								type: "string",
								description:
									"A comprehensive summary of the web page content that captures the main topics, key information, and important details (maximum 1000 characters)",
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
			title: result.title || pageTitle || "Untitled Page",
			summary: result.summary || truncatedContent.substring(0, 500),
		};
	} catch (error) {
		logger.error("OpenAI API error for website title and summary", { error });
		// Fallback to page title or naive title and summary
		return {
			title: pageTitle || "Untitled Page",
			summary: truncatedContent.substring(0, 500) +
				(truncatedContent.length > 500 ? "..." : ""),
		};
	}
}

/**
 * Generates a concise summary of extracted web page content using OpenAI
 * @deprecated Use generateWebsiteTitleAndSummary instead
 */
export async function generateWebsiteSummary(
	content: string,
	pageTitle?: string,
): Promise<string> {
	const result = await generateWebsiteTitleAndSummary(content, pageTitle);
	return result.summary;
}
