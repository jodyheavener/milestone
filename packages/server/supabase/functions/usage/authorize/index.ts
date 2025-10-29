import "@supabase/functions-js";
import { ServiceError } from "@m/shared";
import { serveFunction, supabaseClient } from "~/library";

interface AuthorizeRequest {
	op: "project" | "agentic_request";
}

serveFunction<["op"]>(
	{
		methods: ["POST"],
		setCors: true,
		authed: true,
		args: ["op"] as const,
	},
	async ({ args, user, respond }) => {
		if (!user) {
			throw new ServiceError("UNAUTHORIZED");
		}

		const { op } = args as AuthorizeRequest;

		if (!op || (op !== "project" && op !== "agentic_request")) {
			throw new ServiceError("INVALID_REQUEST", {
				debugInfo: "op must be 'project' or 'agentic_request'",
			});
		}

		try {
			// Call the RPC function
			const { data, error } = await supabaseClient.rpc("authorize_operation", {
				p_user_id: user.id,
				p_op_type: op,
			});

			if (error) {
				throw new ServiceError("INTERNAL_ERROR", {
					debugInfo: `RPC error: ${error.message}`,
				});
			}

			if (!data) {
				throw new ServiceError("INTERNAL_ERROR", {
					debugInfo: "No data returned from authorize_operation",
				});
			}

			const result = data as {
				allowed: boolean;
				reason?: string;
				remaining?: number;
			};

			return respond({
				allowed: result.allowed,
				reason: result.reason || null,
				remaining: result.remaining ?? null,
			});
		} catch (error) {
			if (error instanceof ServiceError) {
				throw error;
			}

			console.error("Authorize operation error:", error);
			throw new ServiceError("INTERNAL_ERROR", {
				debugInfo: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
);
