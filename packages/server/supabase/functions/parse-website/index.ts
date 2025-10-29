import "@supabase/functions-js";
import { ServiceError } from "@m/shared";
import { serveFunction } from "~/library";
import { extractPage } from "./website-parser.ts";
import { generateWebsiteSummary } from "./summarizer.ts";

interface ParseWebsiteResponse {
	pageTitle: string;
	extractedContent: string;
	summary: string;
}

serveFunction<["url"]>(
	{
		methods: ["POST"],
		setCors: true,
		authed: true,
		args: ["url"] as const,
	},
	async ({ args, user, respond }) => {
		const { url } = args as { url: string };

		if (!user) {
			throw new ServiceError("UNAUTHORIZED");
		}

		try {
			// Validate URL format
			let parsedUrl: URL;
			try {
				parsedUrl = new URL(url);
			} catch {
				throw new ServiceError("INVALID_URL", {
					debugInfo: "Invalid URL format",
				});
			}

			// Only allow HTTP/HTTPS URLs
			if (!["http:", "https:"].includes(parsedUrl.protocol)) {
				throw new ServiceError("INVALID_URL", {
					debugInfo: "Only HTTP and HTTPS URLs are allowed",
				});
			}

			// Extract page content using Readability
			const pageData = await extractPage(url);

			if (!pageData.content || pageData.content.trim().length === 0) {
				throw new ServiceError("NO_CONTENT", {
					debugInfo: "No content could be extracted from the page",
				});
			}

			// Generate summary using OpenAI
			const summary = await generateWebsiteSummary(
				pageData.content,
				pageData.title,
			);

			const response: ParseWebsiteResponse = {
				pageTitle: pageData.title || "Untitled",
				extractedContent: pageData.content,
				summary,
			};

			return respond(response);
		} catch (error) {
			if (error instanceof ServiceError) {
				throw error;
			}

			console.error("Parse website error:", error);
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
);
