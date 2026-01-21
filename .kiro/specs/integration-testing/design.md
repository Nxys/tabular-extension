# Design Document

## Overview

本设计文档定义了 Chrome 插件集成测试重构的技术方案。当前集成测试存在覆盖不全、辅助函数不完善、缺少关键场景等问题。本次重构将建立完整的测试体系，包括：

1. **完善测试辅助工具**：扩展 Test_Helper 和 Test_Fixture，支持更多测试场景
2. **增强消息通信测试**：验证三层架构的消息协议实现
3. **补充 Pro 功能测试**：测试权限控制和试用次数管理
4. **优化测试结构**：重组测试用例，提高可维护性
5. **提升测试覆盖率**：覆盖所有核心功能和边界情况

测试将在真实 Chrome 浏览器中运行，使用 Playwright 进行端到端测试，确保插件在真实环境中的正确性。

## Architecture

### 测试架构层次

```
┌─────────────────────────────────────────────────────────┐
│              Playwright Test Runner                     │
│  (test:integration, test:integration:headless,          │
│   test:integration:debug, test:integration:ui)          │
└─────────────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌────────▼────────┐
│  Test Suites   │    │  Test Fixtures  │
│  *.test.ts     │◄───┤     pages.ts    │
└───────┬────────┘    └─────────────────┘
        │
        │ uses
        │
┌───────▼────────┐
│  Test Helpers  │
│    extension   │
└───────┬────────┘
        │
        │ controls
        │
┌───────▼────────────────────────────────┐
│      Real Chrome Browser               │
│  ┌──────────────────────────────────┐  │
│  │  Chrome Extension (Built)        │  │
│  │  ┌────────┐  ┌────────┐         │  │
│  │  │Content │◄─┤Background│        │  │
│  │  └────┬───┘  └────────┘         │  │
│  │       │                          │  │
│  │  ┌────▼──────────┐               │  │
│  │  │  Test Page    │               │  │
│  │  │  (Generated)  │               │  │
│  │  └───────────────┘               │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### 测试分层

1. **Test Suites Layer** - 测试套件层
   - 基础功能测试 (basic-functionality.test.ts)
   - 用户交互测试 (user-interactions.test.ts)
   - Pro 功能测试 (pro-features.test.ts) - 新增
   - 消息通信测试 (message-protocol.test.ts) - 新增
   - 错误处理测试 (error-handling.test.ts)

2. **Test Helpers Layer** - 测试辅助层
   - helpers/extension.ts：封装插件操作
   - helpers/message.ts：消息通信监听 - 新增
   - helpers/storage.ts：Storage 操作 - 新增

3. **Test Fixtures Layer** - 测试固件层
   - pages.ts：页面生成器
   - data.ts：测试数据生成 - 新增

4. **Browser Layer** - 浏览器层
   - 真实 Chrome 浏览器
   - 加载构建后的插件
   - 运行测试页面

### 三层架构验证

测试将验证插件的三层架构实现：

```
Content Layer (UI)
    │ REQUEST_ACTION
    ▼
Background Layer (Business Logic)
    │ ACTION_RESULT (with uiAction)
    ▼
Content Layer (UI Rendering)
```

测试重点：
- Content 不包含业务逻辑
- Content 不访问 storage
- Content 不直接 import Background
- 所有通信通过消息协议
- Background 决定 uiAction
- Content 无条件执行 uiAction

## Components and Interfaces

### 1. Test Helper 组件

#### 1.1 ExtensionHelper (扩展)

现有功能保留，新增以下函数：

```typescript
/**
 * 模拟鼠标框选操作
 * @param page Playwright Page 对象
 * @param startX 起点 X 坐标
 * @param startY 起点 Y 坐标
 * @param endX 终点 X 坐标
 * @param endY 终点 Y 坐标
 */
export async function dragSelection(
  page: Page,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): Promise<void>;

/**
 * 等待 Result_Panel 显示并返回面板元素
 * @param page Playwright Page 对象
 * @param timeout 超时时间（毫秒）
 * @returns 面板 Locator
 */
export async function waitForResultPanel(
  page: Page,
  timeout?: number
): Promise<Locator>;

/**
 * 获取面板中的表格数据
 * @param page Playwright Page 对象
 * @returns 二维数组表示的表格数据
 */
export async function getPanelTableData(
  page: Page
): Promise<string[][]>;

/**
 * 检查面板是否显示升级提示
 * @param page Playwright Page 对象
 * @returns 是否显示升级提示
 */
export async function hasUpgradePrompt(
  page: Page
): Promise<boolean>;

/**
 * 获取面板中显示的行数限制信息
 * @param page Playwright Page 对象
 * @returns { limited: boolean, current: number, max: number }
 */
export async function getRowLimitInfo(
  page: Page
): Promise<{ limited: boolean; current: number; max: number }>;
```

#### 1.2 MessageSpy (新增)

用于监听和验证 Content 与 Background 的消息通信：

```typescript
/**
 * 消息监听器
 */
export class MessageSpy {
  private messages: ExtensionMessage[] = [];
  
  /**
   * 开始监听消息
   * @param page Playwright Page 对象
   */
  async start(page: Page): Promise<void>;
  
  /**
   * 停止监听
   */
  stop(): void;
  
  /**
   * 获取所有捕获的消息
   */
  getMessages(): ExtensionMessage[];
  
  /**
   * 获取最后一条 REQUEST_ACTION 消息
   */
  getLastRequest(): RequestActionMessage | null;
  
  /**
   * 获取最后一条 ACTION_RESULT 消息
   */
  getLastResult(): ActionResultMessage | null;
  
  /**
   * 等待特定类型的消息
   * @param type 消息类型
   * @param timeout 超时时间
   */
  async waitForMessage(
    type: 'REQUEST_ACTION' | 'ACTION_RESULT',
    timeout?: number
  ): Promise<ExtensionMessage>;
  
  /**
   * 清空消息记录
   */
  clear(): void;
}
```

#### 1.3 StorageHelper (新增)

用于操作插件的 storage 数据：

```typescript
/**
 * 设置用户为 Pro 用户
 * @param page Playwright Page 对象
 */
export async function setProUser(page: Page): Promise<void>;

/**
 * 设置用户为 Free 用户
 * @param page Playwright Page 对象
 */
export async function setFreeUser(page: Page): Promise<void>;

/**
 * 设置试用次数
 * @param page Playwright Page 对象
 * @param feature 功能类型
 * @param count 试用次数
 */
export async function setTrialCount(
  page: Page,
  feature: AdvancedFeature,
  count: number
): Promise<void>;

/**
 * 获取试用次数
 * @param page Playwright Page 对象
 * @param feature 功能类型
 * @returns 剩余试用次数
 */
export async function getTrialCount(
  page: Page,
  feature: AdvancedFeature
): Promise<number>;

/**
 * 清空所有 storage 数据
 * @param page Playwright Page 对象
 */
export async function clearStorage(page: Page): Promise<void>;

/**
 * 获取完整的 storage 数据
 * @param page Playwright Page 对象
 */
export async function getStorageData(page: Page): Promise<Record<string, unknown>>;
```

### 2. Test Fixture 组件

#### 2.1 TestPages (扩展)

现有函数保留，新增以下函数：

```typescript
/**
 * 生成包含特殊字符的文本页面
 * @param includeHtmlEntities 是否包含 HTML 实体
 * @param includeUnicode 是否包含 Unicode 字符
 * @param includeEmoji 是否包含 Emoji
 */
export function generateSpecialCharPage(
  includeHtmlEntities: boolean,
  includeUnicode: boolean,
  includeEmoji: boolean
): string;

/**
 * 生成大型表格页面
 * @param rows 行数
 * @param cols 列数
 */
export function generateLargeTablePage(
  rows: number,
  cols: number
): string;

/**
 * 生成空白页面
 */
export function generateEmptyPage(): string;

/**
 * 生成包含动态内容的页面
 * @param initialContent 初始内容
 * @param dynamicContent 动态添加的内容
 */
export function generateDynamicPage(
  initialContent: string,
  dynamicContent: string
): string;

/**
 * 生成包含 iframe 的页面
 */
export function generateIframePage(): string;

/**
 * 生成包含 Shadow DOM 的页面
 */
export function generateShadowDOMPage(): string;
```

#### 2.2 TestData (新增)

生成测试数据：

```typescript
/**
 * 生成随机表格数据
 * @param rows 行数
 * @param cols 列数
 * @returns 二维数组
 */
export function generateRandomTableData(
  rows: number,
  cols: number
): string[][];

/**
 * 生成包含特殊字符的表格数据
 */
export function generateSpecialCharTableData(): string[][];

/**
 * 生成超过行数限制的表格数据
 * @param limit 行数限制
 * @returns 超过限制的表格数据
 */
export function generateOverLimitTableData(limit: number): string[][];
```

### 3. Test Suite 组件

#### 3.1 ProFeaturesTest (新增)

测试 Pro 功能和权限控制：

```typescript
describe('Pro 功能测试', () => {
  test('Free 用户提取超过 5 行应显示限制');
  test('Pro 用户提取超过 5 行应无限制');
  test('Free 用户使用高级清洗应消耗试用次数');
  test('Free 用户试用次数为 0 应显示升级提示');
  test('Pro 用户使用高级清洗不消耗试用次数');
  test('Free 用户导出表格应消耗试用次数');
  test('升级提示应包含正确的文案和链接');
});
```

#### 3.2 MessageProtocolTest (新增)

测试消息通信协议：

```typescript
describe('消息通信协议测试', () => {
  test('Content 发送 REQUEST_ACTION 应包含正确的 action');
  test('Background 返回 ACTION_RESULT 应包含 status 和 uiAction');
  test('status 为 ok 时 Content 应执行对应 uiAction');
  test('status 为 limited 时应显示限制提示');
  test('status 为 blocked 时应显示升级提示');
  test('异常情况应返回兜底格式的 ACTION_RESULT');
  test('uiData 中的 message 应由 Background 生成');
  test('Content 不应根据 status 自行决定 UI');
});
```

## Data Models

### 测试数据模型

```typescript
/**
 * 测试场景配置
 */
interface TestScenario {
  name: string;
  description: string;
  pageContent: string;
  userType: 'free' | 'pro';
  trialCounts?: Record<AdvancedFeature, number>;
  expectedResult: {
    panelVisible: boolean;
    hasUpgradePrompt: boolean;
    rowsReturned?: number;
    messageContains?: string[];
  };
}

/**
 * 消息验证配置
 */
interface MessageAssertion {
  requestAction?: ActionType;
  resultStatus?: ActionStatus;
  resultUIAction?: UIAction;
  uiDataFields?: string[];
}

/**
 * 表格测试数据
 */
interface TableTestData {
  rows: number;
  cols: number;
  hasHeader: boolean;
  hasMergedCells: boolean;
  isNested: boolean;
  data: string[][];
}
```

## Correctness Properties


*属性（Property）是系统在所有有效执行中都应保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

### Property 1: 文本提取正确性

*对于任意* 包含文本内容的 HTML 页面（包括简单文本、多行文本、嵌套标签），当用户框选该内容时，提取的纯文本应与原始文本内容一致（去除 HTML 标签，保留换行符和格式）

**Validates: Requirements 1.1, 1.2, 1.5**

### Property 2: 特殊字符处理正确性

*对于任意* 包含特殊字符（HTML 实体、Unicode、emoji）的文本，当用户框选该内容时，提取的文本应正确解码所有特殊字符

**Validates: Requirements 1.3, 3.3**

### Property 3: 表格结构识别正确性

*对于任意* 表格（包含不同行列数、表头、合并单元格），当用户框选该表格时，系统应正确识别表格结构并提取完整的数据（包括表头标记和单元格内容）

**Validates: Requirements 2.1, 2.2, 2.4**

### Property 4: 非表格内容不误判

*对于任意* 非表格的 HTML 结构（如列表、div 布局、段落），当用户框选该内容时，系统不应将其误判为表格

**Validates: Requirements 2.5**

### Property 5: 导出格式正确性

*对于任意* 表格数据，当用户导出为 CSV 或 Excel 格式时，生成的文件应格式正确、内容完整，且特殊字符（逗号、引号、换行）被正确转义

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 6: 行数限制策略正确性

*对于任意* 行数的表格数据，当 Free_User 提取时应只返回前 5 行并显示升级提示，当 Pro_User 提取时应返回所有数据且无限制提示

**Validates: Requirements 4.1, 4.2**

### Property 7: 试用次数管理正确性

*对于任意* 初始试用次数，当 Free_User 使用高级功能时 Trial_Count 应正确递减，当 Pro_User 使用时 Trial_Count 不应改变

**Validates: Requirements 4.3, 4.5**

### Property 8: Selection_Box 跟随正确性

*对于任意* 鼠标拖动路径，当用户按下鼠标左键并拖动时，Selection_Box 应实时显示且准确跟随鼠标移动

**Validates: Requirements 5.1**

### Property 9: Result_Panel 显示正确性

*对于任意* 框选内容，当用户释放鼠标完成框选时，Result_Panel 应自动显示且包含正确的提取结果

**Validates: Requirements 5.2**

### Property 10: 连续操作隔离性

*对于任意* 次数的连续框选操作，每次操作应正确处理且不会相互干扰（状态独立、结果正确）

**Validates: Requirements 5.5**

### Property 11: 消息通信往返正确性

*对于任意* 用户操作，Content 发送的 REQUEST_ACTION 消息应包含正确的 action 类型，Background 返回的 ACTION_RESULT 消息应包含 status 和 uiAction

**Validates: Requirements 6.1, 6.2**

### Property 12: UI 响应正确性

*对于任意* ACTION_RESULT 消息，Content 应根据 uiAction 无条件执行对应的 UI 操作（不根据 status 自行决定），且 UI 更新应正确反映 uiData 中的内容

**Validates: Requirements 6.3, 6.4**

### Property 13: 异常兜底正确性

*对于任意* Background 处理消息时发生的异常，应返回兜底格式的 ACTION_RESULT（status: 'blocked', uiAction: 'SHOW_RESULT_PANEL', uiData.message 包含错误信息），且 Content 应正确显示错误信息

**Validates: Requirements 6.5**

### Property 14: 错误 HTML 容错性

*对于任意* 格式错误的 HTML 页面，当用户框选内容时，插件不应崩溃且应返回合理结果（空结果或部分提取结果）

**Validates: Requirements 7.1**

### Property 15: Storage 损坏容错性

*对于任意* 损坏的 storage 数据，插件应使用默认值且核心功能不受影响

**Validates: Requirements 7.3**

## Error Handling

### 错误分类

1. **用户输入错误**
   - 空白区域框选 → 返回空结果或提示
   - 无效内容框选 → 返回提示消息
   - 处理方式：友好提示，不影响后续操作

2. **数据格式错误**
   - 格式错误的 HTML → 尽力解析，返回部分结果
   - 损坏的 storage 数据 → 使用默认值
   - 处理方式：容错处理，记录日志

3. **权限限制错误**
   - Free 用户超过行数限制 → 返回前 5 行 + 升级提示
   - Free 用户试用次数用尽 → 显示升级提示 + 阻止操作
   - 处理方式：清晰提示，引导升级

4. **系统异常错误**
   - Background 处理异常 → 返回兜底 ACTION_RESULT
   - 网络请求失败 → 显示错误提示 + 允许重试
   - 处理方式：兜底机制，保证不崩溃

### 错误处理原则

1. **永不崩溃**：所有异常都应被捕获并优雅处理
2. **清晰反馈**：错误信息由 Background 生成，Content 无条件显示
3. **状态一致**：错误发生时不消耗试用次数（status !== 'ok'）
4. **可恢复性**：错误后用户可继续使用其他功能

### 测试策略

测试将验证以下错误处理场景：

1. **边界情况测试**（示例测试）
   - 空白区域框选
   - 试用次数为 0
   - 关闭面板操作
   - 快捷键触发
   - 网络请求失败
   - 页面未加载完成

2. **错误容错测试**（属性测试）
   - 格式错误的 HTML
   - 损坏的 storage 数据
   - Background 异常处理

## Testing Strategy

### 测试方法论

本项目采用**双重测试策略**：

1. **单元测试（Unit Tests）**
   - 工具：Jest + jsdom
   - 范围：Background、Content、Shared 各模块
   - 目标：验证具体示例、边界情况、错误条件
   - 覆盖率：Background ≥90%, Content ≥85%, Shared 100%

2. **集成测试（Integration Tests）**
   - 工具：Playwright
   - 范围：真实浏览器环境中的完整功能验证
   - 目标：验证插件在真实环境中的正确性
   - 本次重构重点：**提升集成测试的覆盖率和正确性**

### 集成测试配置

**测试框架**：Playwright v1.40.0

**测试命令**：
- `npm run test:integration` - 自动构建插件并运行所有集成测试（最常用）
- `npm run test:integration:headless` - 无头模式运行（快速验证，CI 环境）
- `npm run test:integration:debug` - 调试模式（打开浏览器，逐步执行）
- `npm run test:integration:ui` - UI 模式（Playwright UI，可视化查看测试过程）

**命令说明**：
- `test:integration`：自动构建 + 运行测试，适合日常开发（最常用）
- `test:integration:headless`：无头模式运行，适合 CI 和快速验证
- `test:integration:debug`：打开浏览器并暂停执行，可以逐步调试，适合开发调试
- `test:integration:ui`：打开 Playwright UI 界面，可以可视化查看测试执行过程、时间线、网络请求等，适合分析测试行为

**测试环境**：
- 浏览器：Chrome（通过 Playwright 控制）
- 插件加载：`./build/dist`（`test:integration` 命令自动构建）
- 测试服务器：`http://localhost:3000`（自动启动，使用 Python HTTP Server）
- Spec 目录：`.kiro/specs/integration-testing/`（新的 spec 名称）

**测试配置**（package.json）：
```json
{
  "scripts": {
    "test:integration": "npm run build && playwright test",
    "test:integration:headless": "playwright test",
    "test:integration:debug": "playwright test --debug",
    "test:integration:ui": "playwright test --ui"
  },
  "playwright": {
    "testDir": "tests/integration",
    "testMatch": "**/*.test.ts",
    "workers": 1,
    "reporter": [
      ["html", { "outputFolder": "tests/report/coverage/integration-report" }],
      ["list"]
    ],
    "use": {
      "baseURL": "http://localhost:3000",
      "trace": "on-first-retry",
      "screenshot": "only-on-failure",
      "video": "retain-on-failure"
    },
    "projects": [{
      "name": "chromium-extension",
      "use": {
        "channel": "chrome",
        "launchOptions": {
          "args": [
            "--disable-extensions-except=./build/dist",
            "--load-extension=./build/dist",
            "--disable-web-security"
          ]
        }
      }
    }],
    "webServer": {
      "command": "python3 -m http.server 3000",
      "port": 3000,
      "cwd": "tests/integration/fixtures/server",
      "reuseExistingServer": true,
      "timeout": 10000
    }
  }
}
```

### 属性测试实现

**属性测试库**：fast-check v3.15.0

**测试迭代次数**：每个属性测试至少 100 次迭代

**标签格式**：
```typescript
// Feature: integration-testing-refactor, Property 1: 文本提取正确性
test('Property 1: 文本提取正确性', async ({ page }) => {
  // 使用 fast-check 生成随机测试数据
  await fc.assert(
    fc.asyncProperty(
      fc.string(), // 生成随机文本
      async (text) => {
        // 测试逻辑
      }
    ),
    { numRuns: 100 }
  );
});
```

### 测试套件结构

```
tests/integration/
├── fixtures/
│   ├── pages.ts               # 页面生成器（扩展）
│   └── data.ts                # 测试数据生成器（新增）
├── helpers/
│   ├── extension.ts           # 插件操作辅助（扩展）
│   ├── message.ts             # 消息监听器（新增）
│   └── storage.ts             # Storage 操作（新增）
├── basic-functionality.test.ts      # 基础功能测试（重构）
├── user-interactions.test.ts        # 用户交互测试（重构）
├── pro-features.test.ts             # Pro 功能测试（新增）
├── message-protocol.test.ts         # 消息协议测试（新增）
└── error-handling.test.ts           # 错误处理测试（重构）
```

### 测试覆盖目标

**功能覆盖**：
- ✅ 文本提取（简单、多行、特殊字符、嵌套标签）
- ✅ 表格检测（简单、复杂、嵌套、表头、合并单元格）
- ✅ 数据导出（CSV、Excel、特殊字符转义）
- ✅ Pro 功能（行数限制、试用次数、权限控制）
- ✅ 用户交互（框选、面板、快捷键、连续操作）
- ✅ 消息通信（REQUEST_ACTION、ACTION_RESULT、uiAction）
- ✅ 错误处理（边界情况、格式错误、异常兜底）

**架构验证**：
- ✅ Content 无业务逻辑
- ✅ Content 不访问 storage
- ✅ Content 不 import Background
- ✅ 通过消息协议通信
- ✅ Background 决定 uiAction
- ✅ Content 无条件执行 uiAction
- ✅ Background 生成文案
- ✅ 异常返回兜底 ACTION_RESULT

### 测试执行流程

1. **日常开发**：`npm run test:integration`（自动构建 + 运行测试）
2. **快速验证**：`npm run test:integration:headless`（无头模式，假设已构建）
3. **查看报告**：`tests/report/coverage/integration-report/index.html`
4. **调试失败**：`npm run test:integration:debug`（打开浏览器逐步调试）
5. **可视化分析**：`npm run test:integration:ui`（使用 Playwright UI 查看测试过程）

### 测试隔离

每个测试用例应：
- 使用独立的测试页面
- 清空 storage 数据（使用 `clearStorage()`）
- 重置用户权限（使用 `setFreeUser()` 或 `setProUser()`）
- 重置试用次数（使用 `setTrialCount()`）

### 测试数据生成

使用 fast-check 生成随机测试数据：

```typescript
// 生成随机文本
fc.string({ minLength: 1, maxLength: 1000 })

// 生成随机表格数据
fc.array(
  fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
  { minLength: 1, maxLength: 100 }
)

// 生成随机行数（超过限制）
fc.integer({ min: 6, max: 100 })

// 生成随机试用次数
fc.integer({ min: 0, max: 10 })
```

### 单元测试与集成测试的平衡

**单元测试重点**：
- 具体示例（如：空白区域框选、试用次数为 0）
- 边界情况（如：空数据导出、页面未加载）
- 错误条件（如：网络请求失败）
- 组件集成点（如：extractor 与 panel 的交互）

**集成测试重点**：
- 通用属性（如：文本提取正确性、表格识别正确性）
- 完整流程（如：框选 → 提取 → 显示 → 导出）
- 真实环境（如：真实浏览器、真实 DOM、真实消息通信）
- 架构验证（如：三层分离、消息协议）

**避免过度单元测试**：
- 不为每个输入值写单元测试（使用属性测试覆盖）
- 不重复测试已被属性测试覆盖的场景
- 单元测试聚焦于具体示例和边界情况

### 测试报告

测试完成后生成：
- HTML 报告：`tests/report/coverage/integration-report/index.html`
- 截图：失败测试的截图（自动生成）
- 追踪文件：`trace.zip`（可在 Playwright Trace Viewer 中查看）
- 视频：失败测试的视频（可选）

### 持续集成

CI 环境配置：
```yaml
- name: Run integration tests
  run: npm run test:integration:headless
  env:
    CI: true

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: tests/report/coverage/integration-report/
```

注意：CI 环境使用 `test:integration:headless` 命令，需要先手动构建插件或在 CI 配置中添加构建步骤。

