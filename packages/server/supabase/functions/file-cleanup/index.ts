import "@supabase/functions-js";
import { ServiceError } from "@m/shared";
import { serveFunction } from "~/library";
import { cleanup } from "./cleanup.ts";

serveFunction({ methods: ["POST"] }, async ({ respond }) => {
	try {
		const result = await cleanup();

		return respond({
			success: true,
			message: "Cleanup completed",
			result,
		});
	} catch (error) {
		if (error instanceof ServiceError) {
			throw error;
		}

		console.error("Cleanup function error:", error);

		return respond(
			{
				success: false,
				message: "Cleanup failed",
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
});
