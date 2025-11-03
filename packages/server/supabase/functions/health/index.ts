import "@supabase/functions-js";
import {
	config,
	handleRequest,
	Hono,
	isEnv,
	json,
	logger,
	withCORS,
} from "@/lib";

const app = new Hono();

// Preflight
app.options("*", () => new Response(null, { status: 204 }));

/**
 * Health check endpoint
 * Requires X-Health-Check-Secret header for authentication
 */
app.get(
	"/health",
	handleRequest((c, requestId) => {
		const healthCheckSecret = c.req.header("X-Health-Check-Secret");
		if (!verifyHealthCheckSecret(healthCheckSecret)) {
			logger.warn("Unauthorized health check");

			return json(
				{
					error: {
						code: "Unauthorized",
						message: "Invalid ping key",
						requestId,
					},
				},
				{ status: 401 },
			);
		}

		logger.info("Health check", {
			environment: config("APP_ENV"),
		});

		return json({
			status: "healthy",
			timestamp: new Date().toISOString(),
			environment: config("APP_ENV"),
			requestId,
		});
	}),
);

function verifyHealthCheckSecret(
	healthCheckSecret: string | undefined,
): boolean {
	if (isEnv("lcl")) {
		return true;
	}

	return (
		!!healthCheckSecret && healthCheckSecret === config("HEALTH_CHECK_SECRET")
	);
}

export default {
	fetch: async (req: Request) => {
		const res = await app.fetch(req);
		return withCORS()(req, res);
	},
};
