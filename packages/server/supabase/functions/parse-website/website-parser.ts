import { logger } from "@/lib";

export interface PageData {
	html: string;
	content: string;
	title: string;
	meta: Record<string, string>;
	lastModified: string | null;
	lastUpdated: string | null;
}

/**
 * Extracts content and metadata from a web page using basic HTML parsing
 */
export async function extractPage(url: string): Promise<PageData> {
	logger.info("Extracting document from page", { url });

	const { html, lastModified } = await fetchHtml(url);

	// Extract title using regex
	const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
	const title = titleMatch ? titleMatch[1].trim() : "Untitled";

	// Extract meta tags using regex
	const meta: Record<string, string> = {};
	const metaRegex =
		/<meta[^>]*(?:name|property)=["']([^"']*)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
	let metaMatch;
	while ((metaMatch = metaRegex.exec(html)) !== null) {
		meta[metaMatch[1].toLowerCase()] = metaMatch[2];
	}

	// Extract content by removing script and style tags, then cleaning up
	let content = html
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
		.replace(/<[^>]+>/g, " ") // Remove all HTML tags
		.replace(/\s+/g, " ") // Normalize whitespace
		.trim();

	// Try to extract main content area if content is too long
	if (content.length > 5000) {
		// Look for main content areas
		const mainContentRegex =
			/<(?:main|article|div[^>]*class="[^"]*(?:content|main|article|post)[^"]*")[^>]*>([\s\S]*?)<\/(?:main|article|div)>/i;
		const mainMatch = html.match(mainContentRegex);
		if (mainMatch) {
			const mainContent = mainMatch[1]
				.replace(/<[^>]+>/g, " ")
				.replace(/\s+/g, " ")
				.trim();
			if (mainContent.length > 200) {
				content = mainContent;
			}
		}
	}

	// If content is still too short, try to get body content
	if (content.length < 200) {
		const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
		if (bodyMatch) {
			content = bodyMatch[1]
				.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
				.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
				.replace(/<[^>]+>/g, " ")
				.replace(/\s+/g, " ")
				.trim();
		}
	}

	const lastUpdated = findLastUpdatedFromMeta(meta);

	return {
		html,
		content,
		title,
		meta,
		lastModified,
		lastUpdated,
	};
}

/**
 * Fetches HTML content from a URL with appropriate headers
 */
async function fetchHtml(
	url: string,
): Promise<{ html: string; lastModified: string | null }> {
	const response: Response = await fetch(url, {
		method: "GET",
		headers: {
			"user-agent":
				"PolicyAnalyzerBot/1.0 (+https://example.com; contact: security@example.com)",
			accept: "text/html,application/xhtml+xml",
		},
	});

	if (!response.ok) {
		throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
	}

	const html = await response.text();
	const lastModified = response.headers.get("last-modified") ?? null;

	return { html, lastModified };
}

/**
 * Attempts to find the last updated date from meta tags
 */
function findLastUpdatedFromMeta(meta: Record<string, string>): string | null {
	// Check meta tags
	const metaKeys = [
		"article:modified_time",
		"article:published_time",
		"og:updated_time",
		"last-modified",
		"date",
		"pubdate",
	];

	for (const key of metaKeys) {
		if (meta[key]) {
			return meta[key];
		}
	}

	return null;
}
