# 需求文档：使用限制系统

## 简介

本需求文档定义了浏览器框选复制插件的使用限制系统。这是一个**非破坏性商业逻辑接入**，目标是在保持第一版用户体验与功能完全不变的前提下，引入免费使用限制和Pro解锁能力的基础架构。

核心原则：
- 限制逻辑只存在于流程层，不进入算法层
- 核心算法模块（collect → layout → format）必须保持纯函数特性
- 限制点应集中、单向、难绕过
- 免费版逻辑 ≠ 算法降级（只限频次/输出）
- 未来可平滑接入付费校验（但当前不实现）

当前版本只实现免费策略（每日使用次数限制），不实现Pro付费逻辑，不引入网络请求，不依赖服务器。

## 术语表

- **Usage_Module（使用控制模块）**: 统一的使用限制判断和消耗入口
- **Policy_Module（策略模块）**: 定义免费版和Pro版的使用策略
- **Storage_Module（存储模块）**: 负责使用次数的持久化和跨天重置
- **Usage_State（使用状态）**: 包含是否允许使用、剩余次数等信息的状态对象
- **Free_Policy（免费策略）**: 当前版本实现的每日使用次数限制策略
- **Pro_Policy（Pro策略）**: 预留的Pro版策略接口（当前不实现）
- **Extractor（文本提取器）**: 核心算法模块，包含 collect、layout、format 三段式处理
- **Content_Controller（内容控制器）**: content.ts 中的主流程控制逻辑
- **Panel（结果面板）**: 显示提取结果和限制提示的UI组件

## 需求

### 需求 1：Usage 模块 - 统一使用控制入口

**用户故事：** 作为开发者，我希望有一个统一的使用控制入口，负责判断是否允许执行提取操作和消耗使用额度。

#### 验收标准

1. THE System SHALL 创建 `content/usage/usage.ts` 文件
2. THE `usage.ts` SHALL 导出 `UsageState` 接口，包含 `allowed: boolean`、`reason?: 'limit-reached'` 和 `remaining?: number` 三个字段
3. THE `usage.ts` SHALL 导出 `checkUsage()` 函数，返回 `UsageState`
4. THE `usage.ts` SHALL 导出 `consumeUsage()` 函数，返回 `void`
5. WHEN 调用 checkUsage 时，THE System SHALL 只判断不修改状态
6. WHEN 调用 consumeUsage 时，THE System SHALL 只在成功提取后调用
7. THE `usage.ts` SHALL NOT 直接访问 UI 组件
8. THE `usage.ts` SHALL NOT 弹出任何窗口或提示
9. THE `usage.ts` SHALL NOT 调用 extractor 模块
10. THE `usage.ts` SHALL NOT 调用 panel 模块

### 需求 2：Policy 模块 - 策略定义层

**用户故事：** 作为开发者，我希望有一个独立的策略定义模块，集中管理免费版和Pro版的使用策略。

#### 验收标准

1. THE System SHALL 创建 `content/usage/policy.ts` 文件
2. THE `policy.ts` SHALL 导出 `UsagePolicy` 接口，包含 `maxPerDay: number` 字段
3. THE `policy.ts` SHALL 导出 `FREE_POLICY` 常量，设置 `maxPerDay: 20`
4. THE `policy.ts` SHALL NOT 实现 Pro 策略（仅预留接口）
5. THE `policy.ts` SHALL NOT 判断用户身份
6. THE `policy.ts` SHALL NOT 执行任何 UI 行为
7. THE `policy.ts` SHALL NOT 访问 storage
8. THE `policy.ts` SHALL NOT 包含任何业务逻辑

### 需求 3：Storage 模块 - 状态持久化

**用户故事：** 作为开发者，我希望有一个专门的存储模块，负责使用次数的持久化和自动跨天重置。

#### 验收标准

1. THE System SHALL 创建 `content/usage/storage.ts` 文件
2. THE `storage.ts` SHALL 导出 `getUsageCount()` 函数，返回 `Promise<number>`
3. THE `storage.ts` SHALL 导出 `incrementUsage()` 函数，返回 `Promise<void>`
4. THE `storage.ts` SHALL 导出 `resetIfNewDay()` 函数，返回 `Promise<void>`
5. WHEN 存储数据时，THE System SHALL 使用 `chrome.storage.local`
6. WHEN 存储数据时，THE System SHALL 保存当日使用次数和最后使用日期
7. WHEN 调用 resetIfNewDay 时，THE System SHALL 检测日期变化并自动重置计数
8. THE `storage.ts` SHALL NOT 暴露给其他模块直接使用（只被 usage.ts 调用）
9. THE `storage.ts` SHALL NOT 包含任何策略判断逻辑
10. THE `storage.ts` SHALL NOT 访问 UI 组件

### 需求 4：Content 控制器集成 - 非侵入式接入

**用户故事：** 作为开发者，我希望在主流程中以最小侵入方式接入使用限制，不影响现有代码结构。

#### 验收标准

1. WHEN 用户触发提取操作时，THE Content_Controller SHALL 在调用 extractText 之前调用 checkUsage()
2. WHEN checkUsage 返回 allowed: false 时，THE Content_Controller SHALL 调用 panel.showLimitReached() 并终止流程
3. WHEN checkUsage 返回 allowed: true 时，THE Content_Controller SHALL 继续执行 extractText
4. WHEN 提取成功并展示结果后，THE Content_Controller SHALL 调用 consumeUsage()
5. THE Content_Controller SHALL NOT 在 usage 模块和 extractor 模块之间建立依赖
6. THE Content_Controller SHALL NOT 在 usage 模块和 panel 模块之间建立依赖
7. THE Content_Controller SHALL NOT 修改 extractText 的接口或实现

### 需求 5：Panel 扩展 - 限制提示展示

**用户故事：** 作为用户，我希望在达到使用限制时看到清晰的提示信息，了解当前状态。

#### 验收标准

1. THE Panel SHALL 新增 `showLimitReached()` 方法
2. WHEN 调用 showLimitReached 时，THE Panel SHALL 显示"今日免费次数已用完"的提示
3. WHEN 显示限制提示时，THE Panel SHALL 显示"升级 Pro（占位）"按钮
4. THE Panel SHALL NOT 实现支付逻辑
5. THE Panel SHALL NOT 实现Pro校验逻辑
6. THE Panel SHALL 保持现有的 show() 方法不变
7. THE Panel SHALL 保持现有的所有功能不变（编辑、拖动、复制、关闭）

### 需求 6：核心算法隔离 - 严格禁止侵入

**用户故事：** 作为架构负责人，我希望核心算法模块完全不受商业逻辑影响，保持纯函数特性。

#### 验收标准

1. THE System SHALL NOT 在 `content/extractor/collect.ts` 中添加任何 usage 相关代码
2. THE System SHALL NOT 在 `content/extractor/layout.ts` 中添加任何 usage 相关代码
3. THE System SHALL NOT 在 `content/extractor/format.ts` 中添加任何 usage 相关代码
4. THE System SHALL NOT 在 `content/extractor/index.ts` 中添加任何 usage 相关代码
5. THE System SHALL NOT 通过降低算法质量实现免费限制
6. THE System SHALL NOT 修改 extractor 的任何接口
7. THE System SHALL NOT 让 extractor 反向依赖 usage 模块
8. THE System SHALL NOT 让 usage 模块调用 extractor 模块

### 需求 7：依赖方向控制 - 单向依赖

**用户故事：** 作为开发者，我希望模块间的依赖关系清晰且单向，避免循环依赖。

#### 验收标准

1. THE System SHALL 确保依赖方向为：content.ts → usage.ts → storage.ts
2. THE System SHALL 确保依赖方向为：content.ts → usage.ts → policy.ts
3. THE System SHALL 确保 usage.ts 不依赖 panel.ts
4. THE System SHALL 确保 usage.ts 不依赖 extractor
5. THE System SHALL 确保 storage.ts 不依赖任何业务模块
6. THE System SHALL 确保 policy.ts 不依赖任何业务模块
7. THE System SHALL 确保 extractor 不依赖 usage 模块

### 需求 8：免费策略实现 - 每日次数限制

**用户故事：** 作为免费用户，我希望每天有固定的免费使用次数，次日自动重置。

#### 验收标准

1. WHEN 用户首次使用时，THE System SHALL 允许执行提取操作
2. WHEN 用户使用次数未达到限制时，THE System SHALL 允许继续使用
3. WHEN 用户使用次数达到每日上限（20次）时，THE System SHALL 拒绝继续使用
4. WHEN 用户达到限制后尝试使用时，THE System SHALL 显示限制提示
5. WHEN 日期变更时，THE System SHALL 自动重置使用次数为0
6. WHEN 重置后，THE System SHALL 允许用户继续使用
7. THE System SHALL 在本地存储使用记录，不发送网络请求

### 需求 9：Pro 策略预留 - 接口不实现

**用户故事：** 作为开发者，我希望为未来的Pro功能预留接口，但当前版本不实现任何Pro逻辑。

#### 验收标准

1. THE System SHALL 在 policy.ts 中预留 `PRO_POLICY` 的接口定义位置（注释形式）
2. THE System SHALL 在 usage.ts 中预留策略切换的接口位置（注释形式）
3. THE System SHALL NOT 实现 Pro 策略的任何逻辑
4. THE System SHALL NOT 实现用户身份判断
5. THE System SHALL NOT 实现付费校验
6. THE System SHALL NOT 实现远程验证
7. THE System SHALL NOT 新增任何权限

### 需求 10：构建与测试保持不变

**用户故事：** 作为开发者，我希望新增的使用限制系统不影响现有的构建和测试流程。

#### 验收标准

1. THE System SHALL 确保构建产物结构保持不变
2. THE System SHALL 确保所有现有测试通过
3. THE System SHALL 确保 manifest.json 保持不变
4. THE System SHALL NOT 引入新的第三方依赖
5. THE System SHALL NOT 新增任何浏览器权限
6. THE System SHALL NOT 修改 webpack 配置（除非必要）

### 需求 11：用户体验一致性 - 未达限制时

**用户故事：** 作为用户，我希望在未达到使用限制时，插件的行为与第一版完全一致。

#### 验收标准

1. WHEN 用户使用次数未达到限制时，THE System SHALL 提供与第一版完全相同的功能
2. THE System SHALL 保持相同的 UI 外观
3. THE System SHALL 保持相同的交互行为
4. THE System SHALL 保持相同的响应速度
5. THE System SHALL 保持相同的文本提取结果
6. THE System SHALL NOT 在未达限制时显示任何额外提示
7. THE System SHALL NOT 在未达限制时改变任何现有行为

### 需求 12：限制点集中 - 难以绕过

**用户故事：** 作为产品负责人，我希望限制点集中且难以绕过，确保商业策略有效执行。

#### 验收标准

1. THE System SHALL 在唯一的入口点（content.ts 调用 extractText 前）检查使用限制
2. THE System SHALL 确保无法通过直接调用 extractor 绕过限制
3. THE System SHALL 确保无法通过修改前端代码轻易绕过限制
4. THE System SHALL 将使用次数存储在 chrome.storage.local 中
5. THE System SHALL 在每次成功提取后立即更新使用次数
6. THE System SHALL NOT 在客户端暴露绕过限制的接口
7. THE System SHALL NOT 允许通过清除缓存重置使用次数（基于日期判断）

