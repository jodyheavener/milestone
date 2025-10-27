import { type Environment, makeIsEnv, parseString } from "@m/shared";

export const appEnv = parseString<Environment>(Deno.env.get("APP_ENV"), "lcl");

export const isEnv = makeIsEnv(appEnv);

export const supabase = {
	url: parseString(Deno.env.get("SUPABASE_URL")),
	serviceRoleKey: parseString(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
};

export const pingKey = parseString(Deno.env.get("PING_KEY"));
