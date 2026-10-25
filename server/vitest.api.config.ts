import { defineConfig } from "vitest/config";

// Live API tests (npm run test:api): they need the server running and seeded
// data, so they are kept out of the normal `npm test` run.
export default defineConfig({
  test: {
    include: ["tests/api/**/*.api.ts"],
    testTimeout: 30000,
    fileParallelism: false,
  },
});
