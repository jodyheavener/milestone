import { getServiceClient } from "~/library";
import { ServiceError } from "@m/shared";
import { extractTextFromPDF } from "./pdf-parser.ts";
import { extractTextFromImage } from "./image-parser.ts";
import { extractTextFromCSV } from "./csv-parser.ts";

type ExtractionResult = {
	text: string;
	parser: string;
	date?: string;
};

/**
 * Download file from storage and determine mime type
 */
export async function downloadFile(
	storagePath: string,
): Promise<{ buffer: Uint8Array; mimeType: string }> {
	const sbServiceClient = getServiceClient();
	const { data: fileData, error: downloadError } = await sbServiceClient.storage
		.from("attachments").download(storagePath);

	if (downloadError) {
		throw new ServiceError("FILE_NOT_FOUND", {
			debugInfo: downloadError.message,
		});
	}

	// Convert to buffer
	const fileBuffer = new Uint8Array(await fileData.arrayBuffer());

	// Get file metadata to determine mime type
	const pathParts = storagePath.split("/");
	const { data: fileInfo } = await sbServiceClient.storage
		.from("attachments")
		.list(pathParts.slice(0, -1).join("/"), {
			search: pathParts[pathParts.length - 1],
		});

	const mimeType = fileInfo?.[0]?.metadata?.mimetype ||
		"application/octet-stream";

	return { buffer: fileBuffer, mimeType };
}

/**
 * Extract text from file based on mime type
 */
export async function extractTextFromFile(
	buffer: Uint8Array,
	mimeType: string,
): Promise<ExtractionResult> {
	if (mimeType === "application/pdf") {
		const text = await extractTextFromPDF(buffer);
		return { text, parser: "unpdf" };
	}

	if (mimeType.startsWith("image/")) {
		const result = await extractTextFromImage(buffer, mimeType);
		return {
			text: result.text,
			parser: "openai-vision",
			date: result.date || undefined,
		};
	}

	if (mimeType === "text/csv") {
		const text = extractTextFromCSV(buffer);
		return { text, parser: "deno-std-csv" };
	}

	throw new ServiceError("UNSUPPORTED_FILE_TYPE", {
		debugInfo: `Unsupported mime type: ${mimeType}`,
	});
}
