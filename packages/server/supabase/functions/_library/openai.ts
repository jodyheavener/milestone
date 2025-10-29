import { openai } from "./config.ts";
import OpenAI from "openai";

export const openaiClient = new OpenAI({
	apiKey: openai.apiKey,
});
