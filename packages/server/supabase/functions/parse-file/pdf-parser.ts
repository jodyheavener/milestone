import { extractText } from "unpdf";
import { logger } from "@/lib";
import { normalizeText } from "./utils.ts";

/**
 * Extracts text content from PDF files
 */
export async function extractTextFromPDF(
	fileBuffer: Uint8Array,
): Promise<string> {
	try {
		// unpdf expects Uint8Array, no Buffer conversion needed
		const result = await extractText(fileBuffer);

		// Handle both string and array cases
		const text = Array.isArray(result.text)
			? result.text.join("\n")
			: result.text;

		return normalizeText(text);
	} catch (error) {
		logger.error("PDF extraction error", { error });
		throw new Error("Failed to extract text from PDF");
	}
}
