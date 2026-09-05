import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: { baseURL: "http://127.0.0.1:3017", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3017",
    url: "http://127.0.0.1:3017",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DATABASE_URL: "file:./.e2e.db",
      ADMIN_PASSWORD: "local-e2e-password",
      AUTH_SECRET: "local-e2e-signing-secret-for-tests-only",
    },
  },
});
