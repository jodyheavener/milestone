export function getProductFeatures(product: { metadata: unknown }): string[] {
	const metadata = product.metadata as Record<string, unknown> | null;
	if (metadata?.features && Array.isArray(metadata.features)) {
		return metadata.features as string[];
	}

	// Fallback: generate from metadata if available
	const features: string[] = [];
	if (metadata?.projects_limit) {
		const limit = metadata.projects_limit as number;
		features.push(
			limit === -1 || limit >= 1000
				? "Unlimited projects"
				: `${limit} project${limit !== 1 ? "s" : ""}`
		);
	}
	if (metadata?.agentic_limit) {
		const limit = metadata.agentic_limit as number;
		features.push(`${limit.toLocaleString()} agentic requests per 12 hours`);
	}
	if (metadata?.support_level) {
		features.push(`${metadata.support_level as string} support`);
	}

	return features.length > 0 ? features : ["See details for more information"];
}
