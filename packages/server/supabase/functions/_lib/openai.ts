import OpenAI from "openai";
import { config } from "./config.ts";

let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client instance
 */
export function getOpenaiClient(): OpenAI {
	if (!openaiClient) {
		const apiKey = config("OPENAI_API_KEY")!;
		openaiClient = new OpenAI({
			apiKey,
		});
	}

	return openaiClient;
}
