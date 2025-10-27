import rootConfig from "../../eslint.config.js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintReact from "@eslint-react/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
	...rootConfig,
	eslintReact.configs["recommended-typescript"],
	{
		files: ["**/*.{ts,tsx}"],
		languageOptions: {
			ecmaVersion: 2020,
			globals: {
				...globals.browser,
			},
		},
		plugins: {
			"react-hooks": reactHooks,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			"no-empty-pattern": "off",
		},
	},
	{
		ignores: [".react-router", "dist"],
	}
);
