import { defineConfig, devices } from '@playwright/test';

import { frameworkServer } from './shared/frameworks.js';

const framework = process.env.CSSX_VISUAL_FRAMEWORK;
const mode = process.env.CSSX_VISUAL_MODE;
const server =
  framework && mode ? frameworkServer(framework, mode === 'production' ? 'production' : 'development') : undefined;

export default defineConfig({
  testDir: '.',
  testMatch: ['**/*.spec.ts'],
  timeout: 120_000,
  expect: { timeout: 15_000, toHaveScreenshot: { animations: 'disabled', caret: 'hide' } },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  outputDir: 'test-results',
  use: {
    ...devices['Desktop Chrome'],
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
    viewport: { width: 1440, height: 1100 },
    baseURL: server?.url,
  },
  webServer: server
    ? {
        command: server.command,
        cwd: server.cwd,
        url: server.url,
        timeout: 120_000,
        reuseExistingServer: false,
      }
    : undefined,
});
