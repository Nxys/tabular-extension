import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 集成测试配置
 * 
 * 注意：Playwright 不支持 package.json 配置，必须使用独立配置文件
 */
export default defineConfig({
  testDir: './test/integration',
  testMatch: '**/*.test.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'test/report/coverage/integration-report' }],
    ['list']
  ],
  outputDir: 'test/report/test-results',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: {
          args: [
            '--disable-extensions-except=./build/extension',
            '--load-extension=./build/extension',
            '--disable-web-security',
          ],
        },
      },
    },
  ],
  webServer: {
    command: 'python3 -m http.server 3000',
    port: 3000,
    cwd: 'test/integration/fixtures/test-server',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
