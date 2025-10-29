import "@supabase/functions-js";
import { ServiceError } from "@m/shared";
import { serveFunction, supabaseClient } from "~/library";
import { extractTextFromPDF } from "./pdf-parser.ts";
import { extractTextFromImage } from "./image-parser.ts";
import { extractTextFromCSV } from "./csv-parser.ts";
import { generateSummary } from "./summarizer.ts";

interface ParseFileRequest {
	storagePath: string;
}

interface ParseFileResponse {
	extractedText: string;
	summary: string;
	parser: string;
	date?: string | null;
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
