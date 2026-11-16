import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/e2e', timeout: 60000, workers: 1, use: { baseURL: 'http://127.0.0.1:5173', headless: true }, webServer: { command: 'npm run dev -- --host 0.0.0.0', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI } });
