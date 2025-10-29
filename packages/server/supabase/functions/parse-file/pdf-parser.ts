import { extractText } from "unpdf";
import { normalizeText } from "./utils.ts";

/**
 * Extracts text content from PDF files
 * @param fileBuffer - PDF file as Uint8Array
 * @returns Extracted and normalized text
 */
export async function extractTextFromPDF(
	fileBuffer: Uint8Array
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
		console.error("PDF extraction error:", error);
		throw new Error("Failed to extract text from PDF");
	}
}
