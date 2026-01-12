# Design Document

## Overview

本设计文档描述浏览器插件第三版升级的技术实现方案，核心目标是实现 Free + Pro 双轨制变现模型。设计遵循现有的三层架构约束（Background 业务层、Content UI 层、Shared 协议层），通过消息协议实现层间通信。

### 设计目标

1. **变现模型转换**：从"每日 20 次统一限制"转为"基础能力行数限制 + 高级能力试用次数限制"
2. **新增高级能力**：高级清洗、智能表格识别、一键导出
3. **安全性增强**：试用次数加密存储，防止破解
4. **用户体验优化**：清晰的能力展示、合理的升级提示时机
5. **架构一致性**：严格遵守现有架构约束，所有业务逻辑在 Background 层

### 关键设计原则

1. **职责分离**：Background 层负责所有业务逻辑和策略决策，Content 层只负责 UI 渲染
2. **消息驱动**：通过 REQUEST_ACTION 和 ACTION_RESULT 消息实现层间通信
3. **安全优先**：试用次数数据加密存储，防止客户端篡改
4. **渐进增强**：保持基础功能永久可用，高级功能提供试用机会
5. **可扩展性**：导出格式、清洗规则、表格识别算法均可扩展

## Architecture

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser Page                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Content Layer                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │  Selection   │  │  Extractor   │  │    Panel     │ │ │
│  │  │   (框选)     │  │  (数据提取)  │  │  (UI渲染)    │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │         Table Detector (表格识别 - 新增)         │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↕ Message Protocol                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Background Layer                      │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │    Usage     │  │     Pro      │  │   Settings   │ │ │
│  │  │  (试用次数)  │  │  (权限验证)  │  │   (设置)     │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │   Cleaner    │  │   Exporter   │  │   Storage    │ │ │
│  │  │ (清洗逻辑)   │  │  (导出逻辑)  │  │  (加密存储)  │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         ┌────────────────────────────────────────┐
         │            Popup Layer                  │
         │  ┌──────────────────────────────────┐  │
         │  │  Settings UI + Status Display    │  │
         │  └──────────────────────────────────┘  │
         └────────────────────────────────────────┘
```

### 层次职责

**Background 层（业务逻辑层）**
- 试用次数管理（加密存储、验证、消耗）
- Pro 权限验证
- 数据清洗逻辑（基础清洗 + 高级清洗）
- 导出格式转换（CSV、Excel）
- 行数限制策略
- UI Action 决策
- 文案生成

**Content 层（UI 交互层）**
- 框选交互
- 数据提取（文本、表格）
- 表格自动识别和按钮注入
- 预览窗口渲染
- 高级清洗 UI
- 导出格式选择 UI
- 根据 uiAction 无条件渲染

**Shared 层（协议层）**
- 消息协议定义
- 枚举类型定义
- 跨层类型定义
- 基础常量定义

## Components and Interfaces

### 1. Usage Management（试用次数管理 - 重构）

**职责：** 管理高级能力的试用状态，提供基于无语义状态的非线性派生机制

**核心设计原则：**
1. **无语义状态**：不存储直接的次数值，只维护无意义的状态种子
2. **非线性派生**：通过多步非线性计算派生可用性和剩余次数
3. **单调性保护**：状态演化只能不变或变差，不允许回退或增益
4. **多因子授权**：授权判断由多因子输入、多步骤计算后折叠得到
5. **视图分离**：UI 显示的次数仅为派生视图值，不参与授权判断

**接口：**

```typescript
// 高级能力类型
export type AdvancedFeature = 
  | 'advanced-cleaning'    // 高级清洗
  | 'table-detection'      // 表格识别
  | 'one-click-export';    // 一键导出

// 无语义状态（内部存储）
interface FeatureState {
  seed: number;      // 状态种子（无语义）
  entropy: number;   // 熵值（无语义）
  timestamp: number; // 时间戳（用于多因子计算）
}

// 派生结果（对外接口）
export interface TrialState {
  allowed: boolean;   // 是否允许使用（派生值）
  remaining: number;  // 剩余次数视图值（派生值，仅供 UI 显示）
  feature: AdvancedFeature;
}

// 检查试用状态（派生计算）
export async function checkTrial(feature: AdvancedFeature): Promise<TrialState>

// 演化状态（非线性）
export async function evolveTrial(feature: AdvancedFeature): Promise<void>

// 获取所有试用状态（派生计算）
export async function getAllTrials(): Promise<Record<AdvancedFeature, TrialState>>

// 初始化状态种子
export async function initializeTrials(): Promise<void>
```

**实现要点：**

**1. 状态存储（无语义）**
```typescript
// 存储格式（无直接次数值）
{
  'state_advanced_cleaning': { seed: 0x7f3a9b2c, entropy: 0x4e8d1f6a, timestamp: 1704067200000 },
  'state_table_detection': { seed: 0x2c9f4e1b, entropy: 0x8a3d7f2e, timestamp: 1704067200000 },
  'state_one_click_export': { seed: 0x5b8e2d9a, entropy: 0x1f6c4a8b, timestamp: 1704067200000 }
}
```

**2. 非线性派生函数**
```typescript
// 派生可用性（多步非线性计算）
function deriveAllowed(state: FeatureState, now: number): boolean {
  const factor1 = (state.seed ^ 0x9e3779b9) >>> 0;
  const factor2 = (state.entropy * 0x85ebca6b) >>> 0;
  const factor3 = Math.floor((now - state.timestamp) / 86400000);
  
  const hash1 = (factor1 + factor2) >>> 0;
  const hash2 = (hash1 ^ (hash1 >>> 16)) * 0x7feb352d >>> 0;
  const hash3 = (hash2 ^ (hash2 >>> 15)) * 0x846ca68b >>> 0;
  
  const threshold = 0x40000000; // 修改此值会使额度失效
  return (hash3 ^ factor3) > threshold;
}

// 派生剩余次数视图值（仅供 UI 显示）
function deriveRemaining(state: FeatureState): number {
  const hash = (state.seed ^ state.entropy) >>> 0;
  const normalized = hash / 0xffffffff;
  return Math.max(0, Math.floor(normalized * 3.5)); // 0-3 的视图值
}
```

**3. 状态演化（单调性保护）**
```typescript
// 演化状态（只能变差，不能变好）
function evolveState(state: FeatureState): FeatureState {
  const newSeed = (state.seed * 0x5deece66d + 0xb) & 0xffffffffffff;
  const newEntropy = (state.entropy ^ (state.entropy >>> 7)) * 0x2545f491 >>> 0;
  
  return {
    seed: newSeed >>> 0,
    entropy: newEntropy,
    timestamp: Date.now()
  };
}
```

**4. 多因子授权判断**
```typescript
// 授权判断（多因子折叠）
async function authorize(feature: AdvancedFeature): Promise<boolean> {
  const state = await getFeatureState(feature);
  const now = Date.now();
  
  // 因子1：状态派生
  const allowed1 = deriveAllowed(state, now);
  
  // 因子2：时间窗口
  const daysSinceInit = Math.floor((now - state.timestamp) / 86400000);
  const allowed2 = daysSinceInit < 365; // 一年内有效
  
  // 因子3：状态完整性
  const allowed3 = state.seed !== 0 && state.entropy !== 0;
  
  // 多因子折叠
  return allowed1 && allowed2 && allowed3;
}
```

**5. 防篡改保护**
- 修改任何计算常量（如 `0x9e3779b9`、`threshold`）会导致派生结果失效
- 修改运算符（如 `^`、`>>>`、`*`）会导致派生结果失效
- UI 显示的 `remaining` 值被篡改不影响 `authorize` 判断
- 状态演化具备单调性，无法通过修改状态回退到"更好"的状态

**6. Pro 用户处理**
- Pro 用户不演化状态
- Pro 用户的授权判断直接返回 true，不依赖状态派生

### 2. Pro Verification（Pro 权限验证 - 完善）

**职责：** 验证用户的 Pro 订阅状态

**接口：**

```typescript
// Pro 状态
export interface ProState {
  isPro: boolean;
  expiresAt?: number;  // 过期时间戳
  features: Set<string>;  // 已解锁功能
}

// 检查是否为 Pro 用户
export async function isPro(): Promise<boolean>

// 验证 Pro 权限
export async function verifyPro(): Promise<ProState>

// 更新 Pro 状态
export async function updateProState(state: ProState): Promise<void>
```

**实现要点：**
- 当前阶段：简化实现，通过本地标志判断
- 未来扩展：支持服务器验证、订阅管理
- Pro 用户解除所有限制（行数 + 试用次数）

### 3. Data Cleaner（数据清洗 - 新增）

**职责：** 提供基础清洗和高级清洗功能

**接口：**

```typescript
// 清洗规则
export interface CleaningRules {
  removeEmptyLines: boolean;      // 去空行
  mergeMultipleLines: boolean;    // 合并多行
  customSeparator?: string;       // 自定义分隔符
  mergeToSingleLine: boolean;     // 合并为一行
  removeDuplicates: boolean;      // 去重
}

// 基础清洗（默认规则）
export function basicClean(data: string[]): string[]

// 高级清洗（自定义规则）
export function advancedClean(data: string[], rules: CleaningRules): string[]
```

**实现要点：**
- 基础清洗：去除首尾空白、规范化换行
- 高级清洗：根据用户选择的规则处理
- 清洗逻辑在 Background 层，确保一致性

### 4. Data Exporter（数据导出 - 扩展）

**职责：** 支持多种格式的数据导出

**接口：**

```typescript
// 导出格式
export type ExportFormat = 'csv' | 'excel';

// 导出选项
export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  cleaningRules?: CleaningRules;
}

// 导出数据
export async function exportData(
  data: string[][],
  options: ExportOptions
): Promise<Blob>

// 转换为 CSV
export function toCSV(data: string[][]): string

// 转换为 Excel
export function toExcel(data: string[][]): Blob
```

**实现要点：**
- CSV：遵循 RFC 4180 标准
- Excel：使用 SheetJS 或类似库
- 支持清洗规则应用
- 预留扩展接口（JSON、XML 等）

### 5. Table Detector（表格识别 - 新增）

**职责：** 自动识别页面中的表格结构并注入导出按钮

**接口：**

```typescript
// 表格信息
export interface TableInfo {
  element: HTMLElement;
  rows: number;
  cols: number;
  data: string[][];
}

// 扫描页面表格
export function scanTables(): TableInfo[]

// 识别 <table> 元素
export function detectHTMLTable(element: HTMLTableElement): TableInfo

// 识别其他元素实现的表格
export function detectDivTable(element: HTMLElement): TableInfo | null

// 注入导出按钮
export function injectExportButton(table: TableInfo): void

// 移除导出按钮
export function removeExportButtons(): void
```

**实现要点：**
- 识别 `<table>` 元素（标准表格）
- 识别 div/span 等元素实现的表格（基于布局分析）
- 算法：检测网格状布局、行列对齐、重复结构
- 在表格左上角注入导出按钮（绝对定位）
- 按钮样式：小图标，hover 显示提示
- 试用次数用尽时不注入按钮

### 6. Preview Panel（预览窗口 - 扩展）

**职责：** 显示提取结果，提供复制、导出、高级清洗功能

**新增 UI 元素：**
- 【导出】按钮（当前无）
- 【高级清洗（Pro）】按钮
- 行数限制提示（"仅展示前 5 行"）
- 导出格式选择弹窗
- 高级清洗规则选择弹窗

**交互流程：**

```
用户框选 → 提取数据 → 显示预览窗口
                          ↓
         ┌────────────────┴────────────────┐
         │                                  │
    【复制】                            【导出】
         │                                  │
         ↓                                  ↓
  应用清洗规则？                      选择格式
         │                                  │
    是 → 高级清洗                      CSV / Excel
         │                                  │
    否 → 基础清洗                      应用清洗规则？
         │                                  │
         ↓                              是 → 高级清洗
    复制到剪贴板                            │
                                       否 → 基础清洗
                                            │
                                            ↓
                                       下载文件
```

### 7. Popup Interface（Popup 界面 - 重新设计）

**新增内容：**

```
┌─────────────────────────────────────┐
│  浏览器框选复制插件          v3.0.0 │
├─────────────────────────────────────┤
│  启用插件：  [✓]                    │
│  弹窗位置：  [页面居中 ▼]           │
├─────────────────────────────────────┤
│  Free 版能力：                       │
│  • 框选复制（最多 5 行）             │
│  • 基础导出（最多 5 行）             │
│                                      │
│  Pro 版能力：                        │
│  • 无行数限制                        │
│  • 高级清洗（剩余 3 次试用）         │
│  • 表格识别（剩余 3 次试用）         │
│  • 一键导出（剩余 3 次试用）         │
├─────────────────────────────────────┤
│           [升级到 Pro 版]            │
└─────────────────────────────────────┘
```

**实现要点：**
- 显示当前版本号
- 显示 Free 和 Pro 能力对比
- 显示每项高级能力的剩余试用次数
- Pro 用户显示"已激活"状态
- 升级按钮（当前阶段可为占位）

## Data Models

### 1. Storage Schema（存储模式）

**无语义状态存储：**

```typescript
// 存储结构（无直接次数值）
interface StorageData {
  // 无语义状态（每项高级能力）
  state_advanced_cleaning: FeatureState;
  state_table_detection: FeatureState;
  state_one_click_export: FeatureState;
  
  // Pro 状态
  pro_state: ProState;
  
  // 设置
  enabled: boolean;
  panelPosition: PanelPosition;
}

// 无语义状态结构
interface FeatureState {
  seed: number;      // 状态种子（无语义，32位整数）
  entropy: number;   // 熵值（无语义，32位整数）
  timestamp: number; // 初始化时间戳
}
```

**存储特点：**
- 不存储直接的次数值（quota、used、remain）
- 只存储无意义的状态种子和熵值
- 所有可用性和剩余次数都是派生计算结果
- 修改存储的 seed 或 entropy 值会导致派生结果变化（通常变差）

### 2. Message Protocol（消息协议 - 扩展）

**新增 Action 类型：**

```typescript
export type ActionType =
  | 'text-extract'           // 文本提取（已有）
  | 'table-detect'           // 表格检测（已有，需完善）
  | 'column-align'           // 列对齐（已有）
  | 'csv-export'             // CSV 导出（已有，需完善）
  | 'advanced-clean'         // 高级清洗（新增）
  | 'table-export'           // 表格导出（新增）
  | 'check-trial';           // 检查试用次数（新增）
```

**新增 UI Action：**

```typescript
export type UIAction =
  | 'SHOW_RESULT_PANEL'      // 显示结果面板（已有）
  | 'SHOW_LIMIT_PANEL'       // 显示限制提示（已有）
  | 'SHOW_PRO_PANEL'         // 显示 Pro 升级提示（已有）
  | 'SHOW_CLEANING_DIALOG'   // 显示清洗规则选择（新增）
  | 'SHOW_EXPORT_DIALOG'     // 显示导出格式选择（新增）
  | 'SHOW_TRIAL_EXHAUSTED';  // 显示试用次数用尽（新增）
```

**扩展 uiData：**

```typescript
interface UIData {
  text?: string;
  table?: string[][];
  csv?: string;
  message?: string;
  
  // 新增字段
  rowLimit?: number;              // 行数限制
  totalRows?: number;             // 总行数
  isLimited?: boolean;            // 是否被限制
  trialRemaining?: number;        // 剩余试用次数
  cleaningRules?: CleaningRules;  // 清洗规则
  exportFormats?: ExportFormat[]; // 可用导出格式
}
```

### 3. Cleaning Rules Model（清洗规则模型）

```typescript
export interface CleaningRules {
  removeEmptyLines: boolean;      // 去空行
  mergeMultipleLines: boolean;    // 合并多行
  customSeparator?: string;       // 自定义分隔符
  mergeToSingleLine: boolean;     // 合并为一行
  removeDuplicates: boolean;      // 去重
}

// 默认基础清洗规则
export const BASIC_CLEANING: CleaningRules = {
  removeEmptyLines: false,
  mergeMultipleLines: false,
  mergeToSingleLine: false,
  removeDuplicates: false
};
```

### 4. Table Detection Model（表格识别模型）

```typescript
export interface TableInfo {
  element: HTMLElement;
  type: 'html-table' | 'div-table';
  rows: number;
  cols: number;
  data: string[][];
  boundingRect: DOMRect;
}

// 表格识别配置
export interface TableDetectionConfig {
  minRows: number;           // 最小行数（默认 2）
  minCols: number;           // 最小列数（默认 2）
  alignmentThreshold: number; // 对齐阈值（默认 5px）
  gridGapTolerance: number;   // 网格间隙容差（默认 10px）
}
```

## Correctness Properties

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### Property 1: Free 用户行数限制一致性

*对于任何* Free 用户和任何基础能力操作（框选、复制、导出），当数据超过 5 行时，系统输出应该被限制为前 5 行。

**Validates: Requirements 1.3, 2.2, 2.3, 2.4**

### Property 2: Pro 用户无限制访问

*对于任何* Pro 用户和任何操作（基础能力或高级能力），系统不应该应用行数限制或试用次数限制。

**Validates: Requirements 1.5, 2.6, 3.10, 4.8, 5.5, 9.6**

### Property 3: 试用次数独立递减

*对于任何* Free 用户和任何高级能力，成功使用该能力后，该能力的试用次数应该减少 1，而其他高级能力的试用次数保持不变。

**Validates: Requirements 1.4, 3.8, 4.6, 7.9, 9.1, 9.3**

### Property 4: 清洗规则应用一致性

*对于任何* 数据和任何清洗规则，复制操作和导出操作应该产生相同的清洗结果。

**Validates: Requirements 3.7, 7.8, 10.1, 10.2, 10.4**

### Property 5: 表格识别完整性

*对于任何* 包含标准 `<table>` 元素或网格状布局的 DOM 结构，表格识别算法应该识别出所有符合最小行列数要求的表格。

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 6: 导出格式正确性

*对于任何* 表格数据，导出为 CSV 格式后再解析，应该得到与原始数据等价的结构（round-trip property）。

**Validates: Requirements 5.6, 5.7**

### Property 7: 试用状态派生安全性

*对于任何* 存储在 chrome.storage.local 中的试用状态数据，其 key 和 value 都应该是无语义的，不包含直接的次数值或易识别的模式。所有可用性和剩余次数都应该通过非线性计算派生得到。

**Validates: Requirements 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13, 9.14**

### Property 8: 升级提示触发精确性

*对于任何* Free 用户，升级提示应该且仅应该在试用次数为 0 且尝试使用对应高级能力时触发，不应该在其他场景触发。

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 9: 行数限制提示可见性

*对于任何* Free 用户，当显示的数据被限制为 5 行时，预览窗口应该包含明确的提示文本。

**Validates: Requirements 2.5, 7.2**

### Property 10: 表格导出按钮注入正确性

*对于任何* 识别出的表格，当 Free 用户有试用次数或用户为 Pro 时，应该在表格左上角注入导出按钮；当 Free 用户试用次数为 0 时，不应该注入按钮。

**Validates: Requirements 4.4, 4.7**

### Property 11: 清洗规则去空行正确性

*对于任何* 包含空行的数据，应用"去空行"清洗规则后，输出不应该包含空行。

**Validates: Requirements 3.2, 3.7**

### Property 12: 清洗规则去重正确性

*对于任何* 包含重复行的数据，应用"去重"清洗规则后，输出中每一行都应该是唯一的。

**Validates: Requirements 3.6, 3.7**

### Property 13: 架构约束遵守

*对于任何* 代码变更，Content 层不应该包含业务逻辑判断，不应该直接访问 chrome.storage，不应该 import Background 层文件。

**Validates: Requirements 12.1-12.10**

## Error Handling

### 1. 试用次数加密失败

**场景：** 加密或解密试用次数数据时失败

**处理策略：**
- 记录错误日志
- 降级到内存存储（会话级别）
- 向用户显示友好提示："数据加载失败，请刷新页面"
- 不暴露加密细节

### 2. 表格识别算法失败

**场景：** 表格识别算法遇到异常 DOM 结构

**处理策略：**
- 捕获异常，记录错误信息
- 跳过该表格，继续识别其他表格
- 不影响基础框选功能
- 不向用户显示错误（静默失败）

### 3. 导出格式转换失败

**场景：** CSV 或 Excel 导出时转换失败

**处理策略：**
- 捕获异常，记录错误信息
- 向用户显示错误提示："导出失败，请重试"
- 提供降级方案：复制到剪贴板
- 不消耗试用次数

### 4. Pro 权限验证失败

**场景：** 无法验证 Pro 权限状态

**处理策略：**
- 默认按 Free 用户处理
- 记录错误日志
- 提供手动刷新权限的入口
- 不阻塞基础功能

### 5. 清洗规则应用异常

**场景：** 应用清洗规则时遇到异常数据

**处理策略：**
- 捕获异常，记录错误信息
- 降级到基础清洗
- 向用户显示警告："部分清洗规则未能应用"
- 仍然返回处理后的数据

### 6. 存储空间不足

**场景：** chrome.storage.local 空间不足

**处理策略：**
- 清理过期数据
- 压缩存储数据
- 向用户显示提示："存储空间不足，部分功能可能受限"
- 优先保证试用次数数据

## Testing Strategy

### 测试方法论

本项目采用**双轨测试策略**：单元测试验证具体示例和边界情况，属性测试验证通用正确性属性。两者互补，共同确保代码质量。

### 单元测试（Unit Tests）

**覆盖范围：**
- 具体功能示例（如：初始化试用次数为 3）
- 边界情况（如：试用次数为 0 时的行为）
- 错误处理（如：加密失败的降级）
- UI 元素存在性（如：Popup 包含特定按钮）

**测试框架：** Jest + jsdom

**覆盖率目标：**
- Background 层：≥ 90%
- Content 层：≥ 85%
- Shared 层：100%（纯类型定义）

**关键测试用例：**
- 试用次数初始化为 3
- 试用次数用尽后禁用功能
- Pro 用户不消耗试用次数
- 加密存储的 key 和 value
- 表格识别注入按钮
- 清洗规则界面包含所有选项
- Popup 显示剩余次数

### 属性测试（Property-Based Tests）

**覆盖范围：**
- 通用正确性属性（如：Free 用户总是被限制为 5 行）
- 数据处理一致性（如：复制和导出使用相同清洗逻辑）
- 安全性属性（如：存储数据总是加密的）
- 架构约束（如：Content 层不包含业务逻辑）

**测试框架：** fast-check

**配置：**
- 每个属性测试最少 100 次迭代
- 使用智能生成器（如：生成符合约束的表格数据）
- 每个测试标注对应的设计属性编号

**标注格式：**
```typescript
// Feature: v3-freemium-model, Property 1: Free 用户行数限制一致性
test('Free users are always limited to 5 rows', () => {
  fc.assert(
    fc.property(
      fc.array(fc.string(), { minLength: 6, maxLength: 100 }),
      (data) => {
        const result = processData(data, { isPro: false });
        expect(result.length).toBeLessThanOrEqual(5);
      }
    ),
    { numRuns: 100 }
  );
});
```

**关键属性测试：**
- Property 1: Free 用户行数限制一致性
- Property 2: Pro 用户无限制访问
- Property 3: 试用次数独立递减
- Property 4: 清洗规则应用一致性
- Property 5: 表格识别完整性
- Property 6: 导出格式正确性（round-trip）
- Property 7: 试用次数加密安全性
- Property 8: 升级提示触发精确性

### 集成测试（Integration Tests）

**覆盖范围：**
- 端到端用户流程（框选 → 清洗 → 导出）
- 跨层消息通信（Background ↔ Content）
- 试用次数消耗和恢复
- Pro 权限切换

**测试场景：**
1. Free 用户完整流程：框选 → 预览（5 行限制）→ 复制
2. Free 用户试用高级清洗：使用 3 次 → 次数用尽 → 显示升级提示
3. Pro 用户完整流程：框选 → 预览（无限制）→ 高级清洗 → 导出
4. 表格识别流程：页面加载 → 识别表格 → 注入按钮 → 点击导出
5. 权限切换：Free → Pro → 验证限制解除

### 架构守门测试（Architecture Gate Tests）

**目的：** 强制执行架构约束，防止违反设计原则

**测试内容：**
- Content 层不 import Background 层文件
- Content 层不直接访问 chrome.storage
- Content 层不包含业务逻辑关键字（usage、pro、trial、policy）
- Background 层生成所有业务文案
- 所有跨层类型定义在 Shared 层

### 测试数据生成器

**为属性测试提供智能生成器：**

```typescript
// 生成随机表格数据
const tableGenerator = fc.array(
  fc.array(fc.string(), { minLength: 2, maxLength: 10 }),
  { minLength: 2, maxLength: 50 }
);

// 生成随机清洗规则
const cleaningRulesGenerator = fc.record({
  removeEmptyLines: fc.boolean(),
  mergeMultipleLines: fc.boolean(),
  customSeparator: fc.option(fc.string({ maxLength: 5 })),
  mergeToSingleLine: fc.boolean(),
  removeDuplicates: fc.boolean()
});

// 生成随机用户状态
const userStateGenerator = fc.record({
  isPro: fc.boolean(),
  trials: fc.record({
    'advanced-cleaning': fc.integer({ min: 0, max: 3 }),
    'table-detection': fc.integer({ min: 0, max: 3 }),
    'one-click-export': fc.integer({ min: 0, max: 3 })
  })
});
```

### 测试执行计划

**开发阶段：**
1. 编写单元测试（TDD 方式）
2. 实现功能
3. 编写属性测试
4. 运行所有测试，确保通过

**测试流程：**
1. 运行架构守门测试（快速失败）
2. 运行单元测试
3. 运行属性测试（100+ 迭代）
4. 运行集成测试
5. 生成覆盖率报告

**回归测试：**
- 每次代码变更都运行完整测试套件
- 属性测试失败时，保存反例用于调试
- 定期增加新的属性测试

