export interface CleanupResult {
	totalFiles: number;
	orphanedFiles: number;
	deletedFiles: number;
	errors: string[];
	deletedPaths: string[];
}

export function createCleanupResult(): CleanupResult {
	return {
		totalFiles: 0,
		orphanedFiles: 0,
		deletedFiles: 0,
		errors: [],
		deletedPaths: [],
	};
}

export function isTemporaryUserFile(
	fileName: string,
	createdAt: string,
): boolean {
	const isUserScoped = fileName.includes("/") && !fileName.startsWith("/");
	if (!isUserScoped) {
		return false;
	}

	const fileAge = Date.now() - new Date(createdAt).getTime();
	const twentyFourHours = 24 * 60 * 60 * 1000;
	return fileAge < twentyFourHours;
}

export function logProgress(message: string, data?: unknown): void {
	if (data) {
		console.log(`[Cleanup] ${message}`, data);
	} else {
		console.log(`[Cleanup] ${message}`);
	}
}

export function logError(message: string, error?: unknown): void {
	if (error) {
		console.error(`[Cleanup Error] ${message}`, error);
	} else {
		console.error(`[Cleanup Error] ${message}`);
	}
}
