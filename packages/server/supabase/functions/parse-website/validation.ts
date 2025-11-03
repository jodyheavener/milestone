import { ServiceError } from "@milestone/shared";

/**
 * Validate URL format and protocol
 * Only allows HTTP and HTTPS URLs
 */
export function validateUrl(url: string): URL {
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

	return parsedUrl;
}
