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
│  ┌──────────────────────────────┐   │
│  │  panel.ts                    │   │
│  │  - 拼装业务文案              │   │
│  │  - 读取 FREE_POLICY          │   │
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
┌─────────────────────────────────────────────────────────┐
│                   Content Script                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  content.ts                                      │   │
│  │  - 页面感知（selection）                        │   │
│  │  - 发送 REQUEST_ACTION                           │   │
│  │  - 执行 uiAction 指令（无条件）                 │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  selection.ts                                    │   │
│  │  - 框选逻辑                                      │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  extractor.ts（合并版）                         │   │
│  │  - DOM 采集 + 排版分析 + 格式化                 │   │
│  │  - 表格检测 + 对齐 + CSV                        │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  panel.ts（合并版）                             │   │
│  │  - showResult / showLimit / showPro             │   │
│  │  - 纯 UI 渲染，不拼装文案                       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        ↕ MESSAGE
┌─────────────────────────────────────────────────────────┐
│                  Shared（协议护城河）                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  types.ts（合并版）                             │   │
│  │  - 消息协议 + 枚举 + 跨层类型                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        ↕ MESSAGE
┌─────────────────────────────────────────────────────────┐
│              Background Service（业务中心）             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  index.ts                                        │   │
│  │  - 消息分发 + Action 处理                       │   │
│  │  - 统一异常兜底                                 │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  usage.ts（合并版）                             │   │
│  │  - check / consume / record + 策略              │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  pro.ts（合并版）                               │   │
│  │  - allow / verify + 功能映射                    │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  storage.ts                                      │   │
│  │  - chrome.storage 统一封装                      │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  settings.ts                                     │   │
│  │  - 插件设置管理                                 │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 组件和接口

### 1. Shared 层（协议护城河）

```typescript
// src/shared/types.ts（合并版）

/**
 * ============================================
 * 消息协议
 * ============================================
 */

/**
 * Content → Background: 请求执行操作
 */
export interface RequestActionMessage {
  type: 'REQUEST_ACTION';
  payload: {
    action: ActionType;
    data?: unknown;
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
    data?: unknown;
    uiData?: {
      text?: string;
      table?: string[][];
      csv?: string;
      message?: string;  // 由 background 生成的完整文案
    };
  };
}

/**
 * 所有消息类型的联合
 */
export type ExtensionMessage =
  | RequestActionMessage
  | ActionResultMessage;

/**
 * ============================================
 * 枚举类型
 * ============================================
 */

/**
 * 操作类型
 */
export type ActionType =
  | 'text-extract'      // 文本提取
  | 'table-detect'      // 表格检测
  | 'column-align'      // 列对齐
  | 'csv-export';       // CSV 导出

/**
 * UI 动作枚举
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
 * ============================================
 * 跨层纯类型
 * ============================================
 */

/**
 * 选择区域
 */
export interface SelectionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * 插件设置
 */
export interface PluginSettings {
  enabled: boolean;
  panelPosition: 'center' | 'mouse' | 'none';
}

/**
 * 文本项（extractor 使用）
 */
export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 布局选项（extractor 使用）
 */
export interface LayoutOptions {
  lineThresholdRatio: number;
  minHorizontalGap: number;
}
```

### 2. Background 层重构

#### 2.1 消息入口和 Action 处理

```typescript
// src/background/index.ts

/**
 * Background 入口 + 消息分发 + Action 处理
 * 
 * 职责：
 * - 消息监听和路由
 * - Action 请求处理
 * - 统一异常兜底
 * - 快捷键处理
 */

import type { ExtensionMessage, RequestActionMessage, ActionResultMessage } from '../shared/types';
import { checkUsage, consumeUsage, record } from './usage';
import { allow } from './pro';
import { getSettings, updateSettings } from './settings';

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
      // 统一异常兜底返回
      sendResponse({
        status: 'blocked',
        uiAction: 'SHOW_RESULT_PANEL',
        uiData: {
          message: '操作失败，请重试'
        }
      });
    }
  })();
  
  // 返回 true 表示异步响应
  return true;
});

/**
 * 处理 Action 请求
 * 
 * ActionHandler 职责边界说明：
 * - 当前允许：生成 uiData.message 文案
 * - 当前禁止：UI 状态管理、A/B 测试逻辑、国际化逻辑
 * - 架构演进：这是阶段性集中实现，未来可迁移至专用文案模块
 */
async function handleActionRequest(
  payload: RequestActionMessage['payload']
): Promise<ActionResultMessage['payload']> {
  const { action, data } = payload;
  
  try {
    // 1. 检查免费次数限制
    const usage = await checkUsage();
    if (!usage.allowed) {
      return {
        status: 'limited',
        uiAction: 'SHOW_LIMIT_PANEL',
        uiData: {
          message: `今日免费次数已用完 (${usage.max}/${usage.max})，明天将自动重置`
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
        // 未知操作类型，返回兜底结果
        return {
          status: 'blocked',
          uiAction: 'SHOW_RESULT_PANEL',
          uiData: {
            message: '未知操作类型'
          }
        };
    }
  } catch (error) {
    // 统一异常兜底返回
    console.error('Action handler error:', error);
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
 * 处理文本提取
 */
async function handleTextExtract(data: unknown): Promise<ActionResultMessage['payload']> {
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
    return {
      status: 'blocked',
      uiAction: 'SHOW_PRO_PANEL',
      uiData: {
        message: '表格识别是 Pro 功能，请升级以使用'
      }
    };
  }
  
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
    return {
      status: 'blocked',
      uiAction: 'SHOW_PRO_PANEL',
      uiData: {
        message: '列对齐是 Pro 功能，请升级以使用'
      }
    };
  }
  
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
    return {
      status: 'blocked',
      uiAction: 'SHOW_PRO_PANEL',
      uiData: {
        message: 'CSV 导出是 Pro 功能，请升级以使用'
      }
    };
  }
  
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

// 快捷键处理
chrome.commands.onCommand.addListener(async (command: string) => {
  if (command === 'selection-switch') {
    const settings = await getSettings();
    await updateSettings({ enabled: !settings.enabled });
    
    // 通知当前标签页
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'updateSettings', 
          payload: { enabled: !settings.enabled } 
        });
      } catch (error) {
        // 内容脚本可能还未注入，忽略错误
      }
    }
  }
});
```

#### 2.2 Usage 模块（合并版）

```typescript
// src/background/usage.ts

/**
 * 使用次数 + 策略（合并版）
 * 
 * 职责：
 * - 使用次数管理（check / consume / record）
 * - 免费策略定义
 * - 跨天重置逻辑
 * - 使用统计数据
 */

import { getFromStorage, setToStorage } from './storage';

/**
 * ============================================
 * 策略定义
 * ============================================
 */

/**
 * 免费策略：每日20次
 */
export const FREE_POLICY = {
  maxPerDay: 20
};

/**
 * ============================================
 * 类型定义
 * ============================================
 */

/**
 * 使用事件类型
 */
export type UsageEvent =
  | 'select'
  | 'table-detect'
  | 'column-align'
  | 'csv-export';

/**
 * 使用状态接口
 */
export interface UsageState {
  allowed: boolean;
  reason?: 'limit-reached';
  remaining?: number;
  max: number;
}

/**
 * 事件统计数据
 */
export interface UsageStats {
  selectCount: number;
  tableDetectCount: number;
  columnAlignCount: number;
  csvExportCount: number;
  lastDate: string;
}

/**
 * ============================================
 * 核心功能
 * ============================================
 */

/**
 * 检查是否允许使用
 */
export async function checkUsage(): Promise<UsageState> {
  await resetIfNewDay();
  
  const count = await getUsageCount();
  const max = FREE_POLICY.maxPerDay;
  
  if (count >= max) {
    return {
      allowed: false,
      reason: 'limit-reached',
      remaining: 0,
      max
    };
  }
  
  return {
    allowed: true,
    remaining: max - count,
    max
  };
}

/**
 * 消耗一次使用额度
 */
export async function consumeUsage(): Promise<void> {
  const count = await getUsageCount();
  await setToStorage('usage_count', count + 1);
}

/**
 * 记录使用事件
 */
export async function record(event: UsageEvent): Promise<void> {
  try {
    await resetIfNewDay();
    
    const stats = await getStats();
    
    switch (event) {
      case 'select':
        stats.selectCount++;
        break;
      case 'table-detect':
        stats.tableDetectCount++;
        break;
      case 'column-align':
        stats.columnAlignCount++;
        break;
      case 'csv-export':
        stats.csvExportCount++;
        break;
    }
    
    await setToStorage('usage_stats', stats);
  } catch (error) {
    console.warn('Failed to record usage event', event, error);
  }
}

/**
 * ============================================
 * 辅助功能
 * ============================================
 */

/**
 * 获取当日使用次数
 */
async function getUsageCount(): Promise<number> {
  return await getFromStorage('usage_count', 0);
}

/**
 * 获取使用统计
 */
async function getStats(): Promise<UsageStats> {
  const defaultStats: UsageStats = {
    selectCount: 0,
    tableDetectCount: 0,
    columnAlignCount: 0,
    csvExportCount: 0,
    lastDate: new Date().toDateString()
  };
  
  return await getFromStorage('usage_stats', defaultStats);
}

/**
 * 如果是新的一天，重置使用次数
 */
async function resetIfNewDay(): Promise<void> {
  const today = new Date().toDateString();
  const lastDate = await getFromStorage('last_usage_date', '');
  
  if (!lastDate || lastDate !== today) {
    await setToStorage('usage_count', 0);
    await setToStorage('last_usage_date', today);
    await setToStorage('usage_stats', {
      selectCount: 0,
      tableDetectCount: 0,
      columnAlignCount: 0,
      csvExportCount: 0,
      lastDate: today
    });
  }
}
```

#### 2.3 Pro 模块（合并版）

```typescript
// src/background/pro.ts

/**
 * Pro 判断（合并版）
 * 
 * 职责：
 * - Pro 权限判断（allow / verify）
 * - 功能权限映射
 * - 签名验证
 * - 使用模式检测
 * 
 * 注意：当前为占位实现，未来可扩展
 */

import { getFromStorage } from './storage';

/**
 * Pro 功能类型
 */
export type ProFeature =
  | 'table-detect'
  | 'column-align'
  | 'csv-export';

/**
 * Pro 状态接口
 */
export interface ProState {
  isPro: boolean;
  signature: string;
  features: Record<ProFeature, boolean>;
}

/**
 * 检查是否允许使用 Pro 功能
 * 
 * 当前为简化实现，直接返回 false
 * 未来可扩展为完整的权限验证
 */
export async function allow(feature: ProFeature): Promise<boolean> {
  const state = await getProState();
  
  // 简化实现：当前所有 Pro 功能都不可用
  // 未来可扩展为：
  // - 验证签名
  // - 检查功能是否启用
  // - 验证使用模式
  
  return state.isPro && state.features[feature] === true;
}

/**
 * 获取 Pro 状态
 */
async function getProState(): Promise<ProState> {
  const defaultState: ProState = {
    isPro: false,
    signature: '',
    features: {
      'table-detect': false,
      'column-align': false,
      'csv-export': false
    }
  };
  
  return await getFromStorage('pro_state', defaultState);
}
```

#### 2.4 Storage 模块

```typescript
// src/background/storage.ts

/**
 * chrome.storage 统一封装
 * 
 * 职责：
 * - 提供 get / set / remove 等方法
 * - 内存降级存储
 * - 错误处理
 */

/**
 * 内存降级存储
 */
const memoryFallback = new Map<string, unknown>();

/**
 * 从 storage 读取数据
 */
export async function getFromStorage<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const result = await chrome.storage.local.get([key]);
    return result[key] !== undefined ? result[key] : defaultValue;
  } catch (error) {
    console.warn(`Storage get failed for key: ${key}, using memory fallback`, error);
    return memoryFallback.has(key) ? memoryFallback.get(key) as T : defaultValue;
  }
}

/**
 * 向 storage 写入数据
 */
export async function setToStorage(key: string, value: unknown): Promise<void> {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.warn(`Storage set failed for key: ${key}, using memory fallback`, error);
    memoryFallback.set(key, value);
  }
}

/**
 * 从 storage 删除数据
 */
export async function removeFromStorage(key: string): Promise<void> {
  try {
    await chrome.storage.local.remove(key);
  } catch (error) {
    console.warn(`Storage remove failed for key: ${key}, using memory fallback`, error);
    memoryFallback.delete(key);
  }
}
```

#### 2.5 Settings 模块

```typescript
// src/background/settings.ts

/**
 * 插件设置管理
 * 
 * 职责：
 * - 开关状态（enabled）
 * - 面板位置（panelPosition）
 */

import type { PluginSettings } from '../shared/types';
import { getFromStorage, setToStorage } from './storage';

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: PluginSettings = {
  enabled: false,
  panelPosition: 'center'
};

/**
 * 获取插件设置
 */
export async function getSettings(): Promise<PluginSettings> {
  const enabled = await getFromStorage('enabled', DEFAULT_SETTINGS.enabled);
  const panelPosition = await getFromStorage('panelPosition', DEFAULT_SETTINGS.panelPosition);
  
  return { enabled, panelPosition };
}

/**
 * 更新插件设置
 */
export async function updateSettings(partial: Partial<PluginSettings>): Promise<void> {
  if (partial.enabled !== undefined) {
    await setToStorage('enabled', partial.enabled);
  }
  
  if (partial.panelPosition !== undefined) {
    await setToStorage('panelPosition', partial.panelPosition);
  }
}
```

### 3. Content 层重构

```typescript
// src/content/content.ts

/**
 * Content 入口（事件监听 / 消息）
 * 
 * 职责：
 * - 事件监听（mousedown / mousemove / mouseup）
 * - 消息发送（REQUEST_ACTION）
 * - UI Action 执行（根据 uiAction 调用 panel）
 * 
 * 禁止：
 * - 不得包含业务逻辑判断
 * - 不得读取 usage、pro 状态
 * - 不得根据 status 二次判断
 */

import { Selection } from './selection';
import { extract } from './extractor';
import { Panel } from './panel';
import type { RequestActionMessage, ActionResultMessage, PluginSettings } from '../shared/types';

class BrowserSelectionCopy {
  private selection: Selection;
  private panel: Panel;
  private settings: PluginSettings = {
    enabled: false,
    panelPosition: 'center'
  };
  
  // ... 其他属性
  
  /**
   * 鼠标释放事件
   */
  private async handleMouseUp(event: MouseEvent): Promise<void> {
    if (!this.settings.enabled) return;
    if (!this.selection.getIsSelecting()) return;
    
    const rect = this.selection.finish();
    
    if (rect && this.selection.isValid(rect)) {
      // 1. 执行数据提取（核心资产，保留在 content）
      const text = extract(rect);
      
      // 2. 发送 REQUEST_ACTION 到 background
      const result = await this.requestAction('text-extract', text);
      
      // 3. 根据 uiAction 执行 UI 渲染（无条件执行）
      this.executeUIAction(result);
    }
  }
  
  /**
   * 向 background 请求执行操作
   */
  private async requestAction(
    action: ActionType,
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

```typescript
// src/content/selection.ts

/**
 * 框选逻辑
 * 
 * 职责：
 * - 选择区域计算
 * - 选择框渲染
 * - 选择状态管理
 */

import type { SelectionRect } from '../shared/types';

export class Selection {
  private isSelecting = false;
  private startX = 0;
  private startY = 0;
  private element: HTMLDivElement | null = null;
  
  /**
   * 开始选择
   */
  start(x: number, y: number): void {
    this.isSelecting = true;
    this.startX = x;
    this.startY = y;
    this.createSelectionBox();
  }
  
  /**
   * 更新选择
   */
  update(x: number, y: number): void {
    if (!this.isSelecting || !this.element) return;
    
    const rect = this.calculateRect(x, y);
    this.updateSelectionBox(rect);
  }
  
  /**
   * 完成选择
   */
  finish(): SelectionRect | null {
    if (!this.isSelecting) return null;
    
    this.isSelecting = false;
    const rect = this.getRect();
    this.clear();
    
    return rect;
  }
  
  /**
   * 清除选择框
   */
  clear(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
  
  /**
   * 判断选择是否有效
   */
  isValid(rect: SelectionRect): boolean {
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    return width > 10 && height > 10;
  }
  
  // ... 其他辅助方法
}
```

```typescript
// src/content/extractor.ts（合并版）

/**
 * 页面数据提取（核心资产）
 * 
 * 职责：
 * - DOM 信息采集（collect）
 * - 排版结构分析（layout）
 * - 数据格式化（format）
 * - 表格检测、对齐、CSV 导出
 */

import type { SelectionRect, TextItem, LayoutOptions } from '../shared/types';

/**
 * 提取选择区域的文本
 * 
 * 这是对外的主接口，内部调用 collect → layout → format
 */
export function extract(rect: SelectionRect): string {
  const items = collect(rect);
  const lines = layout(items, DEFAULT_LAYOUT_OPTIONS);
  return format(lines);
}

/**
 * DOM 信息采集
 * 
 * 从选择区域中提取所有文本节点的位置和内容
 */
function collect(rect: SelectionRect): TextItem[] {
  const items: TextItem[] = [];
  
  // 遍历 DOM，收集文本节点
  // ... 实现细节
  
  return items;
}

/**
 * 排版结构分析
 * 
 * 将文本项按照视觉位置组织成行
 */
function layout(items: TextItem[], options: LayoutOptions): TextItem[][] {
  const lines: TextItem[][] = [];
  
  // 按 Y 坐标分组成行
  // ... 实现细节
  
  return lines;
}

/**
 * 数据格式化
 * 
 * 将行数组转换为最终的文本字符串
 */
function format(lines: TextItem[][]): string {
  return lines
    .map(line => line.map(item => item.text).join(' '))
    .join('\n');
}

/**
 * 表格检测
 * 
 * 检测文本是否为表格结构
 */
export function detectTable(lines: TextItem[][]): { columns: number; rows: string[][] } {
  // ... 实现细节
  return { columns: 0, rows: [] };
}

/**
 * 表格对齐
 * 
 * 对表格进行列对齐
 */
export function alignTable(table: { columns: number; rows: string[][] }): string[][] {
  // ... 实现细节
  return table.rows;
}

/**
 * CSV 导出
 * 
 * 将表格转换为 CSV 格式
 */
export function toCSV(table: { columns: number; rows: string[][] }): string {
  // ... 实现细节
  return '';
}

const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  lineThresholdRatio: 5,
  minHorizontalGap: 10
};
```

```typescript
// src/content/panel.ts（合并版）

/**
 * 面板调度（创建 / 销毁）
 * 
 * 职责：
 * - 成功结果 UI（showResult）
 * - 免费用尽 UI（showLimit）
 * - 升级 Pro UI（showPro）
 * - 面板拖动、定位等交互
 * 
 * 禁止：
 * - 不得包含业务逻辑判断
 * - 不得拼装业务文案
 * - 不得读取 usage、pro 状态
 */

export class Panel {
  private element: HTMLDivElement | null = null;
  
  /**
   * 显示结果面板
   * 
   * 接收 background 生成的数据，纯渲染
   */
  showResult(uiData?: { text?: string; table?: string[][]; csv?: string }): void {
    this.hide();
    
    // 创建面板
    this.element = document.createElement('div');
    this.element.className = 'bsc-panel';
    
    // 渲染内容
    if (uiData?.text) {
      this.renderTextResult(uiData.text);
    } else if (uiData?.table) {
      this.renderTableResult(uiData.table);
    }
    
    // 如果有 CSV，添加导出按钮
    if (uiData?.csv) {
      this.addCSVExportButton(uiData.csv);
    }
    
    document.body.appendChild(this.element);
  }
  
  /**
   * 显示限制提示
   * 
   * 接收 background 生成的完整文案
   */
  showLimit(uiData?: { message?: string }): void {
    this.hide();
    
    // 创建面板
    this.element = document.createElement('div');
    this.element.className = 'bsc-panel bsc-panel-limit';
    
    // 渲染限制提示
    const message = document.createElement('div');
    message.className = 'bsc-message';
    message.textContent = uiData?.message || '今日免费次数已用完';
    
    this.element.appendChild(message);
    document.body.appendChild(this.element);
  }
  
  /**
   * 显示 Pro 升级提示
   * 
   * 接收 background 生成的完整文案
   */
  showPro(uiData?: { message?: string }): void {
    this.hide();
    
    // 创建面板
    this.element = document.createElement('div');
    this.element.className = 'bsc-panel bsc-panel-pro';
    
    // 渲染 Pro 提示
    const message = document.createElement('div');
    message.className = 'bsc-message';
    message.textContent = uiData?.message || '这是 Pro 功能';
    
    this.element.appendChild(message);
    document.body.appendChild(this.element);
  }
  
  /**
   * 隐藏面板
   */
  hide(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
  
  // ... 其他辅助方法（renderTextResult、renderTableResult、addCSVExportButton 等）
}
```

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
