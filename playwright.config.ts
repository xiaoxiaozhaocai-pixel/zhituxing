import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.CI ? 'http://localhost:3333' : 'https://zhituxing.tech',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.CI ? {
    command: 'PORT=3333 pnpm start',
    port: 3333,
    timeout: 30000,
    reuseExistingServer: false,
  } : undefined,
});
