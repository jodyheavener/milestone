import { type EnvironmentType, environmentTypes } from "@milestone/shared";
import { z } from "zod";

// Validate environment variables
const ConfigSchema = z.object({
	APP_ENV: z.enum(environmentTypes),
	APP_URL: z.string().url(),
	APP_SUPABASE_URL: z.string().url(),
	APP_SUPABASE_ANON_KEY: z.string(),
	APP_STRIPE_PUBLISHABLE_KEY: z.string(),
});

const parsedConfig = ConfigSchema.parse({
	APP_ENV: import.meta.env.APP_ENV,
	APP_URL: import.meta.env.APP_URL,
	APP_SUPABASE_URL: import.meta.env.APP_SUPABASE_URL,
	APP_SUPABASE_ANON_KEY: import.meta.env.APP_SUPABASE_ANON_KEY,
	APP_STRIPE_PUBLISHABLE_KEY: import.meta.env.APP_STRIPE_PUBLISHABLE_KEY,
});

type ConfigKey = keyof z.infer<typeof ConfigSchema>;
type ConfigValue<K extends ConfigKey> = z.infer<typeof ConfigSchema>[K];

/**
 * Get configuration (environment variable) with type safety
 * Throws error if variable is not set (unless fallback is provided)
 */
export function config<K extends ConfigKey>(
	key: K,
	fallback?: ConfigValue<K>
): ConfigValue<K> {
	const value = parsedConfig[key];

	if (value !== undefined && value !== null) {
		return value as ConfigValue<K>;
	}

	if (fallback !== undefined) {
		return fallback;
	}

	throw new Error(
		`Environment variable ${key} is not set and no fallback was provided`
	);
}

// Helper to check environment
export const isEnv = (type: EnvironmentType) => config("APP_ENV") === type;
