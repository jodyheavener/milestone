import { parse } from "@std/csv";
import { logger } from "~/library";
import { normalizeText } from "./utils.ts";

export function extractTextFromCSV(fileBuffer: Uint8Array): string {
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
		logger.error("CSV extraction error", { error });
		throw new Error("Failed to extract text from CSV");
	}
}
