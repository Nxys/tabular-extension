# 实现计划：修复集成测试

## 概述

本实现计划将修复 39 个失败的集成测试。核心策略是修改插件默认状态为启用（`enabled: true`），并优化测试辅助函数的等待时间，确保插件在测试环境中正确初始化。

## 任务列表

- [ ] 1. 修改插件默认启用状态
  - [ ] 1.1 修改 Background 默认设置
    - 修改 `src/background/settings.ts` 中的 `DEFAULT_SETTINGS.enabled` 从 `false` 改为 `true`
    - _需求: 2.1, 2.2_
  
  - [ ] 1.2 修改 Content Script 默认设置
    - 修改 `src/content/index.ts` 中 `initializeSettings` 方法的默认值，确保与 Background 一致
    - 将 `const defaults: PluginSettings = { enabled: false, ... }` 改为 `{ enabled: true, ... }`
    - _需求: 2.1, 2.2_
  
  - [ ] 1.3 验证默认状态修改
    - 运行集成测试，观察失败数量变化
    - 检查是否有测试因默认启用而通过
    - _需求: 2.1, 2.2_

- [ ] 2. 优化测试辅助函数
  - [ ] 2.1 简化 createTestPage 函数
    - 移除 `tests/integration/helpers/extension.ts` 中 `createTestPage` 函数内的手动启用插件代码
    - 删除以下代码块：
      ```typescript
      const [background] = context.serviceWorkers();
      if (background) {
        await background.evaluate(() => {
          return chrome.storage.local.set({ 'enabled': true });
        });
      }
      await page.waitForTimeout(200);
      ```
    - 增加页面加载后的等待时间从 1000ms 到 1500ms
    - _需求: 1.1, 1.2, 3.2_
  
  - [ ] 2.2 优化 setProUser 函数
    - 修改 `tests/integration/helpers/storage.ts` 中的 `setProUser` 函数
    - 移除 `chrome.storage.local.set` 中的 `'enabled': true` 设置（依赖默认状态）
    - 增加等待时间从 200ms 到 500ms
    - _需求: 1.4, 3.3_
  
  - [ ] 2.3 优化 setFreeUser 函数
    - 修改 `tests/integration/helpers/storage.ts` 中的 `setFreeUser` 函数
    - 移除 `chrome.storage.local.set` 中的 `'enabled': true` 设置（依赖默认状态）
    - 增加等待时间从 200ms 到 500ms
    - _需求: 1.4, 3.3_
  
  - [ ] 2.4 优化 enablePlugin 函数
    - 修改 `tests/integration/helpers/storage.ts` 中的 `enablePlugin` 函数
    - 增加等待时间从 500ms 到 800ms，确保 Storage 变化事件完全传播
    - _需求: 1.5, 3.1_

- [ ] 3. 检查点 - 运行集成测试
  - 运行 `npm run test:integration` 验证所有测试是否通过
  - 如果仍有失败，分析失败原因并调整等待时间
  - 确保所有测试通过后再继续

- [ ] 4. 添加调试日志
  - [ ] 4.1 添加插件初始化日志
    - 在 `src/content/index.ts` 的 `initializeSettings` 方法中添加日志
    - 输出格式：`[Tabular] Initialized with settings: { enabled: true, panelPosition: 'center' }`
    - _需求: 4.1_
  
  - [ ] 4.2 添加表格扫描日志
    - 在 `src/content/index.ts` 的 `scanAndInjectTableButtons` 方法中添加日志
    - 输出格式：`[Tabular] Scanned X tables, injected Y buttons`
    - _需求: 4.2, 4.3_
  
  - [ ] 4.3 添加 Storage 变化日志
    - 在 `src/content/index.ts` 的 Storage 变化监听器中添加日志
    - 输出格式：`[Tabular] Settings updated: { enabled: true }`
    - _需求: 4.4_

- [ ] 5. 最终验证和清理
  - [ ] 5.1 运行完整测试套件
    - 运行 `npm run test:integration` 3 次，确保无随机失败
    - 记录测试运行时间，确保在可接受范围内（不超过原时间的 2 倍）
    - _需求: 所有需求_
  
  - [ ] 5.2 代码质量检查
    - 运行 `npm run lint` 检查代码风格
    - 运行 TypeScript 编译检查类型错误
    - 确保所有修改符合项目规范
    - _需求: 所有需求_
  
  - [ ] 5.3 清理临时文件
    - 检查 `tests/integration/fixtures/server/` 目录，清理测试生成的临时 HTML 文件
    - 确保没有遗留的调试代码
    - _需求: 所有需求_

## 注意事项

### 关键时序控制

1. **createTestPage**: 页面加载后等待 1500ms（确保 content script 完全初始化）
2. **setProUser/setFreeUser**: Storage 设置后等待 500ms（确保变化事件传播）
3. **enablePlugin**: 启用插件后等待 800ms（确保表格扫描完成）

### 测试验证标准

- 所有 39 个失败测试必须通过
- 测试运行 3 次全部通过（无随机失败）
- 测试运行时间不超过原时间的 2 倍
- 无 ESLint 或 TypeScript 错误

### 回滚计划

如果修改导致更多测试失败：
1. 回滚所有代码修改
2. 分析失败原因
3. 调整等待时间或采用其他方案

### 架构约束

- 不修改 Background 和 Content 之间的消息协议
- 不在 Content 层添加业务逻辑
- 所有修改符合三层分离架构原则
