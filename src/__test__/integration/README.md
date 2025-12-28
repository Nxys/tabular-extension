# 集成测试基础设施

本目录包含集成测试的基础设施，用于测试 Background 层、Content 层和 Shared 层之间的协同工作。

## 目录结构

```
integration/
├── helpers.ts              # 集成测试辅助函数库
├── scenarios.ts            # 端到端场景构建器
├── messaging.ts            # 消息通信模拟器
├── generators.ts           # 测试数据生成器
├── infrastructure.test.ts  # 基础设施验证测试
└── README.md              # 本文件
```

## 核心模块

### 1. 辅助函数库 (helpers.ts)

提供集成测试常用的辅助函数：

- `sendRequestAction(action, data)` - 模拟 Content 层发送消息到 Background 层
- `simulateUserAction(action, data, options)` - 模拟完整的用户交互流程
- `setupTestState(state)` - 设置测试环境状态
- `cleanupTestState()` - 清理测试环境
- `waitForAsync(ms)` - 等待异步操作完成
- `validateMessageFormat(message, type)` - 验证消息格式

**使用示例：**

```typescript
import { sendRequestAction, setupTestState, cleanupTestState } from './helpers';

// 设置测试状态
await setupTestState({
  usageCount: 5,
  hasPro: true,
});

// 发送请求
const response = await sendRequestAction('text-extract', '测试文本');

// 清理测试环境
await cleanupTestState();
```

### 2. 场景构建器 (scenarios.ts)

提供预定义的测试场景：

- `createTextExtractionScenario(text)` - 创建文本提取场景
- `createTableDetectionScenario(table, hasPro)` - 创建表格检测场景
- `createUsageLimitScenario(currentUsage, action)` - 创建使用次数限制场景
- `createConcurrentScenario(actions)` - 创建并发操作场景

**使用示例：**

```typescript
import { createTextExtractionScenario } from './scenarios';

const scenario = createTextExtractionScenario('测试文本');
expect(scenario.expectedResult.status).toBe('ok');
```

### 3. 消息通信模拟器 (messaging.ts)

提供消息拦截和历史记录功能：

- `setMessageInterceptor(interceptor)` - 设置消息拦截器
- `clearMessageInterceptor()` - 清除消息拦截器
- `getMessageHistory()` - 获取消息历史
- `clearMessageHistory()` - 清除消息历史

**使用示例：**

```typescript
import { setMessageInterceptor, getMessageHistory } from './messaging';

// 设置拦截器
setMessageInterceptor({
  onRequest: (msg) => console.log('请求:', msg),
  onResponse: (res) => console.log('响应:', res),
});

// 获取历史
const history = getMessageHistory();
console.log('请求数量:', history.requests.length);
```

### 4. 测试数据生成器 (generators.ts)

提供随机数据和边界值生成：

- `generateRandomText(length)` - 生成随机文本
- `generateRandomTable(rows, cols)` - 生成随机表格
- `generateBoundaryText()` - 生成边界值文本
- `generateBoundaryTable()` - 生成边界值表格

**使用示例：**

```typescript
import { generateRandomText, generateBoundaryText } from './generators';

// 生成随机文本
const text = generateRandomText(100);

// 生成边界值
const boundary = generateBoundaryText();
console.log('空文本:', boundary.empty);
console.log('长文本长度:', boundary.long.length);
```

## 测试编写指南

### 基本测试结构

```typescript
import { createChromeMock, resetChromeMock } from '../mocks/chrome';
import { sendRequestAction, setupTestState, cleanupTestState } from './helpers';

// 设置 chrome mock
beforeAll(() => {
  (global as any).chrome = createChromeMock();
});

// 每个测试前重置状态
beforeEach(async () => {
  resetChromeMock();
  await cleanupTestState();
});

describe('功能测试', () => {
  test('应该正确处理请求', async () => {
    // Arrange - 准备测试数据
    await setupTestState({ usageCount: 0, hasPro: false });
    
    // Act - 执行操作
    const response = await sendRequestAction('text-extract', '测试');
    
    // Assert - 验证结果
    expect(response.status).toBe('ok');
    expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
  });
});
```

### 测试原则

1. **真实模块交互** - 使用真实的 Background 和 Content 模块，最小化 mock
2. **状态隔离** - 每个测试独立，使用 beforeEach 重置状态
3. **异步处理** - 正确处理异步操作，使用 async/await
4. **清晰断言** - 使用明确的断言，验证关键行为

### 常见测试模式

#### 1. 端到端流程测试

```typescript
test('文本提取完整流程', async () => {
  await setupTestState({ usageCount: 0 });
  
  const response = await sendRequestAction('text-extract', '测试文本');
  
  expect(response.status).toBe('ok');
  expect(response.uiData?.text).toBe('测试文本');
  
  // 验证使用次数增加
  const storage = await chrome.storage.local.get('usageCount');
  expect(storage.usageCount).toBe(1);
});
```

#### 2. 权限检查测试

```typescript
test('无 Pro 权限时应该阻止操作', async () => {
  await setupTestState({ hasPro: false });
  
  const response = await sendRequestAction('table-detect', [['A', 'B']]);
  
  expect(response.status).toBe('blocked');
  expect(response.uiAction).toBe('SHOW_PRO_PANEL');
});
```

#### 3. 使用次数限制测试

```typescript
test('达到限制时应该阻止操作', async () => {
  await setupTestState({ usageCount: 10 });
  
  const response = await sendRequestAction('text-extract', '测试');
  
  expect(response.status).toBe('limited');
  expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
});
```

#### 4. 并发操作测试

```typescript
test('应该正确处理并发操作', async () => {
  await setupTestState({ usageCount: 0 });
  
  const promises = [
    sendRequestAction('text-extract', '文本1'),
    sendRequestAction('text-extract', '文本2'),
    sendRequestAction('text-extract', '文本3'),
  ];
  
  const responses = await Promise.all(promises);
  
  responses.forEach(response => {
    expect(response.status).toBe('ok');
  });
});
```

## 运行测试

```bash
# 运行所有集成测试
npm test -- src/__test__/integration

# 运行特定测试文件
npm test -- src/__test__/integration/infrastructure.test.ts

# 运行测试并查看覆盖率
npm test -- --coverage src/__test__/integration
```

## 注意事项

1. **Chrome API Mock** - 所有测试都需要在 beforeAll 中设置 chrome mock
2. **状态清理** - 每个测试后必须清理状态，避免测试间相互影响
3. **异步操作** - 所有涉及 storage 或消息传递的操作都是异步的
4. **真实模块** - 集成测试应该使用真实的模块，而不是 mock
5. **测试隔离** - 每个测试应该独立，不依赖其他测试的执行顺序

## 下一步

基础设施已经就绪，可以开始编写具体的集成测试：

1. 消息通信集成测试
2. 文本提取端到端流程测试
3. 表格检测端到端流程测试
4. 列对齐端到端流程测试
5. CSV 导出端到端流程测试
6. 使用次数管理集成测试
7. Pro 权限检查集成测试
8. 错误处理和降级集成测试
9. UI Action 执行集成测试
10. 设置管理集成测试
11. 并发操作集成测试
