# 实现计划：使用限制系统

## 概述

本实现计划将使用限制系统以非破坏性方式集成到现有的浏览器框选复制插件中。实现将严格遵循"限制逻辑只在流程层，不进入算法层"的原则，确保核心算法模块（collect → layout → format）保持纯净。

## 任务

- [x] 1. 创建 Storage 模块 - 状态持久化层
  - 创建 `src/content/usage/storage.ts` 文件
  - 实现 `getUsageCount()`、`incrementUsage()`、`resetIfNewDay()` 函数
  - 使用 `chrome.storage.local` 存储使用次数和日期
  - 实现跨天自动重置逻辑
  - 实现错误处理和降级策略（内存fallback）
  - _需求：3.1, 3.2, 3.3, 3.4, 3.6, 3.7_

- [x] 1.1 为 Storage 模块编写单元测试
  - 测试 getUsageCount 返回正确的计数
  - 测试 incrementUsage 正确增加计数
  - 测试 resetIfNewDay 在日期变化时重置计数
  - 测试 resetIfNewDay 在同一天不重置计数
  - 测试 storage 访问失败时的降级策略
  - Mock chrome.storage.local API
  - _需求：3.6, 3.7_

- [x] 1.2 为 Storage 模块编写属性测试
  - **属性 3：跨天重置**
  - **验证需求：3.7, 8.5**
  - 对于任意日期变化，调用 resetIfNewDay 后，使用次数应该为 0

- [x] 2. 创建 Policy 模块 - 策略定义层
  - 创建 `src/content/usage/policy.ts` 文件
  - 定义 `UsagePolicy` 接口
  - 导出 `FREE_POLICY` 常量（maxPerDay: 20）
  - 添加 Pro 策略的注释预留位置
  - _需求：2.1, 2.2, 2.3_

- [x] 2.1 为 Policy 模块编写单元测试
  - 测试 UsagePolicy 接口存在
  - 测试 FREE_POLICY.maxPerDay 等于 20
  - _需求：2.3_

- [x] 3. 创建 Usage 模块 - 统一使用控制入口
  - 创建 `src/content/usage/usage.ts` 文件
  - 定义 `UsageState` 接口
  - 实现 `checkUsage()` 函数（只判断不修改状态）
  - 实现 `consumeUsage()` 函数（调用 incrementUsage）
  - 导入 storage 和 policy 模块
  - 确保不访问 UI 组件、extractor 或 panel
  - _需求：1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 3.1 为 Usage 模块编写单元测试
  - 测试 checkUsage 在未达限制时返回 allowed: true
  - 测试 checkUsage 在达到限制时返回 allowed: false
  - 测试 consumeUsage 正确增加计数
  - Mock storage 模块
  - _需求：1.5, 8.2, 8.3_

- [x] 3.2 为 Usage 模块编写属性测试
  - **属性 1：checkUsage 幂等性**
  - **验证需求：1.5**
  - 对于任意系统状态，多次调用 checkUsage 应该返回相同结果

- [x] 3.3 为 Usage 模块编写属性测试
  - **属性 4：使用次数限制**
  - **验证需求：8.2, 8.3**
  - 对于任意使用次数 n，当 n < 20 时 allowed 为 true，当 n >= 20 时 allowed 为 false

- [x] 3.4 为 Usage 模块编写属性测试
  - **属性 5：使用次数递增**
  - **验证需求：12.5**
  - 对于任意初始使用次数 n，调用 consumeUsage 后，使用次数应该为 n + 1

- [x] 4. 检查点 - 确保 Usage 模块测试通过
  - 确保所有 usage 相关的单元测试和属性测试通过
  - 确认模块间依赖关系正确（usage → storage, usage → policy）
  - 确认没有反向依赖或循环依赖

- [x] 5. 扩展 Panel 模块 - 添加限制提示
  - 在 `src/content/panel.ts` 中添加 `showLimitReached()` 方法
  - 实现限制提示的 UI（标题、消息、升级按钮占位）
  - 复用现有的 createElement 逻辑
  - 确保不实现支付逻辑和 Pro 校验逻辑
  - 确保现有的 show() 方法和所有功能保持不变
  - _需求：5.1, 5.2, 5.3, 5.6, 5.7_

- [x] 5.1 为 Panel 扩展编写单元测试
  - 测试 showLimitReached 方法存在
  - 测试 showLimitReached 显示正确的提示文本
  - 测试 showLimitReached 显示升级按钮
  - 测试 show 方法保持不变（回归测试）
  - _需求：5.1, 5.2, 5.3, 5.6, 5.7_

- [x] 6. 集成到 Content 控制器 - 非侵入式接入
  - 修改 `src/content/content.ts` 中的 `handleMouseUp` 方法
  - 在调用 extractText 之前调用 checkUsage()
  - 当 allowed: false 时，调用 panel.showLimitReached() 并终止流程
  - 当 allowed: true 时，继续执行 extractText
  - 在成功展示结果后调用 consumeUsage()
  - 确保不修改 extractText 的接口或实现
  - 确保不在 usage 和 extractor 之间建立依赖
  - _需求：4.1, 4.2, 4.3, 4.4, 4.7_

- [x] 6.1 为 Content 集成编写集成测试
  - 测试 content.ts 在 extractText 前调用 checkUsage
  - 测试 content.ts 在 allowed: false 时调用 panel.showLimitReached
  - 测试 content.ts 在 allowed: true 时继续执行 extractText
  - 测试 content.ts 在成功提取后调用 consumeUsage
  - Mock usage 模块和 panel 模块
  - _需求：4.1, 4.2, 4.3, 4.4_

- [ ] 7. 检查点 - 确保集成测试通过
  - 确保所有集成测试通过
  - 手动测试完整流程：从 0 次到 20 次再到限制
  - 验证限制提示正确显示
  - 验证跨天重置功能正常工作

- [ ]* 8. 编写端到端属性测试
  - **属性 7：未达限制时行为一致性**
  - **验证需求：11.1-11.7**
  - 对于任意使用次数 n < 20，系统的提取行为应该与没有使用限制系统时完全一致

- [ ]* 9. 运行回归测试
  - 运行所有现有测试，确保通过
  - 验证 extractor 模块完全不受影响
  - 验证 selection 模块完全不受影响
  - 验证 panel 的现有功能（show、hide、copy）正常工作
  - _需求：10.2, 11.1-11.7_

- [ ] 10. 代码审查和架构验证
  - 验证核心算法模块（collect、layout、format、index）没有任何 usage 相关代码
  - 验证依赖方向正确：content → usage → storage/policy
  - 验证 usage 不依赖 panel、extractor
  - 验证 storage 和 policy 不依赖任何业务模块
  - 验证构建产物结构保持不变
  - _需求：6.1-6.8, 7.1-7.7, 10.1_

- [ ] 11. 最终检查点 - 确保所有测试通过
  - 运行完整的测试套件（单元测试 + 属性测试 + 集成测试 + 回归测试）
  - 确保测试覆盖率 > 90%
  - 验证所有需求都有对应的测试
  - 手动测试各种边界情况

## 注意事项

### 严格禁止修改的文件
- `src/content/extractor/collect.ts`
- `src/content/extractor/layout.ts`
- `src/content/extractor/format.ts`
- `src/content/extractor/index.ts`

### 最小修改的文件
- `src/content/content.ts`：只在 handleMouseUp 中添加使用检查
- `src/content/panel.ts`：只添加 showLimitReached 方法

### 新增的文件
- `src/content/usage/usage.ts`
- `src/content/usage/policy.ts`
- `src/content/usage/storage.ts`

### 测试文件
- 所有测试文件放在 `test/` 目录下
- 使用 Jest 作为测试框架
- 使用 fast-check 进行属性测试（已安装）
- Mock chrome.storage.local API

### 依赖关系
```
content.ts → usage.ts → storage.ts
                      → policy.ts
```

### 测试策略
- 标记 `*` 的任务为可选测试任务（可以跳过以加快MVP开发）
- 单元测试验证各模块独立功能
- 属性测试验证通用属性（每个属性至少 100 次迭代）
- 集成测试验证模块协作
- 回归测试确保现有功能不受影响
