import eslintReact from "@eslint-react/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import rootConfig from "../../eslint.config.js";

export default [
	...rootConfig,
	eslintReact.configs["recommended-typescript"],
	{
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
	},
];
