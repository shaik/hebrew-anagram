/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base: "./"` produces relative asset URLs in the built index.html so the
// same dist/ works whether the site is served at `/`, at a GitHub Pages
// project subpath like `/<repo-name>/`, or from a custom domain root.
// We also use `import.meta.env.BASE_URL` when fetching the dictionary so
// the same trick works for /hebrew_dict.txt.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
