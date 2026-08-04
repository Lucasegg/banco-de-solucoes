import { defineConfig, devices } from '@playwright/test';
import { assertProductionSmokeTarget, PRODUCTION_ORIGIN } from './scripts/productionEnvironment.ts';

const baseURL = assertProductionSmokeTarget(process.env.PRODUCTION_BASE_URL ?? PRODUCTION_ORIGIN);
export default defineConfig({
  testDir: './e2e', testMatch: 'production-smoke.spec.ts', fullyParallel: false,
  forbidOnly: true, retries: 0, workers: 1, timeout: 30_000, expect: { timeout: 7_000 },
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
  projects: [
    { name: 'production-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'production-320', use: { browserName: 'chromium', viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true } },
  ],
});
