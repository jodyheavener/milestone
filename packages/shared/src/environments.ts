export const environmentsMap = {
	lcl: "Local",
	prv: "Preview",
	prd: "Production",
} as const;

export type EnvironmentType = keyof typeof environmentsMap;
export type EnvironmentName = (typeof environmentsMap)[EnvironmentType];

export const environmentTypes = Object.keys(environmentsMap) as [
	EnvironmentType,
	...EnvironmentType[],
];

export const environmentNames = Object.values(environmentsMap);

export const makeIsEnv = (appEnv: string) => (env: EnvironmentType) =>
	env === appEnv;
