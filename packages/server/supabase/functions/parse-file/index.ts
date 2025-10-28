import "@supabase/functions-js";
import { ServiceError } from "@m/shared";
import { serveFunction, supabaseClient, openai } from "~/library";
import OpenAI from "openai";
import { extractText } from "npm:unpdf@^1";
import { parse } from "jsr:@std/csv@^1";

interface ParseFileRequest {
	storagePath: string;
}

interface ParseFileResponse {
	extractedText: string;
	summary: string;
	parser: string;
	date?: string | null;
}

// Text extraction utilities
async function extractTextFromPDF(fileBuffer: Uint8Array): Promise<string> {
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

async function extractTextFromImage(
	fileBuffer: Uint8Array,
	mimeType: string
): Promise<{ text: string; date: string | null }> {
	try {
		// Convert Uint8Array to base64 for OpenAI Vision API
		// Use a more reliable method that handles binary data properly
		const binaryString = Array.from(fileBuffer, (byte) =>
			String.fromCharCode(byte)
		).join("");
		const base64Image = btoa(binaryString);

		const client = new OpenAI({
			apiKey: openai.apiKey,
		});

		const response = await client.responses.create({
			input: [
				{
					content: [
						{
							type: "input_text",
							text: "Extract all visible text from this image. Do not infer or guess any information. If text is unreadable or unclear, use the token '[UNREADABLE]'. Return only the extracted text without any additional commentary or formatting.",
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
			model: "gpt-4o",
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

function extractTextFromCSV(fileBuffer: Uint8Array): string {
	try {
		const text = new TextDecoder().decode(fileBuffer);
		const records = parse(text, { skipFirstRow: true }) as Record<
			string,
			string
		>[];

		// Normalize header names and clean data
		const normalizedRecords = records.map((record) => {
			const normalized: Record<string, string> = {};
			Object.entries(record).forEach(([key, value]) => {
				const cleanKey = key.toLowerCase().trim().replace(/\s+/g, "_");
				const cleanValue = value?.trim() || "";
				normalized[cleanKey] = cleanValue;
			});
			return normalized;
		});

		// Convert to readable format
		const lines = normalizedRecords.map((record) =>
			Object.entries(record)
				.map(([key, value]) => `${key}: ${value}`)
				.join(" | ")
		);

		return normalizeText(lines.join("\n"));
	} catch (error) {
		console.error("CSV extraction error:", error);
		throw new Error("Failed to extract text from CSV");
	}
}

function normalizeText(text: string): string {
	return text
		.trim()
		.replace(/\s+/g, " ") // Collapse multiple whitespace
		.replace(/\n\s*\n/g, "\n") // Remove empty lines
		.replace(/^\s+|\s+$/gm, "") // Trim each line
		.replace(/\u00A0/g, " ") // Replace non-breaking spaces
		.replace(/[\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, " "); // Replace various Unicode spaces
}

async function generateSummary(
	text: string,
	mimeType: string
): Promise<string> {
	const maxInputLength = 80000; // Cap at ~80k chars
	const truncatedText =
		text.length > maxInputLength
			? text.substring(0, maxInputLength) + "..."
			: text;

	try {
		const client = new OpenAI({
			apiKey: openai.apiKey,
		});

		const response = await client.responses.create({
			input: [
				{
					content:
						"You are a helpful assistant that summarizes extracted text from files. Provide a concise summary of the content.",
					role: "system",
				},
				{
					content: `Please summarize the following text extracted from a ${mimeType} file:\n\n${truncatedText}`,
					role: "user",
				},
			],
			model: "gpt-4o-mini",
			text: {
				format: {
					name: "file_summary",
					schema: {
						type: "object",
						properties: {
							summary: {
								type: "string",
								description:
									"A concise summary of the extracted text content (maximum 1000 characters)",
								maxLength: 1000,
							},
						},
						required: ["summary"],
						additionalProperties: false,
					},
					type: "json_schema",
				},
			},
		});

		const result = JSON.parse(response.output_text || "{}");
		return result.summary || truncatedText.substring(0, 500);
	} catch (error) {
		console.error("OpenAI API error:", error);
		// Fallback to naive summary
		return (
			truncatedText.substring(0, 500) +
			(truncatedText.length > 500 ? "..." : "")
		);
	}
}

serveFunction(
	{
		methods: ["POST"],
		setCors: true,
		authed: true,
		args: ["storagePath"] as const,
	},
	async ({ args, user, respond }) => {
		const { storagePath } = args as ParseFileRequest;

		if (!user) {
			throw new ServiceError("UNAUTHORIZED");
		}

		// Validate storage path belongs to user
		if (!storagePath.startsWith(`${user.id}/`)) {
			throw new ServiceError("UNAUTHORIZED", {
				debugInfo: "Storage path does not belong to user",
			});
		}

		try {
			// Download file from storage
			const { data: fileData, error: downloadError } =
				await supabaseClient.storage.from("attachments").download(storagePath);

			if (downloadError) {
				throw new ServiceError("FILE_NOT_FOUND", {
					debugInfo: downloadError.message,
				});
			}

			// Convert to buffer
			const fileBuffer = new Uint8Array(await fileData.arrayBuffer());

			// Get file metadata to determine mime type
			const { data: fileInfo } = await supabaseClient.storage
				.from("attachments")
				.list(storagePath.split("/").slice(0, -1).join("/"), {
					search: storagePath.split("/").pop(),
				});

			const mimeType =
				fileInfo?.[0]?.metadata?.mimetype || "application/octet-stream";

			// Extract text based on mime type
			let extractedText = "";
			let parser = "";
			let extractedDate: string | null = null;

			if (mimeType === "application/pdf") {
				extractedText = await extractTextFromPDF(fileBuffer);
				parser = "unpdf";
			} else if (mimeType.startsWith("image/")) {
				const imageResult = await extractTextFromImage(fileBuffer, mimeType);
				extractedText = imageResult.text;
				extractedDate = imageResult.date;
				parser = "openai-vision";
			} else if (mimeType === "text/csv") {
				extractedText = extractTextFromCSV(fileBuffer);
				parser = "deno-std-csv";
			} else {
				throw new ServiceError("UNSUPPORTED_FILE_TYPE", {
					debugInfo: `Unsupported mime type: ${mimeType}`,
				});
			}

			// Generate summary using OpenAI
			const summary = await generateSummary(extractedText, mimeType);

			const response: ParseFileResponse = {
				extractedText,
				summary,
				parser,
				...(extractedDate !== null && { date: extractedDate }),
			};

			return respond(response);
		} catch (error) {
			if (error instanceof ServiceError) {
				throw error;
			}

			console.error("Parse file error:", error);
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
);
