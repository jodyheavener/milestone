import eslintJs from "@eslint/js";
import tseslint from "typescript-eslint";
import tsparser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default [
	eslintJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.{js,ts,tsx}"],
		languageOptions: {
			parser: tsparser,
			ecmaVersion: 2022,
			sourceType: "module",
			globals: {
				...globalThis,
			},
		},
		plugins: {
			"simple-import-sort": simpleImportSort,
		},
		rules: {
			"prefer-const": "error",
			"no-var": "error",
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
	},
	{
		files: ["**/*.{js,ts,tsx}"],
		...prettier,
	},
	{
		languageOptions: {
			globals: {
				process: "readonly",
				Buffer: "readonly",
				__dirname: "readonly",
				__filename: "readonly",
				console: "readonly",
				module: "readonly",
				require: "readonly",
				exports: "readonly",
				global: "readonly",
			},
		},
	},
];
