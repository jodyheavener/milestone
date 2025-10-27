import { User } from "@supabase/supabase-js";
import { ServiceError } from "@m/shared";
import { supabaseClient } from "./supabase.ts";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

type ServeOptions<T extends readonly string[]> = {
	methods: string[];
	setCors?: boolean;
	authed?: boolean;
	args?: T;
};

type ExtractArgs<T extends readonly string[]> = {
	// deno-lint-ignore no-explicit-any
	[K in T[number]]: any;
};

type RespondFunction = (
	body: number | string | object,
	responseInit?: {
		headers?: Record<string, string>;
		status?: number;
	},
) => Response;

type ServeCallback<T extends readonly string[]> = (context: {
	args: ExtractArgs<T>;
	user: User | null;
	supabaseClient: typeof supabaseClient;
	request: Request;
	respond: RespondFunction;
}) => Response | Promise<Response>;

export function serveFunction<T extends readonly string[]>(
	options: ServeOptions<T> = {
		methods: ["POST"],
		setCors: false,
		authed: false,
	},
	callback: ServeCallback<T>,
) {
	Deno.serve(async (request: Request) => {
		try {
			// Create response helper
			const respond: RespondFunction = (body, responseInit) => {
				let responseBody: string;
				let contentType = "text/plain";
				let status = responseInit?.status || 200;

				if (typeof body === "string") {
					// If body is a string, use it as the response body
					responseBody = body;
				} else if (typeof body === "number") {
					// If it's a number, use it as the status code and set an empty response body
					status = body;
					responseBody = "";
				} else if (typeof body === "object") {
					// If it's an object, stringify it as JSON and set content type
					responseBody = JSON.stringify(body);
					contentType = "application/json";
				} else {
					// If it's not a string, number, or object, throw an error
					throw new Error("An invalid response body type was used");
				}

				const headers: Record<string, string> = {
					"Content-Type": contentType,
					// Conditionally apply CORS headers
					...(options.setCors ? corsHeaders : {}),
					...(responseInit?.headers || {}),
				};

				return new Response(responseBody, { status, headers });
			};

			// Handle CORS preflight
			if (options.setCors && request.method === "OPTIONS") {
				return respond("ok");
			}

			// Check allowed methods
			if (options.methods && !options.methods.includes(request.method)) {
				throw new ServiceError("METHOD_NOT_ALLOWED");
			}

			// Handle authentication
			// @todo - if `authed: true` user should never be typed as null
			let user: User | null = null;
			if (options.authed) {
				const authHeader = request.headers.get("Authorization");

				if (!authHeader) {
					throw new ServiceError("BAD_AUTH_HEADER");
				}

				const { data: userData, error: userError } = await supabaseClient.auth
					.getUser(authHeader.replace("Bearer ", ""));

				if (userError || !userData.user) {
					throw new ServiceError("INVALID_AUTH", { debugInfo: userError });
				}

				user = userData.user;
			}

			// Parse request arguments
			const args: ExtractArgs<T> = {} as ExtractArgs<T>;
			if (options.args && options.args.length > 0) {
				const body = await request.json();
				for (const arg of options.args) {
					args[arg as keyof ExtractArgs<T>] = body[arg];
				}
			}

			// Execute the callback and return its response
			return await callback({
				args,
				user,
				supabaseClient,
				request,
				respond,
			});
		} catch (error) {
			if (error instanceof ServiceError) {
				const { message, type, status } = error;
				const responseBody = JSON.stringify({
					message,
					type,
				});
				const headers: Record<string, string> = {
					"Content-Type": "application/json",
					...(options.setCors ? corsHeaders : {}),
				};

				return new Response(responseBody, {
					status,
					headers,
				});
			} else {
				const responseBody = JSON.stringify({
					error: error instanceof Error
						? error.message
						: "Unknown error occurred",
				});
				const headers: Record<string, string> = {
					"Content-Type": "application/json",
					...(options.setCors ? corsHeaders : {}),
				};

				return new Response(responseBody, {
					status: 500,
					headers,
				});
			}
		}
	});
}
