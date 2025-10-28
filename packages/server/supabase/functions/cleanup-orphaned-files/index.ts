import "@supabase/functions-js";
import { supabaseClient, serveFunction } from "~/library";

interface CleanupResult {
	totalFiles: number;
	orphanedFiles: number;
	deletedFiles: number;
	errors: string[];
	deletedPaths: string[];
}

async function cleanupOrphanedFiles(): Promise<CleanupResult> {
	const result: CleanupResult = {
		totalFiles: 0,
		orphanedFiles: 0,
		deletedFiles: 0,
		errors: [],
		deletedPaths: [],
	};

	try {
		console.log("Starting orphaned files cleanup...");

		// Get all files from the attachments bucket
		const { data: storageFiles, error: storageError } =
			await supabaseClient.storage.from("attachments").list("", {
				limit: 1000,
				sortBy: { column: "created_at", order: "asc" },
			});

		if (storageError) {
			throw new Error(`Failed to list storage files: ${storageError.message}`);
		}

		result.totalFiles = storageFiles?.length || 0;
		console.log(`Found ${result.totalFiles} files in storage`);

		if (result.totalFiles === 0) {
			return result;
		}

		// Get all file paths that exist in the database
		const { data: dbFiles, error: dbError } = await supabaseClient
			.from("file")
			.select("storage_path");

		if (dbError) {
			throw new Error(`Failed to query database files: ${dbError.message}`);
		}

		const dbFilePaths = new Set(
			dbFiles?.map((f: { storage_path: string }) => f.storage_path) || []
		);
		console.log(`Found ${dbFilePaths.size} files in database`);

		// Identify orphaned files
		const orphanedFiles =
			storageFiles?.filter((file: { name: string; created_at: string }) => {
				// Skip if file is referenced in database
				if (dbFilePaths.has(file.name)) {
					return false;
				}

				// Skip if file is a temporary user-scoped file (less than 24 hours old)
				const isUserScoped =
					file.name.includes("/") && !file.name.startsWith("/");
				if (isUserScoped) {
					const fileAge = Date.now() - new Date(file.created_at).getTime();
					const twentyFourHours = 24 * 60 * 60 * 1000;
					if (fileAge < twentyFourHours) {
						return false; // Keep temporary files less than 24 hours old
					}
				}

				return true;
			}) || [];

		result.orphanedFiles = orphanedFiles.length;
		console.log(`Found ${result.orphanedFiles} orphaned files`);

		// Delete orphaned files
		for (const file of orphanedFiles) {
			try {
				const { error: deleteError } = await supabaseClient.storage
					.from("attachments")
					.remove([file.name]);

				if (deleteError) {
					result.errors.push(
						`Failed to delete ${file.name}: ${deleteError.message}`
					);
					console.error(`Failed to delete ${file.name}:`, deleteError);
				} else {
					result.deletedFiles++;
					result.deletedPaths.push(file.name);
					console.log(`Deleted orphaned file: ${file.name}`);
				}
			} catch (error) {
				const errorMsg = `Error deleting ${file.name}: ${error}`;
				result.errors.push(errorMsg);
				console.error(errorMsg);
			}
		}

		console.log(
			`Cleanup completed: ${result.deletedFiles} files deleted, ${result.errors.length} errors`
		);
		return result;
	} catch (error) {
		const errorMsg = `Cleanup failed: ${error}`;
		result.errors.push(errorMsg);
		console.error(errorMsg);
		return result;
	}
}

serveFunction({ methods: ["POST"] }, async ({ respond }) => {
	try {
		const result = await cleanupOrphanedFiles();

		return respond({
			success: true,
			message: "Cleanup completed",
			result,
		});
	} catch (error) {
		console.error("Cleanup function error:", error);

		return respond(
			{
				success: false,
				message: "Cleanup failed",
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
});
