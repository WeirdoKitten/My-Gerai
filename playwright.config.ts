import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

const { parsed } = dotenv.config({
  path: path.resolve(__dirname, ".env.test"),
});
const databaseUrl = parsed?.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(".env.test tidak ditemukan atau DATABASE_URL kosong.");
}

const baseURL = parsed?.APP_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  // Satu worker: order-flow.spec.ts (1 login sah) harus jalan sebelum
  // rate-limit.spec.ts (percobaan berulang) supaya keduanya berbagi state
  // rate-limiter in-memory server yang sama secara deterministik, bukan race
  // antar-file. Proporsional untuk suite kecil lokal tanpa CI (KISS).
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev --port 3100",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      DATABASE_URL: databaseUrl,
      APP_URL: baseURL,
    },
  },
});
