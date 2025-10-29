import { openaiClient } from "~/library";
import { normalizeText, uint8ArrayToBase64 } from "./utils.ts";

export interface ImageExtractionResult {
	text: string;
	date: string | null;
}

export async function extractTextFromImage(
	fileBuffer: Uint8Array,
	mimeType: string,
): Promise<ImageExtractionResult> {
	try {
		// Convert Uint8Array to base64 for OpenAI Vision API
		const base64Image = uint8ArrayToBase64(fileBuffer);

		const response = await openaiClient.responses.create({
			model: "gpt-4o",
			input: [
				{
					content: [
						{
							type: "input_text",
							text:
								"Extract all visible text from this image. Do not infer or guess any information. If text is unreadable or unclear, use the token '[UNREADABLE]'. Return only the extracted text without any additional commentary or formatting.",
						},
						{
							type: "input_image",
							image_url: `data:${mimeType};base64,${base64Image}`,
							detail: "high",
						},
					],
					role: "user",
				},
			],
			text: {
				format: {
					name: "image_text_extraction",
					schema: {
						type: "object",
						properties: {
							extracted_text: {
								type: "string",
								description:
									"All visible text extracted from the image. Use '[UNREADABLE]' for unclear text. Do not infer or guess.",
							},
							date: {
								type: ["string", "null"],
								description:
									"Date found in the image (from EXIF data, visible date text, or filename). Use null if no date is found. Do not infer or guess.",
							},
						},
						required: ["extracted_text", "date"],
						additionalProperties: false,
					},
					type: "json_schema",
				},
			},
		});

		const result = JSON.parse(response.output_text || "{}");
		return {
			text: normalizeText(result.extracted_text || ""),
			date: result.date || null,
		};
	} catch (error) {
		console.error("OpenAI Vision API error:", error);
		throw new Error("Failed to extract text from image");
	}
}
