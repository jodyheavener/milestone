import { getOpenaiClient, logger } from "./index.ts";

interface GenerateTitleOptions {
	userMessage: string;
	assistantResponse?: string;
	projectGoal?: string;
	maxLength?: number;
}

/**
 * Generates a conversation title based on user message and optional context
 * Can use assistant response or project goal to generate more contextual titles
 */
export async function generateConversationTitle(
	options: GenerateTitleOptions
): Promise<string | null> {
	const {
		userMessage,
		assistantResponse,
		projectGoal,
		maxLength = 60,
	} = options;

	try {
		const openai = getOpenaiClient();

		// Build system prompt
		let systemPrompt =
			"You are a helpful assistant that generates concise, descriptive titles for conversations. Generate a title that captures the main topic or question from the conversation. ";
		systemPrompt += `The title should be ${Math.max(3, Math.floor(maxLength / 10))}-${Math.max(6, Math.floor(maxLength / 8))} words maximum.`;

		// Build user content
		let userContent = "";
		if (projectGoal) {
			userContent += `Project Goal: ${projectGoal}\n\n`;
		}
		userContent += `User: ${userMessage}`;
		if (assistantResponse) {
			userContent += `\n\nAssistant: ${assistantResponse}`;
		}
		userContent += "\n\nGenerate a concise title for this conversation:";

		const response = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
				{
					role: "user",
					content: userContent,
				},
			],
			temperature: 0.7,
			max_tokens: 20,
		});

		const title = response.choices[0]?.message?.content?.trim() || null;

		if (!title) {
			return "New Conversation";
		}

		// Clean up title - remove quotes if present and truncate if needed
		let cleanedTitle = title.replace(/^["']|["']$/g, "");
		if (cleanedTitle.length > maxLength) {
			cleanedTitle = cleanedTitle.substring(0, maxLength);
		}

		return cleanedTitle;
	} catch (error) {
		logger.error("Failed to generate conversation title", { error });
		return "New Conversation";
	}
}
