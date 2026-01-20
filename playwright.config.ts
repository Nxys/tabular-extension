import { defineConfig } from '@playwright/test';


const extensionPath = `${process.cwd()}/build/extension`;

/**
 * Playwright 集成测试配置
 * 
 * 注意：Playwright 不支持 package.json 配置，必须使用独立配置文件
 */
export default defineConfig({
  testDir: './test/integration',
  testMatch: '**/*.test.ts',
  fullyParallel: false, // 禁用并行以便调试
  workers: 1,
  timeout: 60000, // 增加超时时间
  reporter: [
    ['html', { open: 'never', outputFolder: 'test/report/coverage/integration-report' }],
    ['list']
  ],
  outputDir: 'test/report/test-results',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: false,
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        launchOptions: {
          args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
          ],
        },
      },
    },
  ],
  webServer: {
    command: 'python3 -m http.server 3000',
    port: 3000,
    cwd: 'test/integration/fixtures/test-server',
    timeout: 10000,
  },
});
