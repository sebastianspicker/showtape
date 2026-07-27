import { defineConfig, devices } from '@playwright/test';

const productionServer = process.env.PLAYWRIGHT_PRODUCTION === '1';
const buildWorkspaceLibraries =
  'corepack pnpm@9.15.3 --filter @repo/shared run build && corepack pnpm@9.15.3 --filter @repo/core run build';

export default defineConfig({
  testDir: './apps/web/tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3107',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: productionServer
      ? 'corepack pnpm@9.15.3 build && corepack pnpm@9.15.3 --filter web exec next start -p 3107'
      : `${buildWorkspaceLibraries} && corepack pnpm@9.15.3 --filter web exec next dev -p 3107`,
    url: 'http://localhost:3107',
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_APPLE_MUSIC_APP_ID: 'e2e.test.app',
    },
  },
});
