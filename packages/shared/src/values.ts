export function parseString<T extends string>(
	value: string | undefined,
	defaultValue?: T
): T {
	const fallback = defaultValue ? defaultValue : ("" as T);

	if (!value) {
		return fallback;
	}

	try {
		return String(value) as T;
	} catch (error) {
		console.error(`Failed to parse JSON from ${value}`, error);
		return fallback;
	}
}

export function parseInteger<T extends number>(
	value: string | undefined,
	defaultValue?: T
): T {
	const fallback = defaultValue ? defaultValue : (0 as T);

	if (!value) {
		return fallback;
	}

	try {
		return parseInt(value) as T;
	} catch (error) {
		console.error(`Failed to parse integer from ${value}`, error);
		return fallback;
	}
}

export function parseFloat<T extends number>(
	value: string | undefined,
	defaultValue?: T
): T {
	const fallback = defaultValue ? defaultValue : (0 as T);

	if (!value) {
		return fallback;
	}

	try {
		return parseFloat(value) as T;
	} catch (error) {
		console.error(`Failed to parse float from ${value}`, error);
		return fallback;
	}
}

export function parseBoolean<T extends boolean>(
	value: string | undefined,
	defaultValue?: T
): T {
	const fallback = defaultValue ? defaultValue : (false as T);

	if (!value) {
		return fallback;
	}

	try {
		return Boolean(value) as T;
	} catch (error) {
		console.error(`Failed to parse boolean from ${value}`, error);
		return fallback;
	}
}
