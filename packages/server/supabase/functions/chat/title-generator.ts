import { getOpenaiClient, logger } from "@/lib";

/**
 * Generates a conversation title based on the first user message and assistant response
 */
export async function generateConversationTitle(
	userMessage: string,
	assistantResponse: string,
): Promise<string | null> {
	try {
		const openai = getOpenaiClient();
		const response = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content:
						"You are a helpful assistant that generates concise, descriptive titles for conversations. Generate a title that captures the main topic or question from the first exchange. The title should be 3-6 words maximum.",
				},
				{
					role: "user",
					content:
						`User: ${userMessage}\n\nAssistant: ${assistantResponse}\n\nGenerate a concise title for this conversation:`,
				},
			],
			temperature: 0.7,
			max_tokens: 20,
		});

		const title = response.choices[0]?.message?.content?.trim() || null;

		if (!title) {
			return "New Conversation";
		}

		// Clean up title - remove quotes if present
		return title.replace(/^["']|["']$/g, "");
	} catch (error) {
		logger.error("Failed to generate conversation title", { error });
		return "New Conversation";
	}
}
