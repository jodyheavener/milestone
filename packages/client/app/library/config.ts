import { type Environment, makeIsEnv, parseString } from "@m/shared";

export const appEnv = parseString<Environment>(import.meta.env.APP_ENV, "lcl");

export const isEnv = makeIsEnv(appEnv);

export const supabase = {
	url: parseString(import.meta.env.APP_SUPABASE_URL),
	anonKey: parseString(import.meta.env.APP_SUPABASE_ANON_KEY),
};

export const stripe = {
	publishableKey: parseString(import.meta.env.APP_STRIPE_PUBLISHABLE_KEY),
};

export const appUrl = parseString(import.meta.env.APP_URL);
