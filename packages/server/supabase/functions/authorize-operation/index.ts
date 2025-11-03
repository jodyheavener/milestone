import "@supabase/functions-js";
import { Hono, z } from "@/lib";
import { getServiceClient, getUserClient } from "@/lib";
import { getAuthHeader, getUserOrThrow } from "@/lib";
import { handleRequest, json, logger, withCORS } from "@/lib";
import { ServiceError } from "@milestone/shared";

const app = new Hono();

// Validation schema
const AuthorizeRequestSchema = z.object({
	op: z.enum(["project", "agentic_request"]),
});

// Preflight
app.options("*", () => new Response(null, { status: 204 }));

/**
 * Authorize an operation (project creation or agentic request)
 * Validates user entitlements before allowing the operation
 */
app.post(
	"/authorize-operation",
	handleRequest(async (c, requestId) => {
		// Auth as user
		const sbUserClient = getUserClient(getAuthHeader(c.req.raw));
		const user = await getUserOrThrow(sbUserClient);

		// Validate input
		const body = await c.req.json();
		const input = AuthorizeRequestSchema.parse(body);

		logger.info("Authorize operation", {
			userId: user.id,
			operation: input.op,
		});

		// Use service role for RPC (bypasses RLS for internal operations)
		const sbServiceClient = getServiceClient();
		const { data, error } = await sbServiceClient.rpc("authorize_operation", {
			p_user_id: user.id,
			p_op_type: input.op,
		});

		if (error) {
			logger.error("RPC error", {
				userId: user.id,
				error: error.message,
			});

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

		return json({
			allowed: result.allowed,
			reason: result.reason || null,
			remaining: result.remaining ?? null,
			requestId,
		});
	}),
);

export default {
	fetch: async (req: Request) => {
		const res = await app.fetch(req);
		return withCORS()(req, res);
	},
};
