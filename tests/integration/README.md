# 集成测试指南

## 概述

本项目使用 Playwright 进行 Chrome 插件的端到端集成测试。所有测试在真实浏览器环境中运行。

## 测试框架

### 自定义 Test Fixture

由于 Chrome 插件测试需要使用 `launchPersistentContext` 加载插件，我们创建了自定义的 test fixture：

```typescript
import { test, expect } from './fixtures';

test('测试插件功能', async ({ page, extensionId }) => {
  // page: 已加载插件的页面实例
  // extensionId: 自动获取的插件 ID
  
  // 访问插件页面
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  
  // 执行测试...
});
```

### 关键特性

1. **自动加载插件**：使用 `launchPersistentContext` 自动加载 `build/extension` 目录中的插件
2. **自动获取 Extension ID**：通过 Service Worker 自动提取插件 ID
3. **必须关闭无头模式**：Chrome 插件测试必须在有头模式下运行（`headless: false`）

## 测试命令

```bash
# 运行所有集成测试
npm run test:integration

# UI 模式（推荐用于调试）
npm run test:integration:ui

# 调试模式
npm run test:integration:debug
```

## 测试结构

```
tests/integration/
├── fixtures/
│   ├── index.ts             # 自定义 test fixture（插件加载）
│   ├── test-pages.ts        # 测试页面生成器
│   ├── test-data.ts         # 测试数据生成器
│   └── test-server/         # HTTP 测试服务器
├── helpers/
│   ├── extension-helper.ts  # 插件操作辅助函数
│   ├── message-spy.ts       # 消息监听工具
│   └── storage-helper.ts    # Storage 操作工具
└── *.test.ts                # 测试文件
```

## 编写测试

### 1. 导入自定义 fixture

```typescript
import { test, expect } from './fixtures';
```

### 2. 使用 extensionId

```typescript
test('访问插件页面', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  // ...
});
```

### 3. 测试 Content Script

```typescript
test('测试内容脚本', async ({ page }) => {
  // 导航到测试页面
  await page.goto('http://localhost:3000/index.html');
  
  // Content Script 会自动注入
  // 执行测试...
});
```

## 测试辅助工具

### extension-helper.ts

提供插件操作的辅助函数：

- `dragSelection()` - 模拟鼠标框选
- `waitForResultPanel()` - 等待结果面板显示
- `getPanelTableData()` - 获取面板中的表格数据
- `hasUpgradePrompt()` - 检查升级提示
- `getRowLimitInfo()` - 获取行数限制信息
- `createTestPage()` - 创建测试页面
- `selectText()` - 模拟文本选择
- `selectTable()` - 模拟表格选择

### storage-helper.ts

提供 Storage 操作的辅助函数：

- `setProUser()` - 设置为 Pro 用户
- `setFreeUser()` - 设置为 Free 用户
- `setTrialCount()` - 设置试用次数
- `getTrialCount()` - 获取试用次数
- `clearStorage()` - 清空所有数据

### message-spy.ts

提供消息监听的辅助类：

- `start()` - 开始监听消息
- `stop()` - 停止监听
- `getMessages()` - 获取所有消息
- `getLastRequest()` - 获取最后的 REQUEST_ACTION
- `getLastResult()` - 获取最后的 ACTION_RESULT

## 测试覆盖

### 1. 基础功能测试
- 文本提取
- 表格检测
- 数据导出
- 特殊字符处理

### 2. Pro 功能测试
- Free 用户行数限制（5 行）
- Pro 用户无限制
- 试用次数管理
- 升级提示

### 3. 消息协议测试
- REQUEST_ACTION 消息格式
- ACTION_RESULT 消息格式
- UI 响应正确性
- 异常兜底机制

### 4. 用户交互测试
- 鼠标框选
- 面板显示
- 快捷键
- 连续操作

### 5. 错误处理测试
- 格式错误 HTML
- 超大区域
- Storage 损坏
- 网络请求失败

## 注意事项

1. **构建插件**：测试前必须先构建插件
   ```bash
   npm run build
   npm run extension
   ```

2. **HTTP 服务器**：测试会自动启动 HTTP 服务器（端口 3000）

3. **无头模式**：插件测试必须关闭无头模式

4. **并行执行**：当前配置为单线程执行（`workers: 1`）以便调试

## 测试报告

测试完成后会生成以下报告：

- HTML 报告：`tests/report/coverage/integration-report/index.html`
- 测试结果：`tests/report/test-results/`
- 失败截图和视频：自动保存在测试结果目录

## 故障排查

### 插件未加载

确保已构建插件：
```bash
npm run build
npm run extension
```

### Content Script 未注入

检查 manifest.json 中的 content_scripts 配置，确保匹配测试页面的 URL。

### 测试超时

增加 playwright.config.ts 中的 timeout 配置。

### 端口被占用

修改 playwright.config.ts 中 webServer 的端口配置。

## 参考资料

- [Playwright 文档](https://playwright.dev/)
- [Chrome 扩展测试指南](https://developer.chrome.com/docs/extensions/mv3/testing/)
- [项目架构规范](../../docs/STRUCTURE.md)
