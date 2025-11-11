/**
 * Normalizes a URL by removing fragment and sorting query parameters
 */
export function normalizeUrl(url: string): string {
	try {
		const urlObj = new URL(url);
		// Remove fragment
		urlObj.hash = "";
		// Sort query parameters
		const params = new URLSearchParams(urlObj.search);
		const sortedParams: [string, string][] = [];
		// URLSearchParams is iterable in Deno - use Array.from if available, otherwise parse manually
		try {
			// Try using Array.from if URLSearchParams is iterable
			const entries = Array.from(
				params as unknown as Iterable<[string, string]>,
			);
			sortedParams.push(...entries);
		} catch {
			// Fallback: parse the search string manually
			const searchStr = urlObj.search.substring(1); // Remove leading '?'
			if (searchStr) {
				for (const pair of searchStr.split("&")) {
					const [key, value] = pair.split("=", 2);
					if (key) {
						sortedParams.push([
							decodeURIComponent(key),
							value ? decodeURIComponent(value) : "",
						]);
					}
				}
			}
		}
		sortedParams.sort(([a], [b]) => a.localeCompare(b));
		urlObj.search = new URLSearchParams(sortedParams).toString();
		return urlObj.toString();
	} catch {
		// If URL parsing fails, return as-is
		return url;
	}
}

/**
 * Computes SHA-256 hash of content as bytea
 */
export async function computeContentHash(content: string): Promise<Uint8Array> {
	const encoder = new TextEncoder();
	const data = encoder.encode(content);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	return new Uint8Array(hashBuffer);
}

/**
 * Computes SHA-256 hash of a string and returns as hex string
 */
export async function hashString(input: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(input);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
