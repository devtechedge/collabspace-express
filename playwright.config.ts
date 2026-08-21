import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npx prisma generate && npx prisma migrate deploy && npx tsx src/index.ts',
      cwd: './server',
      url: 'http://localhost:5000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npx vite --host localhost --port 5173',
      cwd: './client',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
