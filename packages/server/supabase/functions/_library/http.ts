import type { Context } from "hono";
import { ServiceError } from "@m/shared";
import { logger } from "./logger.ts";
import { env } from "./env.ts";

const defaultHeaders = {
	"Content-Type": "application/json; charset=utf-8",
} as const;

/**
 * Create a JSON response
 */
export const json = (data: unknown, init: ResponseInit = {}): Response => {
	return new Response(JSON.stringify(data), {
		headers: { ...defaultHeaders, ...(init.headers ?? {}) },
		...init,
	});
};

/**
 * Create a text response
 */
export const text = (data: string, init: ResponseInit = {}): Response => {
	return new Response(data, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			...(init.headers ?? {}),
		},
		...init,
	});
};

/**
 * CORS middleware factory
 */
export const withCORS = () => {
	const origins = new Set(
		env("ALLOWED_ORIGINS", "")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean),
	);

	return (req: Request, res: Response): Response => {
		const origin = req.headers.get("Origin") ?? "";
		const allow = origins.size === 0 || origins.has(origin);

		const corsHeaders = allow
			? {
				"Access-Control-Allow-Origin": origin,
				Vary: "Origin",
				"Access-Control-Allow-Headers":
					"authorization,content-type,x-client-info,apikey",
				"Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
			}
			: {};

		const merged = new Headers(res.headers);
		for (const [k, v] of Object.entries(corsHeaders)) {
			merged.set(k, v);
		}

		return new Response(res.body, {
			status: res.status,
			statusText: res.statusText,
			headers: merged,
		});
	};
};

/**
 * Generate a request ID for logging
 */
export function getRequestId(req: Request): string {
	return req.headers.get("X-Request-ID") ?? crypto.randomUUID();
}

/**
 * Request handler wrapper that handles common error patterns
 * Sets up requestId, logger, and handles ServiceError, ZodError, and generic errors
 * Accepts sync or async handler function.
 */
export function handleRequest(
	handler: (c: Context, requestId: string) => Response | Promise<Response>,
	options?: {
		handleZodError?: boolean;
	},
): (c: Context) => Promise<Response> {
	return async (c: Context): Promise<Response> => {
		const requestId = getRequestId(c.req.raw);
		logger.setRequestId(requestId);

		try {
			const result = handler(c, requestId);
			// Await only if result is a Promise, otherwise return directly
			if (result && typeof (result as Promise<Response>).then === "function") {
				return await result;
			} else {
				return result as Response;
			}
		} catch (error) {
			if (error instanceof ServiceError) {
				logger.error(error.message, {
					type: error.type,
				});

				return json(
					{
						error: {
							code: error.type,
							message: error.message,
							requestId,
						},
					},
					{ status: error.status },
				);
			}

			if (
				options?.handleZodError !== false &&
				error instanceof Error &&
				error.name === "ZodError"
			) {
				return json(
					{
						error: {
							code: "BadRequest",
							message: "Invalid request",
							requestId,
						},
					},
					{ status: 400 },
				);
			}

			logger.error(error instanceof Error ? error.message : "Unknown error", {
				stack: error instanceof Error ? error.stack : undefined,
			});

			return json(
				{
					error: {
						code: "InternalError",
						message: "An internal error occurred",
						requestId,
					},
				},
				{ status: 500 },
			);
		}
	};
}
