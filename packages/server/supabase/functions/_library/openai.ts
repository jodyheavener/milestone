import OpenAI from "openai";
import { env } from "./env.ts";

let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client instance
 */
export function getOpenaiClient(): OpenAI {
	if (!openaiClient) {
		const apiKey = env("OPENAI_API_KEY")!;
		openaiClient = new OpenAI({
			apiKey,
		});
	}

	return openaiClient;
}
