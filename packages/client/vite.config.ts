import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";

  return {
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths(), svgr()],
    envPrefix: "APP_",
    build: {
      sourcemap: true,
      rollupOptions: {
        output: { sourcemapExcludeSources: isProduction },
      },
      outDir: "dist",
    },
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./app"),
      },
    },
  };
});
