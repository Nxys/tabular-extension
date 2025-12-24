# 设计文档：架构纠偏 - Content/Background 职责分离

## 概述

本设计文档描述了如何将 Chrome 插件从"content 层混杂业务逻辑"的架构重构为"background 层集中管理，content 层纯粹渲染"的清晰架构。

核心原则：
- Content 层：页面感知 + UI 渲染
- Background 层：状态管理 + 策略判断 + 权限控制
- 通信协议：REQUEST_ACTION → ACTION_RESULT

## 架构

### 当前架构（问题）

```
┌─────────────────────────────────────┐
│         Content Script              │
│  ┌──────────────────────────────┐   │
│  │  content.ts                  │   │
│  │  - 直接调用 checkUsage()     │   │
│  │  - 直接调用 allow()          │   │
│  │  - 自行决定显示哪个 UI       │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  usage/                      │   │
│  │  - storage.ts (读写 storage) │   │
│  │  - policy.ts (策略定义)      │   │
│  │  - usage.ts (限制判断)       │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  pro/                        │   │
│  │  - gate.ts (权限判断)        │   │
│  │  - strategy.ts (策略映射)    │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      Background Service             │
│  - 几乎没有业务逻辑                 │
│  - 只处理快捷键和安装事件           │
└─────────────────────────────────────┘
```

### 目标架构（解决方案）

```
┌─────────────────────────────────────┐
│         Content Script              │
│  ┌──────────────────────────────┐   │
│  │  content.ts                  │   │
│  │  - 页面感知（selection）     │   │
│  │  - 发送 REQUEST_ACTION       │   │
│  │  - 执行 uiAction 指令        │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  panel.ts                    │   │
│  │  - 纯 UI 渲染                │   │
│  │  - 不知道业务概念            │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
              ↕ MESSAGE
┌─────────────────────────────────────┐
│      Background Service             │
│  ┌──────────────────────────────┐   │
│  │  background.ts               │   │
│  │  - 消息路由                  │   │
│  │  - Action 处理器             │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  usage/                      │   │
│  │  - storage.ts                │   │
│  │  - policy.ts                 │   │
│  │  - usage.ts                  │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  pro/                        │   │
│  │  - gate.ts                   │   │
│  │  - strategy.ts               │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

## 组件和接口

### 1. 消息协议（Shared）

```typescript
// shared/messages.ts

/**
 * UI 动作枚举
 * Background 明确告知 content 应该展示哪个 UI
 */
export type UIAction =
  | 'SHOW_RESULT_PANEL'    // 显示结果面板
  | 'SHOW_LIMIT_PANEL'     // 显示限制提示
  | 'SHOW_PRO_PANEL';      // 显示 Pro 升级提示

/**
 * 操作状态
 */
export type ActionStatus = 'ok' | 'limited' | 'blocked';

/**
 * 操作类型
 */
export type ActionType =
  | 'text-extract'      // 文本提取
  | 'table-detect'      // 表格检测
  | 'column-align'      // 列对齐
  | 'csv-export';       // CSV 导出

/**
 * Content → Background: 请求执行操作
 */
export interface RequestActionMessage {
  type: 'REQUEST_ACTION';
  payload: {
    action: ActionType;
    data?: unknown;  // 操作相关的数据（如提取的文本）
  };
}

/**
 * Background → Content: 操作结果
 */
export interface ActionResultMessage {
  type: 'ACTION_RESULT';
  payload: {
    status: ActionStatus;
    uiAction: UIAction;
    data?: unknown;  // 结果数据（如格式化后的文本）
    uiData?: {       // UI 渲染所需的数据
      text?: string;
      table?: string[][];
      csv?: string;
      message?: string;  // 提示文案（由 background 生成）
    };
  };
}

/**
 * 所有消息类型的联合
 */
export type ExtensionMessage =
  | RequestActionMessage
  | ActionResultMessage;
```

### 2. Background Service 重构

```typescript
// background/index.ts

import { handleActionRequest } from './handlers/action-handler';
import type { ExtensionMessage } from '../shared/messages';

/**
 * 消息监听器
 */
chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) => {
  // 异步处理消息
  (async () => {
    try {
      if (message.type === 'REQUEST_ACTION') {
        const result = await handleActionRequest(message.payload);
        sendResponse(result);
      } else {
        sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ error: String(error) });
    }
  })();
  
  // 返回 true 表示异步响应
  return true;
});
```

```typescript
// background/handlers/action-handler.ts

import type { 
  RequestActionMessage, 
  ActionResultMessage,
  UIAction,
  ActionStatus
} from '../../shared/messages';
import { checkUsage, consumeUsage, record } from '../usage/usage';
import { allow } from '../pro/gate';
import { FREE_POLICY } from '../usage/policy';

/**
 * 处理 Action 请求
 */
export async function handleActionRequest(
  payload: RequestActionMessage['payload']
): Promise<ActionResultMessage['payload']> {
  const { action, data } = payload;
  
  // 1. 检查免费次数限制
  const usage = await checkUsage();
  if (!usage.allowed) {
    return {
      status: 'limited',
      uiAction: 'SHOW_LIMIT_PANEL',
      uiData: {
        message: `今日免费次数已用完 (${FREE_POLICY.maxPerDay}/${FREE_POLICY.maxPerDay})，明天将自动重置`
      }
    };
  }
  
  // 2. 根据 action 类型处理
  switch (action) {
    case 'text-extract':
      return await handleTextExtract(data);
    
    case 'table-detect':
      return await handleTableDetect(data);
    
    case 'column-align':
      return await handleColumnAlign(data);
    
    case 'csv-export':
      return await handleCSVExport(data);
    
    default:
      return {
        status: 'blocked',
        uiAction: 'SHOW_RESULT_PANEL',
        uiData: {
          message: '未知操作类型'
        }
      };
  }
}

/**
 * 处理文本提取
 */
async function handleTextExtract(data: unknown): Promise<ActionResultMessage['payload']> {
  // 文本提取是免费功能，允许执行
  
  // 返回成功结果
  const result: ActionResultMessage['payload'] = {
    status: 'ok',
    uiAction: 'SHOW_RESULT_PANEL',
    data,
    uiData: {
      text: data as string
    }
  };
  
  // 只在成功后记录和消耗 usage
  await record('select');
  await consumeUsage();
  
  return result;
}

/**
 * 处理表格检测
 */
async function handleTableDetect(data: unknown): Promise<ActionResultMessage['payload']> {
  // 检查 Pro 权限
  if (!await allow('table-detect')) {
    // 权限不足，不消耗 usage
    return {
      status: 'blocked',
      uiAction: 'SHOW_PRO_PANEL',
      uiData: {
        message: '表格识别是 Pro 功能，请升级以使用'
      }
    };
  }
  
  // 返回成功结果
  const result: ActionResultMessage['payload'] = {
    status: 'ok',
    uiAction: 'SHOW_RESULT_PANEL',
    data
  };
  
  // 只在成功后记录和消耗 usage
  await record('table-detect');
  await consumeUsage();
  
  return result;
}

/**
 * 处理列对齐
 */
async function handleColumnAlign(data: unknown): Promise<ActionResultMessage['payload']> {
  // 检查 Pro 权限
  if (!await allow('column-align')) {
    // 权限不足，不消耗 usage
    return {
      status: 'blocked',
      uiAction: 'SHOW_PRO_PANEL',
      uiData: {
        message: '列对齐是 Pro 功能，请升级以使用'
      }
    };
  }
  
  // 返回成功结果
  const result: ActionResultMessage['payload'] = {
    status: 'ok',
    uiAction: 'SHOW_RESULT_PANEL',
    data,
    uiData: {
      table: data as string[][]
    }
  };
  
  // 只在成功后记录 usage（不消耗，因为已经在 table-detect 时消耗过）
  await record('column-align');
  
  return result;
}

/**
 * 处理 CSV 导出
 */
async function handleCSVExport(data: unknown): Promise<ActionResultMessage['payload']> {
  // 检查 Pro 权限
  if (!await allow('csv-export')) {
    // 权限不足，不消耗 usage
    return {
      status: 'blocked',
      uiAction: 'SHOW_PRO_PANEL',
      uiData: {
        message: 'CSV 导出是 Pro 功能，请升级以使用'
      }
    };
  }
  
  // 返回成功结果
  const result: ActionResultMessage['payload'] = {
    status: 'ok',
    uiAction: 'SHOW_RESULT_PANEL',
    data,
    uiData: {
      csv: data as string
    }
  };
  
  // 只在成功后记录 usage（不消耗，因为已经在 table-detect 时消耗过）
  await record('csv-export');
  
  return result;
}
```

### 3. Content Script 重构

```typescript
// content/content.ts (简化版)

import { Selection } from './selection';
import { Panel } from './panel';
import { collect } from './extractor/collect';
import { layout } from './extractor/layout';
import { format } from './extractor/format';
import type { RequestActionMessage, ActionResultMessage } from '../shared/messages';

class BrowserSelectionCopy {
  private selection: Selection;
  private panel: Panel;
  
  // ... 其他属性
  
  /**
   * 鼠标释放事件（简化版）
   */
  private async handleMouseUp(event: MouseEvent): Promise<void> {
    if (!this.settings.enabled) return;
    if (!this.selection.getIsSelecting()) return;
    
    const rect = this.selection.finish();
    
    if (rect && this.selection.isValid(rect)) {
      // 1. 执行 collect 和 layout（核心资产，保留在 content）
      const items = collect(rect);
      const lines = layout(items, DEFAULT_LAYOUT_OPTIONS);
      const text = format(lines);
      
      // 2. 发送 REQUEST_ACTION 到 background
      const result = await this.requestAction('text-extract', text);
      
      // 3. 根据 uiAction 执行 UI 渲染
      this.executeUIAction(result);
    }
  }
  
  /**
   * 向 background 请求执行操作
   */
  private async requestAction(
    action: RequestActionMessage['payload']['action'],
    data?: unknown
  ): Promise<ActionResultMessage['payload']> {
    const message: RequestActionMessage = {
      type: 'REQUEST_ACTION',
      payload: { action, data }
    };
    
    try {
      const response = await chrome.runtime.sendMessage(message);
      return response as ActionResultMessage['payload'];
    } catch (error) {
      console.error('Failed to request action:', error);
      // 降级处理
      return {
        status: 'blocked',
        uiAction: 'SHOW_RESULT_PANEL',
        uiData: {
          message: '操作失败，请重试'
        }
      };
    }
  }
  
  /**
   * 执行 UI 动作
   * 
   * 关键：content 不判断 status，只执行 uiAction
   */
  private executeUIAction(result: ActionResultMessage['payload']): void {
    const { uiAction, uiData } = result;
    
    // 无条件执行 background 下发的 UI 指令
    switch (uiAction) {
      case 'SHOW_RESULT_PANEL':
        this.panel.showResult(uiData);
        break;
      
      case 'SHOW_LIMIT_PANEL':
        this.panel.showLimit(uiData);
        break;
      
      case 'SHOW_PRO_PANEL':
        this.panel.showPro(uiData);
        break;
      
      default:
        console.warn('Unknown UI action:', uiAction);
    }
  }
}
```

### 4. Panel 重构

```typescript
// content/panel.ts (简化版)

export class Panel {
  /**
   * 显示结果面板
   * 
   * 不再需要 usageInfo 参数，所有文案由 background 提供
   */
  showResult(uiData?: { text?: string; table?: string[][]; csv?: string }): void {
    // 渲染结果面板
    // 不包含任何业务逻辑判断
  }
  
  /**
   * 显示限制提示
   * 
   * 接收 background 生成的完整文案
   */
  showLimit(uiData?: { message?: string }): void {
    // 渲染限制提示面板
    // 直接使用 uiData.message，不自行拼装
  }
  
  /**
   * 显示 Pro 升级提示
   * 
   * 接收 background 生成的完整文案
   */
  showPro(uiData?: { message?: string }): void {
    // 渲染 Pro 升级面板
    // 直接使用 uiData.message，不自行拼装
  }
}
```

## 数据模型

### Usage 模块（迁移到 Background）

```typescript
// background/usage/usage.ts
// 完全保持现有逻辑，只是从 content/usage 迁移到 background/usage
```

### Pro 模块（迁移到 Background）

```typescript
// background/pro/gate.ts
// 完全保持现有逻辑，只是从 content/pro 迁移到 background/pro
```

## 正确性属性

*属性是一种特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*


### 属性 1：架构约束完整性

*对于任何* content 层代码文件，该文件不应包含对 usage、storage、policy、pro 模块的导入，不应包含 freeCount、limit、planType 等业务概念标识符，不应包含根据 status 进行业务判断的逻辑，不应 import background 下的任何文件、类型或实现，只能依赖 shared/messages.ts 中定义的消息协议和类型。

**验证：需求 1.2, 1.3, 3.6, 3.7, 3.8, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7**

### 属性 2：消息协议完整性

*对于任何* content 向 background 发送的消息，该消息必须是 REQUEST_ACTION 类型；*对于任何* background 向 content 返回的消息，该消息必须是 ACTION_RESULT 类型，且包含有效的 status（'ok' | 'limited' | 'blocked'）和 uiAction（'SHOW_RESULT_PANEL' | 'SHOW_LIMIT_PANEL' | 'SHOW_PRO_PANEL'）字段。

**验证：需求 3.1, 3.2, 3.3, 3.4, 3.5**

### 属性 3：UI 执行无条件性

*对于任何* background 返回的 ACTION_RESULT 消息，content 必须无条件执行其中的 uiAction 指令，不得根据 status 字段进行二次判断或分支选择，不得对 ActionResult 的字段进行语义解释，只能将其作为指令载体使用。

**验证：需求 1.4, 1.5, 3.6, 3.7, 7.5**

### 属性 4：操作请求完整性

*对于任何* 需要执行的操作（文本提取、表格检测、列对齐、CSV 导出），content 必须发送 REQUEST_ACTION 消息到 background，而不是直接执行业务逻辑。

**验证：需求 1.1, 7.1**

### 属性 5：Background 职责完整性

*对于任何* usage 相关的状态读写、pro 相关的权限判断、策略相关的决策逻辑，这些操作必须且只能在 background 层执行。

**验证：需求 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4**

### 属性 6：消息响应完整性

*对于任何* background 收到的 REQUEST_ACTION 消息，background 必须返回包含 status 和 uiAction 的 ACTION_RESULT 消息。

**验证：需求 2.5**

### 属性 7：Storage 访问隔离

*对于任何* content 层代码，不得直接调用 chrome.storage.local 读取 usage_count、last_usage_date、usage_stats、pro_state 等业务相关的键。

**验证：需求 4.5, 5.5**

### 属性 8：Shared 模块纯净性

*对于任何* shared 模块中的代码，只能包含类型定义、消息协议定义和纯工具函数，不得包含 usage、pro、policy、strategy 相关的状态结构或业务逻辑。

**验证：需求 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8**

### 属性 9：错误处理健壮性

*对于任何* background 抛出的错误或消息通信失败，content 必须优雅降级，显示友好的错误提示，而不是崩溃。

**验证：需求 9.2, 9.5**

### 属性 10：错误日志完整性

*对于任何* background 中发生的错误，必须记录到 console。

**验证：需求 9.4**

### 属性 11：Usage 消耗时机正确性

*对于任何* action 请求，usage 的消耗（consumeUsage）和记录（record）只能在 ActionResult.status === 'ok' 时执行；当 status 为 'limited' 或 'blocked' 时，不得消耗或记录 usage。

**验证：架构语义约束**

## 架构演进说明

### UI 文案生成策略

**当前实现**：
- ActionHandler 负责生成 uiData.message 文案
- 这是"阶段性集中实现"，便于快速完成重构

**未来演进**：
- 可将 UI 文案迁移至专用的文案/策略模块
- ActionHandler 不应被视为"最终 UI 文案中心"
- 这是架构演进预留，不要求立即重构

### 依赖关系约束

**强制规则**：
- Content 层不得 import background 下的任何文件、类型或实现
- Content 层不得依赖 background 内部的数据结构
- Content 与 Background 的唯一耦合点：shared/messages.ts

**设计原则**：
- ActionResult 是跨层协议，不是业务模型
- 其字段含义不得在 content 中被"语义解释"
- Content 只能将其作为"指令载体"使用

## 错误处理

### 1. 消息通信失败

**场景**：content 发送消息后，background 无响应或抛出异常

**处理**：
- content 设置 5 秒超时
- 超时后显示友好的错误提示："操作失败，请重试"
- 不阻断用户继续使用其他功能

### 2. Storage 访问失败

**场景**：background 无法访问 chrome.storage.local

**处理**：
- 使用内存降级存储
- 记录警告日志
- 功能继续运行，但数据不持久化

### 3. Pro 验证失败

**场景**：Pro 状态签名验证失败

**处理**：
- 降级为免费版权限
- 记录警告日志
- 返回 status='blocked' 和对应的 uiAction

### 4. 数据迁移失败

**场景**：旧版本数据格式无法解析

**处理**：
- 使用默认值初始化
- 记录错误日志
- 不影响插件正常运行

## 测试策略

### 单元测试

**Background 层**：
- 测试 usage 模块的所有函数（checkUsage、consumeUsage、record 等）
- 测试 pro 模块的所有函数（allow、verifySignature 等）
- 测试 action handler 的所有分支（text-extract、table-detect 等）
- 测试错误处理逻辑（storage 失败、签名验证失败等）

**Content 层**：
- 测试 requestAction 函数的消息发送
- 测试 executeUIAction 函数的 UI 渲染
- 测试错误处理逻辑（通信失败、超时等）

### 属性测试

**属性 1：架构约束完整性**
- 使用静态分析工具（如 ESLint 规则）验证 content 代码不包含禁止的导入和标识符
- 最少 1 次验证（静态分析）

**属性 2：消息协议完整性**
- 生成随机的操作类型和数据
- 验证所有消息都符合协议格式
- 最少 100 次迭代

**属性 3：UI 执行无条件性**
- 生成随机的 ACTION_RESULT 消息
- 验证 content 只使用 uiAction，不使用 status
- 最少 100 次迭代

**属性 4：操作请求完整性**
- 模拟各种用户操作
- 验证 content 总是发送消息而不是直接执行
- 最少 100 次迭代

**属性 5：Background 职责完整性**
- 使用静态分析验证所有业务逻辑都在 background 中
- 最少 1 次验证（静态分析）

**属性 6：消息响应完整性**
- 生成随机的 REQUEST_ACTION 消息
- 验证 background 总是返回完整的 ACTION_RESULT
- 最少 100 次迭代

**属性 7：Storage 访问隔离**
- 使用静态分析验证 content 不直接访问 storage
- 最少 1 次验证（静态分析）

**属性 8：Shared 模块纯净性**
- 使用静态分析验证 shared 模块只包含允许的内容
- 最少 1 次验证（静态分析）

**属性 9：错误处理健壮性**
- 模拟各种错误场景（通信失败、超时、异常等）
- 验证 content 不崩溃且显示友好提示
- 最少 100 次迭代

**属性 10：错误日志完整性**
- 触发各种错误
- 验证所有错误都被记录到 console
- 最少 100 次迭代

### 集成测试

**完整流程测试**：
1. 用户进行框选操作
2. Content 发送 REQUEST_ACTION
3. Background 处理并返回 ACTION_RESULT
4. Content 执行 uiAction 渲染 UI
5. 验证整个流程正确无误

**兼容性测试**：
1. 设置旧版本的 storage 数据
2. 启动插件
3. 验证数据正确迁移
4. 验证功能正常工作

**错误恢复测试**：
1. 模拟 storage 失败
2. 验证使用内存降级存储
3. 恢复 storage
4. 验证数据同步正确

### 测试工具

- **单元测试框架**：Jest
- **属性测试库**：fast-check
- **静态分析工具**：ESLint + 自定义规则
- **集成测试工具**：Puppeteer（模拟浏览器环境）

### 测试覆盖率目标

- Background 层：90% 以上
- Content 层：85% 以上
- Shared 层：100%（纯类型定义）
