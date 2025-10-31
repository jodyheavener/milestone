import { z } from "./deps.ts";
import type { Environment } from "@m/shared";

// Validate environment variables
const EnvSchema = z.object({
	APP_ENV: z.enum(["lcl", "prv", "prd"]),
	APP_URL: z.string().url(),
	ALLOWED_ORIGINS: z.string(),
	HEALTH_CHECK_SECRET: z.string().optional(),
	SUPABASE_ANON_KEY: z.string(),
	SUPABASE_SERVICE_ROLE_KEY: z.string(),
	SUPABASE_URL: z.string().url(),
	OPENAI_API_KEY: z.string(),
	STRIPE_MODE: z.enum(["test", "live"]),
	STRIPE_SECRET_KEY: z.string(),
	STRIPE_SYNC_SECRET: z.string().optional(),
	STRIPE_WEBHOOK_SECRET: z.string().nullable().optional(),
});

const parsedEnv = EnvSchema.parse(Deno.env.toObject());

type EnvKey = keyof z.infer<typeof EnvSchema>;
type EnvValue<K extends EnvKey> = z.infer<typeof EnvSchema>[K];

/**
 * Get environment variable with type safety
 * Throws error if variable is not set (unless fallback is provided)
 */
export function env<K extends EnvKey>(
	name: K,
	fallback?: EnvValue<K>,
): EnvValue<K> {
	const value = parsedEnv[name];

	if (value !== undefined && value !== null) {
		return value as EnvValue<K>;
	}

	if (fallback !== undefined) {
		return fallback;
	}

	throw new Error(
		`Environment variable ${name} is not set and no fallback was provided`,
	);
}

// Helper to check environment
export const isEnv = (target: Environment) => env("APP_ENV") === target;
