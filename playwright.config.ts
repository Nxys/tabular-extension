import { defineConfig } from '@playwright/test';

/**
 * Playwright 集成测试配置
 * 
 * Chrome 插件测试配置：
 * - 使用自定义 fixtures/index.ts 加载插件
 * - 必须关闭无头模式（headless: false）
 * - 使用 launchPersistentContext 加载插件
 */
export default defineConfig({
  testDir: './tests/integration',
  testMatch: '**/*.test.ts',
  fullyParallel: false, // 禁用并行以便调试
  workers: 1,
  timeout: 60000, // 增加超时时间
  reporter: [
    ['html', { open: 'never', outputFolder: 'tests/report/coverage/integration-report' }],
    ['list']
  ],
  outputDir: 'tests/report/test-results',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: false,
  },
  webServer: {
    command: 'python3 -m http.server 3000',
    port: 3000,
    cwd: 'tests/integration/fixtures/test-server',
    timeout: 10000,
  },
});
