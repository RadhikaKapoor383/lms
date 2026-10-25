import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Client unit + component tests (npm run test). Kept out of tsconfig.json's
// "include" so `next build` never type-checks test-only packages.
export default defineConfig({
  esbuild: { jsx: "automatic" }, // tsconfig says "preserve" (Next compiles JSX itself)
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
  },
});
