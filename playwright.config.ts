import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: { baseURL: process.env.VOXA_E2E_URL || "http://127.0.0.1:3000", trace: "retain-on-failure" },
  webServer: process.env.VOXA_E2E_URL ? undefined : {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
  },
});
