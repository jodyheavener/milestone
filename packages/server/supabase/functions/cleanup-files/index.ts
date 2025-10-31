import "@supabase/functions-js";
import { handleRequest, Hono, json, logger } from "~/library";
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

		logger.info("File cleanup completed");

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
