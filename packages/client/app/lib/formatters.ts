export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatDate(dateString: string | null): string {
	if (!dateString) return "N/A";
	return new Date(dateString).toLocaleDateString();
}

export function formatPrice(amount: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency.toUpperCase(),
	}).format(amount / 100);
}

export function formatInterval(interval: string | null): string {
	if (!interval) return "";
	return `/${interval}`;
}

export function calculateUsagePercent(used: number, limit: number): number {
	if (limit <= 0) return 0;
	return Math.min((used / limit) * 100, 100);
}
