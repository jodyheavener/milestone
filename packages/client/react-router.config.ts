import { vercelPreset } from "@vercel/react-router/vite";
import type { Config } from "@react-router/dev/config";

export default {
	ssr: true,
	presets: [vercelPreset()],
	buildDirectory: "dist",
	future: {
		v8_middleware: true,
	},
} satisfies Config;
