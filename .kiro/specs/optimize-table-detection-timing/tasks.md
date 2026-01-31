# 实现计划：优化表格检测时机

## 概述

本实现计划将表格检测系统从固定延迟模式优化为智能检测模式。**遵循极简主义原则，只修改 2 个现有文件**（`src/content/index.ts` 和 `src/content/detector.ts`），不创建新文件或新类。

核心优化：
- 初始扫描延迟：1s → 智能延迟（200-500ms）
- DOM 变化防抖：3s → 500ms
- 添加智能检测（基于框架特征）
- 支持 SPA 路由切换
- 增强错误处理和降级策略

## 任务

- [x] 1. 在 Tabular 类中添加智能延迟功能
  - [x] 1.1 在 `src/content/index.ts` 中添加框架检测方法
    - 添加 `detectPageFrameworks()` 私有方法
    - 检测 Ant Design、Element UI、Arco Design 等框架类名
    - 返回布尔值表示是否检测到已知框架
    - _需求：6.1, 6.2_
  
  - [x] 1.2 在 `src/content/index.ts` 中添加智能延迟计算方法
    - 添加 `calculateSmartDelay()` 私有方法
    - 有框架返回 200ms，无框架返回 500ms
    - _需求：1.1, 6.1, 6.2_
  
  - [ ]* 1.3 为智能延迟编写属性测试
    - **属性 1: 初始扫描时效性**
    - **属性 21: 智能延迟策略**
    - **验证：需求 1.1, 6.1, 6.2**

- [x] 2. 优化 Tabular 类的初始扫描逻辑
  - [x] 2.1 修改 `src/content/index.ts` 的 `initialize()` 方法
    - 将固定 1000ms 延迟改为调用 `calculateSmartDelay()`
    - 保持其他逻辑不变
    - _需求：1.1, 1.2_
  
  - [ ]* 2.2 为初始扫描编写属性测试
    - **属性 2: 检测后立即注入**
    - **属性 3: 批量处理完整性**
    - **验证：需求 1.2, 1.3**

- [x] 3. 优化 Tabular 类的 DOM 监听防抖
  - [x] 3.1 修改 `src/content/index.ts` 的 MutationObserver 回调
    - 将防抖时间从 3000ms 改为 500ms
    - 提取插件元素过滤逻辑到 `isPluginMutation()` 私有方法
    - _需求：2.1, 2.3, 2.4_
  
  - [ ]* 3.2 为防抖机制编写属性测试
    - **属性 5: 防抖机制**
    - **属性 7: 插件元素过滤**
    - **属性 15: 防抖任务取消**
    - **验证：需求 2.1, 2.3, 2.4**

- [x] 4. 在 Tabular 类中添加 SPA 路由检测
  - [x] 4.1 在 `src/content/index.ts` 中添加 URL 监听字段
    - 添加 `currentURL` 私有字段
    - 添加 `urlCheckInterval` 私有字段
    - _需求：5.1_
  
  - [x] 4.2 在 `src/content/index.ts` 中添加 URL 变化检测方法
    - 添加 `checkURLChange()` 私有方法
    - 检测主路由变化（pathname），忽略 hash 和 query
    - 每 500ms 检查一次
    - _需求：5.1, 5.4_
  
  - [x] 4.3 在 `src/content/index.ts` 中添加路由切换处理方法
    - 添加 `handleRouteChange()` 私有方法
    - 添加 `removeAllExportButtons()` 私有方法
    - 清理所有按钮，重置 `injectedTables`，重新扫描
    - _需求：5.2, 5.3_
  
  - [x] 4.4 在 `initialize()` 方法中启动 URL 监听
    - 初始化 `currentURL`
    - 启动 `setInterval` 调用 `checkURLChange()`
    - _需求：5.1_
  
  - [x] 4.5 在 `cleanup()` 方法中清理 URL 监听
    - 清理 `urlCheckInterval`
    - _需求：5.1_
  
  - [ ]* 4.6 为 SPA 路由检测编写属性测试
    - **属性 17: URL 变化检测**
    - **属性 18: 路由切换清理**
    - **属性 19: 路由切换后重新扫描**
    - **属性 20: 嵌套路由过滤**
    - **验证：需求 5.1, 5.2, 5.3, 5.4**

- [x] 5. 在 Tabular 类中添加错误处理和降级策略
  - [x] 5.1 在 `src/content/index.ts` 中添加错误处理字段
    - 添加 `failureCount` 私有字段
    - 添加 `fallbackMode` 私有字段
    - 添加 `fallbackInterval` 私有字段
    - _需求：7.2, 7.4, 7.5_
  
  - [x] 5.2 修改 `scanAndInjectTableButtons()` 方法添加错误处理
    - 用 try-catch 包裹现有逻辑
    - 成功时重置 `failureCount`，退出降级模式
    - 失败时增加 `failureCount`，达到 3 次进入降级模式
    - _需求：1.4, 7.1, 7.3, 7.4_
  
  - [x] 5.3 在 `src/content/index.ts` 中添加降级模式方法
    - 添加 `enterFallbackMode()` 私有方法（停止 Observer，启动 5s 轮询）
    - 添加 `exitFallbackMode()` 私有方法（停止轮询，重启 Observer）
    - 添加 `restartMutationObserver()` 私有方法
    - _需求：7.2, 7.4, 7.5_
  
  - [x] 5.4 在 `cleanup()` 方法中清理降级模式
    - 清理 `fallbackInterval`
    - _需求：7.2_
  
  - [ ]* 5.5 为错误处理编写属性测试
    - **属性 4: 错误隔离**
    - **属性 24: Observer 失败降级**
    - **属性 25: 失败阈值暂停**
    - **属性 26: 手动恢复机制**
    - **验证：需求 1.4, 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 6. 检查点 - 确保所有测试通过
  - 运行 `npm test` 确保所有单元测试通过
  - 如有问题请询问用户

- [x] 7. 编写集成测试
  - [x] 7.1 编写初始扫描集成测试（`tests/integration/table-detection-timing.test.ts`）
    - 测试页面加载后智能延迟生效
    - 测试有框架时 200ms 内注入按钮
    - 测试无框架时 500ms 内注入按钮
    - _需求：1.1, 1.2, 6.1, 6.2_
  
  - [x] 7.2 编写增量扫描集成测试
    - 测试动态添加表格后 500ms 内注入按钮
    - 测试防抖机制（连续变化只触发一次）
    - _需求：2.1, 2.2, 3.1_
  
  - [x] 7.3 编写 SPA 路由切换集成测试
    - 测试路由切换后清理旧按钮
    - 测试路由切换后重新扫描
    - 测试 hash 和 query 变化不触发
    - _需求：5.1, 5.2, 5.3, 5.4_
  
  - [x] 7.4 编写错误降级集成测试
    - 测试连续失败进入降级模式
    - 测试降级模式下定时轮询
    - 测试成功后退出降级模式
    - _需求：7.2, 7.4, 7.5_

- [x] 8. 最终检查点 - 确保所有测试通过
  - 运行 `npm test` 确保所有单元测试通过
  - 运行 `npm run test:integration` 确保所有集成测试通过
  - 如有问题请询问用户

## 注意事项

- **极简主义**：只修改 `src/content/index.ts` 和 `src/content/detector.ts`，不创建新文件
- **不创建新类**：所有新功能都在 `Tabular` 类中添加私有方法
- 任务标记 `*` 的为可选任务，可以跳过以加快 MVP 开发
- 每个任务引用具体的需求编号，确保可追溯性
- 检查点任务确保增量验证，及早发现问题
- 属性测试验证通用正确性属性
- 集成测试验证端到端流程
