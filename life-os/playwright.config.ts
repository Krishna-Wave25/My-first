import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

// Use the pre-installed Chromium when present (the sandbox cannot download browsers).
const local = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/opt/pw-browsers/chromium/chrome-linux/chrome"].find(existsSync);

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    actionTimeout: 10_000,
    launchOptions: { executablePath: local, args: ["--no-sandbox"] },
  },
  webServer: { command: "npm run build && npm run preview", url: "http://localhost:4173", reuseExistingServer: !!process.env.REUSE_SERVER, timeout: 120_000 },
});
