import { defineConfig } from '@playwright/test';
const testPort = Number(process.env.TIRASI_TEST_PORT ?? 5173);
const testOrigin = `http://127.0.0.1:${testPort}`;
// The store edition is served separately; tests/e2e/store.spec.ts points at it.
const storePort = testPort + 1;
export default defineConfig({ testDir: './tests/e2e', timeout: 60000, workers: 1, use: { baseURL: testOrigin, headless: true, ...(process.env.CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } } : {}) }, webServer: [
  { command: `npm run dev -- --host 0.0.0.0 --port ${testPort}`, url: testOrigin, reuseExistingServer: !process.env.CI },
  { command: `npm run dev:store -- --host 0.0.0.0 --port ${storePort} --strictPort`, url: `http://127.0.0.1:${storePort}`, reuseExistingServer: !process.env.CI },
] });
