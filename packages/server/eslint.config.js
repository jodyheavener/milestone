import rootConfig from "../../eslint.config.js";

export default [
	...rootConfig,
	{
		languageOptions: {
			globals: { Deno: "readonly" },
		},
	},
];
