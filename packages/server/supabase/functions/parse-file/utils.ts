/**
 * Text normalization utilities for file parsing
 */

/**
 * Normalizes extracted text by cleaning up whitespace and formatting
 * @param text - Raw text to normalize
 * @returns Cleaned and normalized text
 */
export function normalizeText(text: string): string {
	return text
		.trim()
		.replace(/\s+/g, " ") // Collapse multiple whitespace
		.replace(/\n\s*\n/g, "\n") // Remove empty lines
		.replace(/^\s+|\s+$/gm, "") // Trim each line
		.replace(/\u00A0/g, " ") // Replace non-breaking spaces
		.replace(/[\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, " "); // Replace various Unicode spaces
}

/**
 * Converts Uint8Array to base64 string for API calls
 * @param buffer - Binary data as Uint8Array
 * @returns Base64 encoded string
 */
export function uint8ArrayToBase64(buffer: Uint8Array): string {
	const binaryString = Array.from(buffer, (byte) => String.fromCharCode(byte))
		.join("");
	return btoa(binaryString);
}
