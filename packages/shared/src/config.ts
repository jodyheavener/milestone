export const appId = "milestone";
export const appTitle = "Milestone";

export const environments = {
	lcl: "Local",
	prv: "Preview",
	prd: "Production",
} as const;

export type Environment = keyof typeof environments;
export type EnvironmentName = (typeof environments)[Environment];

export const makeIsEnv = (appEnv: string) => (env: Environment) =>
	env === appEnv;
