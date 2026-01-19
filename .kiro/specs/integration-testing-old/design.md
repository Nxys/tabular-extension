# 设计文档：集成测试套件

## 概述

本文档描述了 Chrome 插件集成测试套件的设计。集成测试将验证 Background 层、Content 层和 Shared 层之间的协同工作，确保消息通信协议、端到端业务流程、权限控制和错误处理的正确性。

集成测试与单元测试的关键区别：
- **单元测试**：隔离测试单个模块的功能，使用 mock 模拟依赖
- **集成测试**：测试多个模块协同工作，使用真实的模块交互，最小化 mock

## 架构

### 测试层次结构

```
集成测试套件
├── 消息通信集成测试
│   ├── Content → Background 消息传递
│   ├── Background → Content 响应传递
│   └── 消息格式验证
├── 端到端流程测试
│   ├── 文本提取完整流程
│   ├── 表格检测完整流程
│   ├── 列对齐完整流程
│   └── CSV 导出完整流程
├── 系统级集成测试
│   ├── 使用次数管理
│   ├── Pro 权限检查
│   ├── 错误处理和降级
│   ├── UI Action 执行
│   ├── 设置管理
│   └── 并发操作
└── 测试基础设施
    ├── 集成测试辅助函数
    ├── 端到端场景构建器
    ├── 消息通信模拟器
    └── 测试数据生成器
```

### 测试策略

1. **真实模块交互**：尽可能使用真实的模块，而不是 mock
2. **最小化 mock**：只 mock 外部依赖（chrome API、DOM）
3. **端到端验证**：从用户交互到 UI 响应的完整流程
4. **状态隔离**：每个测试独立，不依赖其他测试的状态

## 组件和接口

### 1. 集成测试辅助函数库

**位置**：`src/__test__/integration/helpers.ts`

**职责**：
- 提供集成测试常用的辅助函数
- 简化测试代码编写
- 提供统一的测试工具

**接口**：

```typescript
/**
 * 模拟 Content 层发送消息到 Background 层
 */
export async function sendRequestAction(
  action: ActionType,
  data?: unknown
): Promise<ActionResultMessage['payload']>;

/**
 * 模拟完整的用户交互流程
 */
export async function simulateUserAction(
  action: ActionType,
  data?: unknown,
  options?: {
    usageCount?: number;  // 当前使用次数
    hasPro?: boolean;     // 是否有 Pro 权限
  }
): Promise<ActionResultMessage['payload']>;

/**
 * 设置测试环境状态
 */
export async function setupTestState(state: {
  usageCount?: number;
  usageDate?: string;
  hasPro?: boolean;
  settings?: Partial<PluginSettings>;
}): Promise<void>;

/**
 * 清理测试环境
 */
export async function cleanupTestState(): Promise<void>;

/**
 * 等待异步操作完成
 */
export async function waitForAsync(ms?: number): Promise<void>;

/**
 * 验证消息格式
 */
export function validateMessageFormat(
  message: unknown,
  type: 'REQUEST_ACTION' | 'ACTION_RESULT'
): boolean;
```

### 2. 端到端场景构建器

**位置**：`src/__test__/integration/scenarios.ts`

**职责**：
- 构建常见的测试场景
- 提供预定义的测试数据
- 简化复杂场景的设置

**接口**：

```typescript
/**
 * 文本提取场景
 */
export interface TextExtractionScenario {
  text: string;
  expectedResult: ActionResultMessage['payload'];
}

/**
 * 表格检测场景
 */
export interface TableDetectionScenario {
  table: string[][];
  hasPro: boolean;
  expectedResult: ActionResultMessage['payload'];
}

/**
 * 使用次数限制场景
 */
export interface UsageLimitScenario {
  currentUsage: number;
  maxUsage: number;
  action: ActionType;
  expectedResult: ActionResultMessage['payload'];
}

/**
 * 创建文本提取场景
 */
export function createTextExtractionScenario(
  text: string
): TextExtractionScenario;

/**
 * 创建表格检测场景
 */
export function createTableDetectionScenario(
  table: string[][],
  hasPro: boolean
): TableDetectionScenario;

/**
 * 创建使用次数限制场景
 */
export function createUsageLimitScenario(
  currentUsage: number,
  action: ActionType
): UsageLimitScenario;

/**
 * 创建并发操作场景
 */
export function createConcurrentScenario(
  actions: ActionType[]
): Promise<ActionResultMessage['payload'][]>;
```

### 3. 消息通信模拟器

**位置**：`src/__test__/integration/messaging.ts`

**职责**：
- 模拟 chrome.runtime 消息传递
- 提供消息拦截和验证
- 支持异步消息处理

**接口**：

```typescript
/**
 * 消息拦截器
 */
export interface MessageInterceptor {
  onRequest?: (message: RequestActionMessage) => void;
  onResponse?: (response: ActionResultMessage['payload']) => void;
}

/**
 * 设置消息拦截器
 */
export function setMessageInterceptor(
  interceptor: MessageInterceptor
): void;

/**
 * 清除消息拦截器
 */
export function clearMessageInterceptor(): void;

/**
 * 获取消息历史
 */
export function getMessageHistory(): {
  requests: RequestActionMessage[];
  responses: ActionResultMessage['payload'][];
};

/**
 * 清除消息历史
 */
export function clearMessageHistory(): void;
```

### 4. 测试数据生成器

**位置**：`src/__test__/integration/generators.ts`

**职责**：
- 生成测试数据
- 提供随机数据生成
- 支持边界值生成

**接口**：

```typescript
/**
 * 生成随机文本
 */
export function generateRandomText(
  length?: number
): string;

/**
 * 生成随机表格
 */
export function generateRandomTable(
  rows?: number,
  cols?: number
): string[][];

/**
 * 生成边界值文本
 */
export function generateBoundaryText(): {
  empty: string;
  single: string;
  long: string;
  special: string;
};

/**
 * 生成边界值表格
 */
export function generateBoundaryTable(): {
  empty: string[][];
  single: string[][];
  large: string[][];
};
```

## 数据模型

### 测试状态模型

```typescript
/**
 * 测试环境状态
 */
interface TestState {
  // 使用次数状态
  usage: {
    count: number;
    date: string;
    max: number;
  };
  
  // Pro 权限状态
  pro: {
    enabled: boolean;
    features: string[];
  };
  
  // 插件设置
  settings: PluginSettings;
  
  // 消息历史
  messages: {
    requests: RequestActionMessage[];
    responses: ActionResultMessage['payload'][];
  };
}
```

### 测试场景模型

```typescript
/**
 * 测试场景定义
 */
interface TestScenario {
  // 场景名称
  name: string;
  
  // 初始状态
  initialState: Partial<TestState>;
  
  // 执行的操作
  action: ActionType;
  
  // 操作数据
  data?: unknown;
  
  // 预期结果
  expectedResult: ActionResultMessage['payload'];
  
  // 预期状态变化
  expectedStateChanges?: Partial<TestState>;
}
```

## 正确性属性

*属性是关于系统应该满足的特征或行为的形式化陈述，它们在所有有效执行中都应该成立。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*


### 属性 1：消息往返一致性
*对于任何*有效的 REQUEST_ACTION 消息，Background 层应该返回符合 ACTION_RESULT 格式的响应，且响应中的 status、uiAction 和 uiData 字段都应该存在且类型正确。
**验证：需求 1.1, 1.2**

### 属性 2：文本提取端到端正确性
*对于任何*有效的文本输入，当用户触发文本提取时，系统应该完成提取、检查使用次数、返回结果并显示面板的完整流程，且使用次数应该增加 1。
**验证：需求 2.1**

### 属性 3：使用次数限制阻止操作
*对于任何*操作类型，当使用次数达到上限时，系统应该返回 status 为 'limited'、uiAction 为 'SHOW_LIMIT_PANEL' 的响应，且不应该消耗使用次数。
**验证：需求 2.3, 6.4**

### 属性 4：Pro 权限检查一致性
*对于任何*需要 Pro 权限的功能（table-detect、column-align、csv-export），当用户没有 Pro 权限时，系统应该返回 status 为 'blocked'、uiAction 为 'SHOW_PRO_PANEL' 的响应。
**验证：需求 3.2, 4.2, 5.2, 7.1**

### 属性 5：使用次数限制优先级
*对于任何*需要 Pro 权限的功能，当同时满足"使用次数达到上限"和"没有 Pro 权限"时，系统应该优先返回使用次数限制提示（uiAction 为 'SHOW_LIMIT_PANEL'）。
**验证：需求 3.3, 4.4, 5.4, 7.4**

### 属性 6：表格检测端到端正确性
*对于任何*有效的表格输入，当用户有 Pro 权限且未达到使用限制时，系统应该完成检测、检查权限、返回结果的完整流程。
**验证：需求 3.1**

### 属性 7：列对齐端到端正确性
*对于任何*有效的表格数据，当用户有 Pro 权限且未达到使用限制时，系统应该完成对齐、消耗使用次数、返回结果的完整流程。
**验证：需求 4.1**

### 属性 8：CSV 导出端到端正确性
*对于任何*有效的表格数据，当用户有 Pro 权限且未达到使用限制时，系统应该完成 CSV 生成、消耗使用次数、返回结果的完整流程。
**验证：需求 5.1**

### 属性 9：CSV 特殊字符转义
*对于任何*包含特殊字符（逗号、引号、换行符）的表格数据，CSV 导出应该正确转义这些字符，生成的 CSV 应该能够被标准 CSV 解析器正确解析。
**验证：需求 5.3**

### 属性 10：使用次数累计正确性
*对于任何*操作序列，当所有操作都成功时，使用次数应该等于成功操作的数量（不包括不消耗次数的操作如 column-align 和 csv-export）。
**验证：需求 6.1**

### 属性 11：失败操作不消耗次数
*对于任何*操作，当操作失败（status 为 'blocked' 或 'limited'）时，使用次数不应该增加。
**验证：需求 6.2**

### 属性 12：跨天重置使用次数
*对于任何*操作，当操作发生在新的一天时，使用次数应该重置为 0，然后再累计当天的操作。
**验证：需求 6.3**

### 属性 13：Pro 功能正常执行
*对于任何*需要 Pro 权限的功能，当用户有 Pro 权限时，系统应该正常执行功能并返回 status 为 'ok' 的响应。
**验证：需求 7.2**

### 属性 14：Pro 权限状态立即生效
*对于任何*Pro 功能，当 Pro 权限状态改变后，下一次操作应该立即反映新的权限状态。
**验证：需求 7.3**

### 属性 15：异常返回兜底响应
*对于任何*操作，当 Background 层处理消息时抛出异常，系统应该返回 status 为 'blocked'、uiAction 为 'SHOW_RESULT_PANEL'、uiData.message 包含错误提示的兜底响应。
**验证：需求 8.1**

### 属性 16：UI Action 执行正确性
*对于任何*UI Action（SHOW_RESULT_PANEL、SHOW_LIMIT_PANEL、SHOW_PRO_PANEL），Content 层应该根据 uiAction 的值正确调用对应的面板显示方法。
**验证：需求 9.1, 9.2, 9.3**

### 属性 17：UI 数据渲染完整性
*对于任何*包含 uiData 的响应，Content 层应该正确渲染 uiData 中的所有字段（text、table、csv、message）。
**验证：需求 9.4**

### 属性 18：设置持久化一致性
*对于任何*设置更新，系统应该将设置持久化到 chrome.storage，并且从 storage 读取的设置应该与更新的设置一致。
**验证：需求 10.1**

### 属性 19：设置更新立即生效
*对于任何*设置更新，后续操作应该使用新的设置值，而不是旧的设置值。
**验证：需求 10.2**

### 属性 20：无效设置使用默认值
*对于任何*包含无效值的设置更新，系统应该使用默认值替代无效值。
**验证：需求 10.3**

### 属性 21：跨层设置一致性
*对于任何*设置，在 Background 层和 Content 层读取的设置值应该一致。
**验证：需求 10.4**

### 属性 22：并发操作独立处理
*对于任何*并发操作序列，每个操作应该独立处理，一个操作的结果不应该影响其他操作的处理（除了共享状态如使用次数）。
**验证：需求 11.1**

### 属性 23：并发状态一致性
*对于任何*并发操作序列，当所有操作完成后，共享状态（如使用次数）应该与串行执行这些操作的结果一致。
**验证：需求 11.2, 11.3**

### 属性 24：并发错误隔离
*对于任何*并发操作序列，如果其中一个操作失败，其他操作应该不受影响，仍然能够正常完成。
**验证：需求 11.4**

## 错误处理

### 错误类型

1. **消息传递错误**
   - chrome.runtime.sendMessage 失败
   - 降级策略：返回兜底响应，显示错误提示

2. **消息格式错误**
   - 接收到格式不正确的消息
   - 降级策略：返回兜底响应，记录错误日志

3. **存储访问错误**
   - chrome.storage 不可用
   - 降级策略：使用内存存储

4. **业务逻辑错误**
   - 操作处理过程中抛出异常
   - 降级策略：返回兜底响应，记录错误日志

5. **并发冲突错误**
   - 多个操作同时修改状态
   - 降级策略：使用锁机制或原子操作

### 错误处理原则

1. **优雅降级**：所有错误都应该有降级策略，不应该导致系统崩溃
2. **用户友好**：错误信息应该对用户友好，不暴露技术细节
3. **可追溯**：所有错误都应该记录日志，便于调试
4. **一致性**：错误响应格式应该与正常响应格式一致

## 测试策略

### 单元测试 vs 集成测试

**单元测试**（已完成）：
- 测试单个模块的功能
- 使用 mock 隔离依赖
- 覆盖率目标：Background 90%+, Content 85%+, Shared 100%

**集成测试**（本文档）：
- 测试多个模块协同工作
- 最小化 mock，使用真实模块
- 覆盖率目标：端到端流程 100%，关键路径 100%

### 测试类型

1. **消息通信集成测试**
   - 测试 Content → Background → Content 的完整消息流
   - 验证消息格式和内容正确性
   - 测试异步消息处理

2. **端到端流程测试**
   - 测试从用户交互到 UI 响应的完整流程
   - 验证业务逻辑正确性
   - 测试状态变化

3. **系统级集成测试**
   - 测试跨模块的系统行为
   - 验证状态一致性
   - 测试并发场景

4. **属性测试**
   - 使用 fast-check 生成随机测试数据
   - 验证通用属性在所有输入下都成立
   - 最少 100 次迭代

### 测试配置

**测试框架**：Jest + fast-check

**测试文件位置**：
- 集成测试：`src/__test__/integration/`
- 辅助函数：`src/__test__/integration/helpers.ts`
- 场景构建器：`src/__test__/integration/scenarios.ts`
- 消息模拟器：`src/__test__/integration/messaging.ts`
- 数据生成器：`src/__test__/integration/generators.ts`

**测试命名规范**：
- 集成测试文件：`*.integration.test.ts`
- 测试描述使用中文
- 测试标签：`Feature: integration-testing, Property N: [属性描述]`

**属性测试配置**：
- 最少 100 次迭代
- 使用 fast-check 的 `fc.assert` 和 `fc.property`
- 每个属性一个独立的测试用例

### 测试覆盖目标

- **端到端流程覆盖**：100%（所有 4 个主要功能）
- **消息通信覆盖**：100%（所有消息类型）
- **错误场景覆盖**：100%（所有错误类型）
- **并发场景覆盖**：80%（主要并发场景）
- **属性测试覆盖**：所有 24 个属性

### Mock 策略

**最小化 mock 原则**：
- 只 mock 外部依赖（chrome API、DOM）
- 不 mock 内部模块（Background、Content、Shared）
- 使用真实的消息传递机制

**Mock 的内容**：
- chrome.runtime.sendMessage
- chrome.runtime.onMessage
- chrome.storage.local
- chrome.tabs
- DOM API（document、window）

**不 mock 的内容**：
- Background 层的所有模块
- Content 层的所有模块
- Shared 层的所有类型
- 消息协议

### 测试数据策略

**真实数据**：
- 使用真实的文本和表格数据
- 覆盖常见的使用场景

**边界数据**：
- 空输入
- 极大输入
- 特殊字符

**随机数据**：
- 使用 fast-check 生成随机数据
- 覆盖更广泛的输入空间

### 测试执行策略

**测试顺序**：
1. 测试基础设施
2. 消息通信集成测试
3. 端到端流程测试
4. 系统级集成测试
5. 属性测试

**测试隔离**：
- 每个测试独立运行
- 使用 beforeEach 重置状态
- 使用 afterEach 清理资源

**测试并行**：
- 集成测试串行执行（避免状态冲突）
- 属性测试可以并行执行

## 实现注意事项

1. **真实模块交互**：集成测试应该使用真实的模块，而不是 mock
2. **状态隔离**：每个测试应该独立，不依赖其他测试的状态
3. **异步处理**：正确处理异步操作，使用 async/await
4. **错误处理**：测试错误场景，验证降级行为
5. **性能考虑**：集成测试可能比单元测试慢，但应该在合理范围内
6. **可维护性**：使用辅助函数和场景构建器，提高测试代码的可维护性
7. **文档化**：每个测试应该有清晰的注释，说明测试目的和预期结果
