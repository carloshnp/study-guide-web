import { defineConfig } from "@playwright/test"

/**
 * Playwright config lives in `web/` because `npm run test:e2e` runs there and
 * Playwright resolves `@playwright/test` from `web/node_modules`; the specs sit
 * in `web/e2e/` for the same reason.
 *
 * `e2e/serve.sh` builds the SPA if needed, publishes a version with
 * `pipeline.publish`, and serves that published tree (`current/web`,
 * `current/content`) with uvicorn on 127.0.0.1:8099 using a throwaway SQLite
 * database. Playwright starts it before the run and kills it afterwards, so a
 * spec always exercises the same artifact the systemd unit serves.
 */
const PORT = Number(process.env.ESTUDOS_E2E_PORT ?? 8099)
const baseURL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  // `.e2e.ts`, not `.spec.ts`: Vitest's default include glob owns `*.spec.ts` in this
  // package, and the Playwright specs must never be collected by jsdom.
  testMatch: "**/*.e2e.ts",
  outputDir: "./test-results",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // One worker: both projects write to the same throwaway SQLite database, and
  // the progress spec must not race the other project's writes.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "mobile",
      // iPhone 13 metrics without the WebKit descriptor: chromium is the only
      // browser installed.
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: "bash ./e2e/serve.sh",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
})
