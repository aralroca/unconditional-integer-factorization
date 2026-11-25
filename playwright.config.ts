import { defineConfig, devices } from "@playwright/test";

const CI = Boolean(process.env.CI);
const SITE_URL = "http://127.0.0.1:4173/unconditional-integer-factorization/";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: CI ? 1 : 0,
  use: { baseURL: SITE_URL, trace: "retain-on-failure" },
  // Locally use the installed Chrome; CI installs Playwright's Chromium.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: CI ? undefined : "chrome" } }],
  webServer: { command: "sh scripts/serve-static.sh", url: SITE_URL, reuseExistingServer: !CI },
});
