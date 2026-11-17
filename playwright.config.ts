import { defineConfig } from '@playwright/test';
const testPort = Number(process.env.TIRASI_TEST_PORT ?? 5173);
const testOrigin = `http://127.0.0.1:${testPort}`;
export default defineConfig({ testDir: './tests/e2e', timeout: 60000, workers: 1, use: { baseURL: testOrigin, headless: true, ...(process.env.CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } } : {}) }, webServer: { command: `npm run dev -- --host 0.0.0.0 --port ${testPort}`, url: testOrigin, reuseExistingServer: !process.env.CI } });
