import { ServiceError } from "@milestone/shared";
import { getServiceClient } from "@/lib";
import {
	CleanupResult,
	createCleanupResult,
	isTemporaryUserFile,
	logError,
	logProgress,
} from "./utils.ts";

export async function cleanup(): Promise<CleanupResult> {
	const result = createCleanupResult();

	try {
		// Get all files from the attachments bucket
		const storageFiles = await getStorageFiles();
		result.totalFiles = storageFiles?.length || 0;

		if (result.totalFiles === 0) {
			logProgress("No files found in storage bucket");
			return result;
		}

		// Get all file paths that exist in the database
		const dbFiles = await getDatabaseFiles();

		// Identify orphaned files
		const orphanedFiles = identifyOrphans(storageFiles, dbFiles);
		result.orphanedFiles = orphanedFiles.length;

		logProgress(`Found ${result.orphanedFiles} orphaned files`);

		// Delete orphaned files
		await deleteOrphans(orphanedFiles, result);

		logProgress(
			`Cleanup completed: ${result.deletedFiles} files deleted, ${result.errors.length} errors`,
		);

		return result;
	} catch (error) {
		if (error instanceof ServiceError) {
			throw error;
		}

		const errorMsg = `Cleanup failed: ${error}`;
		result.errors.push(errorMsg);
		logError(errorMsg);
		return result;
	}
}

async function getStorageFiles(): Promise<
	Array<{
		name: string;
		created_at: string;
	}> | null
> {
	const sbUserClient = getServiceClient();
	const { data: storageFiles, error: storageError } = await sbUserClient.storage
		.from("attachments")
		.list("", {
			limit: 1000,
			sortBy: { column: "created_at", order: "asc" },
		});

	if (storageError) {
		throw new ServiceError("INTERNAL_ERROR", {
			debugInfo: `Failed to list storage files: ${storageError.message}`,
		});
	}

	return storageFiles;
}

async function getDatabaseFiles(): Promise<Set<string>> {
	const sbUserClient = getServiceClient();
	const { data: dbFiles, error: dbError } = await sbUserClient
		.from("file")
		.select("storage_path");

	if (dbError) {
		throw new ServiceError("INTERNAL_ERROR", {
			debugInfo: `Failed to query database files: ${dbError.message}`,
		});
	}

	return new Set(
		dbFiles?.map((f: { storage_path: string }) => f.storage_path) || [],
	);
}

function identifyOrphans(
	storageFiles: Array<{ name: string; created_at: string }> | null,
	dbFilePaths: Set<string>,
): Array<{ name: string; created_at: string }> {
	return (
		storageFiles?.filter((file: { name: string; created_at: string }) => {
			// Skip if file is referenced in database
			if (dbFilePaths.has(file.name)) {
				return false;
			}

			// Skip if file is a temporary user-scoped file (less than 24 hours old)
			if (isTemporaryUserFile(file.name, file.created_at)) {
				return false; // Keep temporary files less than 24 hours old
			}

			return true;
		}) || []
	);
}

async function deleteOrphans(
	files: Array<{ name: string; created_at: string }>,
	result: CleanupResult,
): Promise<void> {
	const sbUserClient = getServiceClient();
	for (const file of files) {
		try {
			const { error: deleteError } = await sbUserClient.storage
				.from("attachments")
				.remove([file.name]);

			if (deleteError) {
				const errorMsg =
					`Failed to delete ${file.name}: ${deleteError.message}`;
				result.errors.push(errorMsg);
				logError(errorMsg);
			} else {
				result.deletedFiles++;
				result.deletedPaths.push(file.name);
				logProgress(`Deleted orphaned file: ${file.name}`);
			}
		} catch (error) {
			const errorMsg = `Error deleting ${file.name}: ${error}`;
			result.errors.push(errorMsg);
			logError(errorMsg);
		}
	}
}
