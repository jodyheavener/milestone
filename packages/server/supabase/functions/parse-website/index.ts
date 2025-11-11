import "@supabase/functions-js";
import { type Json, ServiceError } from "@milestone/shared";
import { Hono, z } from "@/lib";
import { getServiceClient, getUserClient } from "@/lib";
import { getAuthHeader, getUserOrThrow } from "@/lib";
import { handleRequest, json, logger, withCORS } from "@/lib";
import { generateWebsiteTitleAndSummary } from "./summarizer.ts";
import { computeContentHash, normalizeUrl } from "./utils.ts";
import { validateUrl } from "./validation.ts";
import { extractPage } from "./website-parser.ts";

const app = new Hono();

// Validation schema
const ParseWebsiteSchema = z.object({
	url: z.string().url(),
});

// Preflight
app.options("*", () => new Response(null, { status: 204 }));

/**
 * Parse website content and extract text
 * Returns page title, extracted content, and AI-generated summary
 */
app.post(
	"/parse-website",
	handleRequest(async (c, requestId) => {
		// Auth as user
		const sbUserClient = getUserClient(getAuthHeader(c.req.raw));
		const user = await getUserOrThrow(sbUserClient);

		// Validate input
		const body = await c.req.json();
		const input = ParseWebsiteSchema.parse(body);

		logger.info("Parse website", {
			userId: user.id,
			url: input.url,
		});

		// Validate URL format and protocol
		try {
			validateUrl(input.url);
		} catch (error) {
			logger.error("Invalid URL", {
				userId: user.id,
				url: input.url,
				error: error instanceof Error
					? { message: error.message, stack: error.stack }
					: String(error),
			});
			throw error;
		}

		// Extract page content
		let pageData;
		try {
			pageData = await extractPage(input.url);
		} catch (error) {
			logger.error("Failed to extract page content", {
				userId: user.id,
				url: input.url,
				error: error instanceof Error
					? { message: error.message, stack: error.stack }
					: String(error),
			});
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: "Failed to extract page content",
			});
		}

		if (!pageData.content || pageData.content.trim().length === 0) {
			logger.warn("No content extracted from page", {
				userId: user.id,
				url: input.url,
			});
			throw new ServiceError("NO_CONTENT", {
				debugInfo: "No content could be extracted from the page",
			});
		}

		// Normalize URL and compute content hash
		const normalizedUrl = normalizeUrl(input.url);
		const contentHash = await computeContentHash(pageData.content);
		const mainText = pageData.content; // For now, use extracted content as main_text

		// Use service client to store website data (bypasses RLS)
		const sbServiceClient = getServiceClient();

		// Check if website already exists by normalized URL
		const { data: existingWebsite } = await sbServiceClient
			.from("website")
			.select("id, page_title")
			.eq("normalized_url", normalizedUrl)
			.single();

		let websiteId: string;
		if (existingWebsite) {
			websiteId = existingWebsite.id;
			logger.info("Website already exists", {
				userId: user.id,
				url: input.url,
				websiteId,
			});
		} else {
			// Extract canonical URL from meta tags
			const canonicalUrl = pageData.meta["canonical"] ||
				pageData.meta["og:url"] || null;

			// Extract site name from meta tags
			const siteName = pageData.meta["og:site_name"] ||
				pageData.meta["application-name"] ||
				null;

			// Parse published/updated dates
			let publishedAt: string | null = null;
			let updatedAt: string | null = null;
			if (pageData.meta["article:published_time"]) {
				publishedAt = pageData.meta["article:published_time"];
			}
			if (pageData.lastUpdated || pageData.meta["article:modified_time"]) {
				updatedAt = pageData.lastUpdated ||
					pageData.meta["article:modified_time"];
			}

			// Insert website record
			const { data: website, error: websiteError } = await sbServiceClient
				.from("website")
				.insert({
					address: input.url,
					normalized_url: normalizedUrl,
					canonical_url: canonicalUrl,
					page_title: pageData.title || "Untitled",
					site_name: siteName,
					language: pageData.meta["language"] || null,
					published_at: publishedAt,
					updated_at: updatedAt,
					last_modified: pageData.lastModified,
					main_text: mainText,
					content_hash: `\\x${
						Array.from(contentHash)
							.map((b) => b.toString(16).padStart(2, "0"))
							.join("")
					}`,
					metadata: pageData.meta,
					mime: "text/html",
				})
				.select("id")
				.single();

			if (websiteError) {
				logger.error("Failed to insert website", {
					userId: user.id,
					url: input.url,
					error: websiteError,
				});
				throw new ServiceError("INTERNAL_ERROR", {
					debugInfo: "Failed to store website data",
				});
			}

			websiteId = website.id;
			logger.info("Website stored", {
				userId: user.id,
				url: input.url,
				websiteId,
			});
		}

		// Generate title and summary using OpenAI
		let title: string;
		let summaryContent: {
			tldr?: string;
			key_takeaways?: string[];
			metrics?: Json;
		} = {};
		try {
			const titleAndSummary = await generateWebsiteTitleAndSummary(
				mainText,
				pageData.title,
				input.url,
			);
			title = titleAndSummary.title;
			// Store summary in structured format
			summaryContent = {
				tldr: titleAndSummary.summary,
				key_takeaways: [],
			};
		} catch (error) {
			logger.error("Failed to generate website title and summary", {
				userId: user.id,
				url: input.url,
				error: error instanceof Error
					? { message: error.message, stack: error.stack }
					: String(error),
			});
			// Continue with fallback title
			title = pageData.title || "Untitled Page";
			summaryContent = {
				tldr: "",
				key_takeaways: [],
			};
		}

		// Compute prompt hash for reproducibility
		const systemPrompt =
			"You are a helpful assistant that analyzes and summarizes web page content.";
		const userPrompt =
			`Please analyze the following web page content from "${pageData.title}":\n\n${
				mainText.substring(
					0,
					80000,
				)
			}\n\nGenerate a descriptive title and a comprehensive summary.`;
		const promptHashBytes = await computeContentHash(systemPrompt + userPrompt);
		const promptHashHex = `\\x${
			Array.from(promptHashBytes)
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("")
		}`;

		// Store summary in record table
		const { error: recordError } = await sbServiceClient.from("record").insert({
			user_id: user.id,
			website_id: websiteId,
			content: summaryContent,
			model_name: "gpt-4o-mini",
			prompt_hash: promptHashHex,
			tokens_in: 0, // TODO: Get from OpenAI response
			tokens_out: 0, // TODO: Get from OpenAI response
		});

		if (recordError) {
			logger.error("Failed to insert record", {
				userId: user.id,
				url: input.url,
				error: recordError,
			});
			// Don't fail the request if record insertion fails
		}

		logger.info("Website parsed successfully", {
			userId: user.id,
			url: input.url,
			contentLength: mainText.length,
			title: pageData.title,
			websiteId,
		});

		// Only return the title (not the summary)
		const response = {
			pageTitle: pageData.title || "Untitled",
			suggestedTitle: title,
			requestId,
		};

		return json(response);
	}),
);

export default {
	fetch: async (req: Request) => {
		const res = await app.fetch(req);
		return withCORS()(req, res);
	},
};
