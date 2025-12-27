# 设计文档：单元测试套件

## 概述

本设计文档描述了为 Chrome 浏览器框选复制插件建立完整单元测试套件的技术方案。测试套件将使用 Jest 作为测试框架，fast-check 进行属性测试，并包含架构守门测试以确保层间依赖规则的遵守。

测试套件的核心目标：
- 确保业务逻辑的正确性和可靠性
- 通过属性测试发现边界情况和潜在 bug
- 通过架构守门测试维护架构清晰性
- 达到高代码覆盖率（Background 90%+，Content 85%+，Shared 100%）

## 架构

### 测试目录结构

根据项目架构规范，测试文件放置在每个模块下的 `__test__/` 目录中：

```
src/
├── background/
│   ├── __test__/
│   │   ├── usage.test.ts          # usage.ts 单元测试
│   │   ├── pro.test.ts            # pro.ts 单元测试
│   │   ├── settings.test.ts       # settings.ts 单元测试
│   │   ├── storage.test.ts        # storage.ts 单元测试
│   │   └── index.test.ts          # index.ts 单元测试
│   ├── index.ts
│   ├── usage.ts
│   ├── pro.ts
│   ├── settings.ts
│   └── storage.ts
├── content/
│   ├── __test__/
│   │   ├── extractor.test.ts      # extractor.ts 单元测试
│   │   ├── selection.test.ts      # selection.ts 单元测试
│   │   ├── panel.test.ts          # panel.ts 单元测试
│   │   └── index.test.ts          # index.ts 单元测试
│   ├── index.ts
│   ├── extractor.ts
│   ├── selection.ts
│   ├── panel.ts
│   └── content.css
├── shared/
│   ├── __test__/
│   │   ├── types.test.ts          # types.ts 类型测试
│   │   └── constants.test.ts      # constants.ts 常量测试
│   ├── types.ts
│   └── constants.ts
└── __test__/
    ├── setup.ts                    # Jest 全局配置
    ├── mocks/
    │   ├── chrome.ts              # chrome API mock 实现
    │   └── dom.ts                 # DOM API 增强 mock
    └── architecture/
        └── guards.test.ts         # 架构守门测试
```

### 测试层次

1. **单元测试层**：测试单个函数和类的行为
2. **属性测试层**：使用 fast-check 验证通用属性
3. **架构测试层**：验证层间依赖规则

### Mock 策略

- **chrome API**：完整 mock chrome.storage、chrome.runtime、chrome.tabs 等 API
- **DOM API**：使用 jsdom 提供的 DOM 环境，必要时增强
- **时间控制**：使用 Jest 的 fake timers 控制时间相关测试

## 组件和接口

### 1. 测试基础设施（src/__test__/setup.ts）

**职责**：
- 初始化 Jest 环境
- 配置全局 mock
- 提供测试工具函数

**接口**：
```typescript
// 全局 mock 配置
declare global {
  var chrome: typeof chrome;
}

// 测试工具函数
export function resetMocks(): void;
export function mockDate(date: string): void;
export function restoreDate(): void;
```

### 2. Chrome API Mock（src/__test__/mocks/chrome.ts）

**职责**：
- 模拟 chrome.storage.local API
- 模拟 chrome.runtime API
- 模拟 chrome.tabs API
- 提供内存存储实现

**接口**：
```typescript
export interface MockStorage {
  data: Map<string, unknown>;
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): void;
}

export interface MockRuntime {
  sendMessage(message: unknown): Promise<unknown>;
  onMessage: {
    addListener(callback: Function): void;
    removeListener(callback: Function): void;
  };
}

export function createChromeMock(): typeof chrome;
export function resetChromeMock(): void;
```

### 3. DOM Mock 增强（src/__test__/mocks/dom.ts）

**职责**：
- 增强 jsdom 的 DOM API
- 提供 getClientRects、getBoundingClientRect 等方法的 mock
- 模拟 window.getComputedStyle

**接口**：
```typescript
export function mockGetClientRects(
  element: Element,
  rects: DOMRect[]
): void;

export function mockGetBoundingClientRect(
  element: Element,
  rect: DOMRect
): void;

export function mockComputedStyle(
  element: Element,
  styles: Partial<CSSStyleDeclaration>
): void;

export function createMockTextNode(
  text: string,
  rect: DOMRect
): Text;
```

### 4. Background 层测试

#### 4.1 src/background/__test__/usage.test.ts

**测试范围**：
- checkUsage()：检查使用次数
- consumeUsage()：消耗使用次数
- record()：记录使用事件
- 跨天重置逻辑

**关键测试用例**：
- 初始状态检查
- 使用次数递增
- 达到上限后的行为
- 跨天重置
- 统计数据记录

#### 4.2 src/background/__test__/pro.test.ts

**测试范围**：
- allow()：Pro 权限判断
- Pro 状态获取

**关键测试用例**：
- 默认状态（所有功能不可用）
- Pro 状态读取

#### 4.3 src/background/__test__/settings.test.ts

**测试范围**：
- getSettings()：获取设置
- updateSettings()：更新设置

**关键测试用例**：
- 默认设置
- 部分更新
- 完整更新

#### 4.4 src/background/__test__/storage.test.ts

**测试范围**：
- getFromStorage()：读取数据
- setToStorage()：写入数据
- removeFromStorage()：删除数据
- 内存降级机制

**关键测试用例**：
- 正常读写
- 默认值处理
- chrome.storage 失败时的降级
- 内存存储的一致性

#### 4.5 src/background/__test__/index.test.ts

**测试范围**：
- 消息路由
- Action 处理（text-extract、table-detect、column-align、csv-export）
- 异常兜底
- 快捷键处理

**关键测试用例**：
- 各种 Action 的正常流程
- 使用次数限制的处理
- Pro 权限检查
- 异常情况的兜底返回

### 5. Content 层测试

#### 5.1 src/content/__test__/extractor.test.ts

**测试范围**：
- collect()：采集文本元素
- layout()：排版结构分析
- format()：数据格式化
- detectTable()：表格检测
- alignTable()：表格对齐
- toCSV()：CSV 导出

**关键测试用例**：
- 空输入处理
- 单行文本
- 多行文本
- 表格结构识别
- 列对齐计算
- CSV 转义

#### 5.2 src/content/__test__/selection.test.ts

**测试范围**：
- start()：开始选择
- update()：更新选择框
- finish()：完成选择
- isValid()：验证选择
- clear()：清除选择框

**关键测试用例**：
- 选择框创建
- 选择框更新
- 选择区域计算
- 有效性验证
- 清理操作

#### 5.3 src/content/__test__/panel.test.ts

**测试范围**：
- showResult()：显示结果面板
- showLimit()：显示限制提示
- showPro()：显示 Pro 提示
- hide()：隐藏面板
- 拖动功能

**关键测试用例**：
- 面板创建和渲染
- 不同类型面板的显示
- 复制功能
- CSV 导出功能
- 拖动交互

#### 5.4 src/content/__test__/index.test.ts

**测试范围**：
- 事件监听（mousedown、mousemove、mouseup）
- 消息发送
- UI Action 执行
- 设置管理

**关键测试用例**：
- 鼠标事件处理
- 消息通信
- UI 渲染调度
- 快捷键切换

### 6. Shared 层测试

#### 6.1 src/shared/__test__/types.test.ts

**测试范围**：
- 消息协议类型的完整性
- 枚举类型的正确性

**关键测试用例**：
- 类型定义存在性检查
- 枚举值验证

#### 6.2 src/shared/__test__/constants.test.ts

**测试范围**：
- 常量定义的正确性
- 常量值的合理性

**关键测试用例**：
- 常量值验证
- 常量类型检查

### 7. 架构守门测试（src/__test__/architecture/guards.test.ts）

**职责**：
- 静态分析源代码
- 检测层间依赖违规
- 检测业务逻辑泄漏

**检查规则**：
1. Content 层不得 import Background 层模块
2. Background 层不得 import Content 层模块
3. Content 层不得直接访问 chrome.storage
4. Shared 层不得包含业务逻辑关键字

**实现方式**：
- 使用 TypeScript Compiler API 解析源代码
- 分析 import 语句
- 检查代码中的关键字

## 数据模型

### 测试数据生成器（用于属性测试）

```typescript
// fast-check 生成器

// 生成使用事件
const usageEventArb = fc.constantFrom(
  'select',
  'table-detect',
  'column-align',
  'csv-export'
);

// 生成日期字符串
const dateStringArb = fc.date().map(d => d.toDateString());

// 生成选择区域
const selectionRectArb = fc.record({
  left: fc.integer({ min: 0, max: 1000 }),
  top: fc.integer({ min: 0, max: 1000 }),
  right: fc.integer({ min: 0, max: 2000 }),
  bottom: fc.integer({ min: 0, max: 2000 })
}).filter(rect => rect.right > rect.left && rect.bottom > rect.top);

// 生成文本项
const textItemArb = fc.record({
  text: fc.string({ minLength: 1, maxLength: 100 }),
  x: fc.integer({ min: 0, max: 1000 }),
  y: fc.integer({ min: 0, max: 1000 }),
  width: fc.integer({ min: 10, max: 200 }),
  height: fc.integer({ min: 10, max: 50 })
});

// 生成文本项数组
const textItemsArb = fc.array(textItemArb, { minLength: 0, maxLength: 100 });

// 生成存储键值对
const storageKeyArb = fc.string({ minLength: 1, maxLength: 50 });
const storageValueArb = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.object()
);
```

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*


### 属性 1：使用次数单调性

*对于任意*的操作序列（不包含跨天重置），使用次数应该单调递增，即每次调用 consumeUsage() 后，使用次数应该比之前增加 1。

**验证：需求 4.3**

### 属性 2：存储往返一致性

*对于任意*的键值对 (key, value)，调用 setToStorage(key, value) 然后调用 getFromStorage(key, defaultValue) 应该返回与 value 相等的结果。

**验证：需求 4.4**

### 属性 3：文本提取幂等性

*对于任意*的选择区域 rect，多次调用 extract(rect) 应该返回相同的文本结果（假设 DOM 结构不变）。

**验证：需求 4.5**

## 错误处理

### 1. Storage 层错误处理

**chrome.storage 失败降级**：
- 当 chrome.storage.local 操作失败时，自动降级到内存存储
- 内存存储使用 Map 实现，提供相同的接口
- 错误信息记录到 console.warn

**测试策略**：
- Mock chrome.storage.local 抛出异常
- 验证后续操作使用内存存储
- 验证数据一致性

### 2. Background 层错误处理

**消息处理异常兜底**：
- 所有消息处理函数包裹在 try-catch 中
- 异常时返回标准兜底响应：
  ```typescript
  {
    status: 'blocked',
    uiAction: 'SHOW_RESULT_PANEL',
    uiData: { message: '操作失败，请重试' }
  }
  ```

**测试策略**：
- Mock 各种异常场景
- 验证返回的兜底响应格式
- 验证不会抛出未捕获异常

### 3. Usage 层错误处理

**记录失败优雅降级**：
- record() 函数失败时不影响主流程
- 错误信息记录到 console.warn
- 返回 void，不抛出异常

**测试策略**：
- Mock storage 操作失败
- 验证 record() 不抛出异常
- 验证主流程继续执行

### 4. Content 层错误处理

**消息发送失败降级**：
- chrome.runtime.sendMessage 失败时返回降级响应
- 降级响应与 background 兜底响应格式一致

**测试策略**：
- Mock chrome.runtime.sendMessage 抛出异常
- 验证返回降级响应
- 验证 UI 正常显示错误信息

## 测试策略

### 双重测试方法

本测试套件采用**单元测试**和**属性测试**相结合的方法：

**单元测试**：
- 验证特定示例和边界情况
- 测试错误处理路径
- 测试集成点
- 使用 Jest 的 describe/it/expect 结构

**属性测试**：
- 验证通用属性在大量随机输入下的正确性
- 使用 fast-check 库生成测试数据
- 每个属性测试至少运行 100 次迭代
- 发现边界情况和潜在 bug

**互补性**：
- 单元测试提供具体示例，易于理解和调试
- 属性测试提供广泛覆盖，发现意外情况
- 两者结合提供全面的质量保证

### 测试配置

**Jest 配置**（package.json）：
```json
{
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/src/__test__/setup.ts"],
    "testMatch": ["**/src/**/__test__/**/*.test.ts"],
    "coverageDirectory": "src/__test__/coverage",
    "coveragePathIgnorePatterns": [
      "/node_modules/",
      "/__test__/"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      },
      "src/background/**/*.ts": {
        "branches": 90,
        "functions": 90,
        "lines": 90,
        "statements": 90
      },
      "src/content/**/*.ts": {
        "branches": 85,
        "functions": 85,
        "lines": 85,
        "statements": 85
      },
      "src/shared/**/*.ts": {
        "branches": 100,
        "functions": 100,
        "lines": 100,
        "statements": 100
      }
    }
  }
}
```

**属性测试配置**：
```typescript
// 每个属性测试的配置
fc.assert(
  fc.property(/* ... */),
  { numRuns: 100 } // 最少 100 次迭代
);
```

**测试标注**：
每个属性测试必须包含注释标注：
```typescript
/**
 * 属性测试：使用次数单调性
 * Feature: unit-testing, Property 1: 使用次数单调性
 * 验证：需求 4.3
 */
test('使用次数应该单调递增', () => {
  fc.assert(/* ... */, { numRuns: 100 });
});
```

### 测试隔离

**beforeEach 钩子**：
- 重置所有 mock 状态
- 清理 DOM 元素
- 重置时间（如果使用 fake timers）
- 清空内存存储

**afterEach 钩子**：
- 清理全局状态
- 移除事件监听器
- 恢复原始实现

**示例**：
```typescript
describe('usage.ts', () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 测试用例...
});
```

### 覆盖率目标

- **Background 层**：90%+ 覆盖率（业务逻辑核心）
- **Content 层**：85%+ 覆盖率（UI 交互复杂）
- **Shared 层**：100% 覆盖率（纯类型定义）
- **整体**：80%+ 覆盖率

### 架构守门测试实现

**静态分析方法**：
1. 使用 TypeScript Compiler API 解析源代码
2. 提取所有 import 语句
3. 检查 import 路径是否违反层间依赖规则
4. 检查代码中是否包含禁止的关键字

**检查规则**：
```typescript
const ARCHITECTURE_RULES = {
  // Content 层不得导入 Background 层
  'src/content/**/*.ts': {
    forbiddenImports: ['../background/', '../../background/'],
    forbiddenKeywords: ['chrome.storage.local']
  },
  
  // Background 层不得导入 Content 层
  'src/background/**/*.ts': {
    forbiddenImports: ['../content/', '../../content/']
  },
  
  // Shared 层不得包含业务逻辑
  'src/shared/**/*.ts': {
    forbiddenKeywords: ['usage', 'pro', 'policy', 'strategy', 'checkUsage', 'consumeUsage']
  }
};
```

**测试失败输出**：
```
架构守门测试失败：
  文件：src/content/index.ts
  违规：导入了 Background 层模块
  位置：第 5 行
  import { checkUsage } from '../background/usage';
```

## 实现细节

### Mock 实现要点

**chrome.storage.local Mock**：
```typescript
const mockStorage = {
  data: new Map<string, unknown>(),
  
  async get(keys: string[]) {
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      if (this.data.has(key)) {
        result[key] = this.data.get(key);
      }
    }
    return result;
  },
  
  async set(items: Record<string, unknown>) {
    for (const [key, value] of Object.entries(items)) {
      this.data.set(key, value);
    }
  },
  
  async remove(keys: string | string[]) {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    for (const key of keyArray) {
      this.data.delete(key);
    }
  },
  
  clear() {
    this.data.clear();
  }
};
```

**chrome.runtime Mock**：
```typescript
const mockRuntime = {
  listeners: [] as Function[],
  
  async sendMessage(message: unknown) {
    // 模拟消息发送，可以在测试中设置响应
    return mockRuntime.mockResponse || {};
  },
  
  onMessage: {
    addListener(callback: Function) {
      mockRuntime.listeners.push(callback);
    },
    
    removeListener(callback: Function) {
      const index = mockRuntime.listeners.indexOf(callback);
      if (index > -1) {
        mockRuntime.listeners.splice(index, 1);
      }
    }
  },
  
  mockResponse: null as unknown
};
```

### DOM Mock 增强

**getClientRects Mock**：
```typescript
function mockGetClientRects(element: Element, rects: DOMRect[]) {
  Object.defineProperty(element, 'getClientRects', {
    value: () => rects,
    configurable: true
  });
}
```

**getBoundingClientRect Mock**：
```typescript
function mockGetBoundingClientRect(element: Element, rect: DOMRect) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => rect,
    configurable: true
  });
}
```

### 时间控制

**使用 Jest Fake Timers**：
```typescript
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01'));
});

afterEach(() => {
  jest.useRealTimers();
});

test('跨天重置', async () => {
  // 第一天
  await consumeUsage();
  let state = await checkUsage();
  expect(state.remaining).toBe(19);
  
  // 切换到第二天
  jest.setSystemTime(new Date('2024-01-02'));
  
  // 验证重置
  state = await checkUsage();
  expect(state.remaining).toBe(20);
});
```

## 测试用例示例

### 单元测试示例

```typescript
describe('storage.ts', () => {
  describe('getFromStorage', () => {
    it('应该返回存储的值', async () => {
      // Arrange
      await chrome.storage.local.set({ testKey: 'testValue' });
      
      // Act
      const result = await getFromStorage('testKey', 'default');
      
      // Assert
      expect(result).toBe('testValue');
    });
    
    it('应该返回默认值当键不存在时', async () => {
      // Arrange - 无需设置
      
      // Act
      const result = await getFromStorage('nonExistent', 'default');
      
      // Assert
      expect(result).toBe('default');
    });
    
    it('应该降级到内存存储当 chrome.storage 失败时', async () => {
      // Arrange
      jest.spyOn(chrome.storage.local, 'get').mockRejectedValue(new Error('Storage failed'));
      
      // Act
      const result = await getFromStorage('testKey', 'default');
      
      // Assert
      expect(result).toBe('default');
      expect(console.warn).toHaveBeenCalled();
    });
  });
});
```

### 属性测试示例

```typescript
describe('storage.ts - 属性测试', () => {
  /**
   * 属性测试：存储往返一致性
   * Feature: unit-testing, Property 2: 存储往返一致性
   * 验证：需求 4.4
   */
  it('存储然后读取应该返回相同的值', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // key
        fc.oneof(fc.string(), fc.integer(), fc.boolean()), // value
        async (key, value) => {
          // Arrange & Act
          await setToStorage(key, value);
          const result = await getFromStorage(key, null);
          
          // Assert
          expect(result).toEqual(value);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 架构守门测试示例

```typescript
describe('架构守门测试', () => {
  it('Content 层不应该导入 Background 层模块', () => {
    // Arrange
    const contentFiles = glob.sync('src/content/**/*.ts');
    const violations: string[] = [];
    
    // Act
    for (const file of contentFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const imports = extractImports(content);
      
      for (const imp of imports) {
        if (imp.includes('../background/') || imp.includes('../../background/')) {
          violations.push(`${file}: ${imp}`);
        }
      }
    }
    
    // Assert
    expect(violations).toEqual([]);
  });
  
  it('Content 层不应该直接访问 chrome.storage', () => {
    // Arrange
    const contentFiles = glob.sync('src/content/**/*.ts');
    const violations: string[] = [];
    
    // Act
    for (const file of contentFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      
      if (content.includes('chrome.storage.local')) {
        violations.push(file);
      }
    }
    
    // Assert
    expect(violations).toEqual([]);
  });
});
```

## 测试执行流程

1. **运行所有测试**：`npm test`
2. **运行特定测试文件**：`npm test -- src/background/__test__/usage.test.ts`
3. **运行覆盖率报告**：`npm test -- --coverage`
4. **监视模式**：`npm test -- --watch`

## 维护和扩展

### 添加新测试

1. 在对应的测试目录创建测试文件
2. 遵循命名约定：`*.test.ts`
3. 使用中文描述测试用例
4. 添加属性测试时标注属性编号和需求编号

### 更新 Mock

1. 当 chrome API 变化时，更新 `src/__test__/mocks/chrome.ts`
2. 确保 mock 行为与真实 API 一致
3. 添加新的 mock 方法时更新文档

### 架构规则变更

1. 更新 `src/__test__/architecture/guards.test.ts` 中的规则
2. 确保规则与架构文档一致
3. 添加新规则时提供清晰的错误信息
