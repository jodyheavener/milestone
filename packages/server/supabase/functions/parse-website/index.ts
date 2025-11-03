import "@supabase/functions-js";
import { Hono, z } from "@/lib";
import { getUserClient } from "@/lib";
import { getAuthHeader, getUserOrThrow } from "@/lib";
import { handleRequest, json, logger, withCORS } from "@/lib";
import { ServiceError } from "@milestone/shared";
import { extractPage } from "./website-parser.ts";
import { generateWebsiteSummary } from "./summarizer.ts";
import { validateUrl } from "./validation.ts";

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
		validateUrl(input.url);

		// Extract page content
		const pageData = await extractPage(input.url);

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

		const response = {
			pageTitle: pageData.title || "Untitled",
			extractedContent: pageData.content,
			summary,
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
