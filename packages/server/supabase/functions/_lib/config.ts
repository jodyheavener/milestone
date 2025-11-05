import { type EnvironmentType, environmentTypes } from "@milestone/shared";
import { z } from "./deps.ts";

// Validate environment variables
const ConfigSchema = z.object({
	APP_ENV: z.enum(environmentTypes),
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

const parsedConfig = ConfigSchema.parse(Deno.env.toObject());

type ConfigKey = keyof z.infer<typeof ConfigSchema>;
type ConfigValue<K extends ConfigKey> = z.infer<typeof ConfigSchema>[K];

/**
 * Get configuration (environment variable) with type safety
 * Throws error if variable is not set (unless fallback is provided)
 */
export function config<K extends ConfigKey>(
	key: K,
	fallback?: ConfigValue<K>,
): ConfigValue<K> {
	const value = parsedConfig[key];

	if (value !== undefined && value !== null) {
		return value as ConfigValue<K>;
	}

	if (fallback !== undefined) {
		return fallback;
	}

	throw new Error(
		`Environment variable ${key} is not set and no fallback was provided`,
	);
}

// Helper to check environment
export const isEnv = (type: EnvironmentType) => config("APP_ENV") === type;
