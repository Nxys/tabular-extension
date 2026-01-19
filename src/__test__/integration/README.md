# E2E 集成测试

本目录包含基于 Playwright 的端到端集成测试，所有测试在真实浏览器环境中运行。

## 目录结构

```
integration/
├── fixtures/              # 测试固件
│   ├── test-pages.ts     # 测试页面生成器
│   └── test-server/      # 测试服务器静态文件
│       └── index.html    # 测试页面
├── helpers/              # 测试辅助工具
│   └── extension-helper.ts  # 插件测试辅助函数
├── basic-functionality.test.ts    # 基础功能测试
├── user-interactions.test.ts      # 用户交互测试
├── error-handling.test.ts         # 错误处理测试
├── demo.test.ts                   # 演示测试
└── README.md            # 本文件
```

## 测试策略

### 真实浏览器测试
- 所有测试在真实 Chrome 浏览器中运行
- 加载实际构建的插件扩展
- 测试真实的用户交互和 DOM 操作
- 验证完整的消息通信流程

### 测试覆盖
1. **基础功能测试** (`basic-functionality.test.ts`)
   - 文本提取
   - 表格检测
   - 复杂表格处理
   - 嵌套表格
   - 不规则表格

2. **用户交互测试** (`user-interactions.test.ts`)
   - 复制功能
   - 导出 CSV
   - 键盘快捷键
   - 多次选择
   - 快速连续操作
   - 页面滚动
   - 动态内容

3. **错误处理测试** (`error-handling.test.ts`)
   - 空表格
   - 格式错误
   - 超大表格
   - 特殊字符
   - 网络错误
   - 内存压力
   - DOM 变化
   - 权限错误

## 运行测试

### 前置条件
```bash
# 1. 构建插件
npm run build

# 2. 安装 Playwright 浏览器（首次运行）
npx playwright install chromium
```

### 运行命令
```bash
# 运行所有 E2E 测试
npm run test:e2e

# 运行特定测试文件
npm run test:e2e -- basic-functionality.test.ts

# 调试模式（打开浏览器）
npm run test:e2e:debug

# UI 模式（交互式测试）
npm run test:e2e:ui

# 在 CI 环境运行
CI=1 npm run test:e2e
```

### 配置说明
Playwright 配置已统一到 `package.json` 中的 `playwright` 字段，与 Jest 配置保持一致的风格。

### 使用 Playwright MCP 测试
```bash
# 通过 MCP 协议手动测试
# 1. 确保 Playwright MCP Server 已配置
# 2. 使用 Kiro 的 Playwright 工具进行交互式测试
```

## 测试辅助工具

### extension-helper.ts
提供插件测试的辅助函数：
- `waitForExtensionLoad()` - 等待插件加载
- `createTestPage()` - 创建测试页面
- `selectText()` - 模拟文本选择
- `selectTable()` - 模拟表格选择
- `waitForPanel()` - 等待插件面板显示
- `isPanelVisible()` - 检查面板可见性
- `clickPanelButton()` - 点击面板按钮
- `getPanelText()` - 获取面板文本
- `getClipboardContent()` - 获取剪贴板内容

### test-pages.ts
提供测试页面生成器：
- `generateTablePage()` - 生成表格测试页面
- `generateComplexTablePage()` - 生成复杂表格页面
- `generateTextPage()` - 生成文本测试页面
- `generateMixedContentPage()` - 生成混合内容页面

## 测试原则

### 1. 真实环境
- 不使用 mock，测试真实的浏览器行为
- 加载实际构建的插件
- 测试真实的 DOM 操作和事件

### 2. 完整流程
- 测试从用户交互到 UI 反馈的完整流程
- 验证 Content 和 Background 的消息通信
- 检查 UI 渲染和用户反馈

### 3. 边界情况
- 测试空数据、错误数据
- 测试极限情况（大数据量、高频操作）
- 测试异常场景（网络错误、权限问题）

### 4. 架构遵循
- 验证三层架构的正确实现
- 确保 Content 层无业务逻辑
- 验证消息协议的正确使用

## 调试技巧

### 1. 查看浏览器
```bash
# 使用 headed 模式查看浏览器
npm run test:e2e:debug
```

### 2. 截图和视频
测试失败时自动生成：
- 截图：`src/__test__/coverage/e2e-report/`
- 视频：仅在失败时保留
- 追踪：`trace.zip` 可在 Playwright Trace Viewer 中查看

### 3. 控制台日志
```typescript
// 在测试中监听控制台
page.on('console', msg => console.log('浏览器:', msg.text()));
```

### 4. 断点调试
```typescript
// 在测试中添加断点
await page.pause(); // 暂停执行，打开 Playwright Inspector
```

## 注意事项

1. **构建要求**：运行测试前必须先构建插件 (`npm run build`)
2. **端口占用**：测试服务器使用 3000 端口，确保端口未被占用
3. **浏览器版本**：使用 Playwright 管理的 Chromium 版本
4. **并发限制**：CI 环境使用单 worker，本地可并发
5. **超时设置**：默认超时 30 秒，可在配置中调整

## CI/CD 集成

```yaml
# GitHub Actions 示例
- name: Install dependencies
  run: npm ci

- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Build extension
  run: npm run build

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: src/__test__/coverage/e2e-report/
```

## 常见问题

### Q: 测试失败提示找不到插件？
A: 确保先运行 `npm run build` 构建插件。

### Q: 端口 3000 被占用？
A: 修改 `package.json` 中 `playwright.webServer` 的端口配置。

### Q: 浏览器未安装？
A: 运行 `npx playwright install chromium`。

### Q: 测试超时？
A: 检查网络连接，或增加 `package.json` 中 `playwright` 配置的超时时间。

## 参考资料

- [Playwright 文档](https://playwright.dev/)
- [Chrome 扩展测试指南](https://developer.chrome.com/docs/extensions/mv3/testing/)
- [项目架构规范](../../../docs/STRUCTURE.md)