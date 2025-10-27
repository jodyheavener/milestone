import eslintJs from "@eslint/js";
import tseslint from "typescript-eslint";
import tsparser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default tseslint.config(
	eslintJs.configs.recommended,
	tseslint.configs.recommended,
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
		rules: {
			"prefer-const": "error",
			"no-var": "error",
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
	}
);
