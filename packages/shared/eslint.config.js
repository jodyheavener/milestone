import rootConfig from "../../eslint.config.js";
import tseslint from "typescript-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default tseslint.config(
	...rootConfig,
	{
		files: ["**/*.{ts,tsx}"],
		plugins: {
			"simple-import-sort": simpleImportSort,
		},
		rules: {
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{
					prefer: "type-imports",
					fixStyle: "inline-type-imports",
				},
			],
			"simple-import-sort/imports": [
				"error",
				{
					groups: [
						[
							// Side effect imports.
							"^\\u0000",
							// Node.js built-ins.
							"^node:",
							// Packages.
							"^@?\\w",
							// Absolute imports and other imports.
							"^",
							// Relative imports.
							"^\\.",
						],
					],
				},
			],
			"simple-import-sort/exports": "error",
		},
	}
);
