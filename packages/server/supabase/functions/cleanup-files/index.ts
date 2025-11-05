import "@supabase/functions-js";
import { handleRequest, Hono, json, logger } from "@/lib";
import { cleanup } from "./cleanup.ts";

const app = new Hono();

/**
 * File cleanup cron job endpoint
 * Removes orphaned files from storage
 * Internal endpoint - no CORS
 */
app.post(
	"/cleanup-files",
	handleRequest(async (_c, requestId) => {
		logger.info("Starting file cleanup");

		const result = await cleanup();

		logger.info("File cleanup completed", {
			totalFiles: result.totalFiles,
			orphanedFiles: result.orphanedFiles,
			deletedFiles: result.deletedFiles,
			errors: result.errors.length,
		});

		return json({
			success: true,
			message: "Cleanup completed",
			result,
			requestId,
		});
	}),
);

// Internal cron endpoint - no CORS needed
export default {
	fetch: app.fetch,
};
