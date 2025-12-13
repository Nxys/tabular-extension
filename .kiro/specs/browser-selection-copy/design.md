# 设计文档

## 概述

浏览器框选复制插件采用 Chrome 扩展 Manifest v3 架构，通过 Content Script 实现页面交互，Service Worker 处理扩展生命周期。核心设计围绕三个主要组件：选择框管理器、视觉文本提取器和结果面板。插件使用事件驱动架构，确保用户交互的响应性和文本提取的准确性。

## 架构

### 整体架构
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Service       │    │   Content        │    │   UI            │
│   Worker        │◄──►│   Script         │◄──►│   Components    │
│                 │    │                  │    │                 │
│ - 扩展生命周期   │    │ - 页面交互       │    │ - 选择框        │
│ - 权限管理      │    │ - 文本提取       │    │ - 结果面板      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 组件交互流程
```
用户拖拽 → 选择框创建 → 文本检测 → 位置计算 → 视觉排序 → 结果展示 → 复制操作
```

## 组件和接口

### 1. SelectionBox 组件
**职责**: 处理鼠标交互，创建和管理选择框UI

**接口**:
```typescript
interface SelectionBox {
  // 开始选择
  startSelection(startX: number, startY: number): void;
  // 更新选择框
  updateSelection(currentX: number, currentY: number): void;
  // 完成选择
  finishSelection(): SelectionRect;
  // 清除选择框
  clearSelection(): void;
}

interface SelectionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
```

### 2. VisualTextExtractor 组件
**职责**: 提取选择区域内的文本并按视觉顺序排列

**接口**:
```typescript
interface VisualTextExtractor {
  // 提取文本
  extractText(selectionRect: SelectionRect): string;
  // 获取文本元素
  getTextElements(rect: SelectionRect): TextElement[];
  // 按视觉顺序排序
  sortByVisualOrder(elements: TextElement[]): TextElement[];
}

interface TextElement {
  text: string;
  rect: DOMRect;
  element: Element;
}
```

### 3. ResultPanel 组件
**职责**: 显示提取结果和提供复制功能

**接口**:
```typescript
interface ResultPanel {
  // 显示结果
  showResult(text: string): void;
  // 隐藏面板
  hide(): void;
  // 复制到剪贴板
  copyToClipboard(text: string): Promise<boolean>;
}
```

## 数据模型

### 文本元素模型
```typescript
interface TextElement {
  text: string;           // 文本内容
  rect: DOMRect;         // 屏幕位置信息
  element: Element;      // DOM 元素引用
  lineIndex: number;     // 视觉行索引
  columnIndex: number;   // 行内列索引
}
```

### 选择区域模型
```typescript
interface SelectionRect {
  left: number;    // 左边界
  top: number;     // 上边界  
  right: number;   // 右边界
  bottom: number;  // 下边界
}
```

### 视觉行模型
```typescript
interface VisualLine {
  lineIndex: number;        // 行索引
  topY: number;            // 行顶部Y坐标
  bottomY: number;         // 行底部Y坐标
  elements: TextElement[]; // 该行的文本元素
}
```

## 正确性属性

*属性是应该在系统的所有有效执行中保持为真的特征或行为——本质上是关于系统应该做什么的正式声明。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

基于预工作分析，以下是经过反思和去重后的核心正确性属性：

### 属性 1: 选择框生命周期完整性
*对于任何* 鼠标拖拽操作序列，选择框应该正确响应开始、更新、完成和清除的完整生命周期
**验证需求: 1.1, 1.2, 1.3, 1.4, 1.5**

### 属性 2: 文本元素过滤准确性  
*对于任何* 选择区域和页面文本元素集合，只有可见且与选择区域相交的文本元素应该被包含在提取结果中
**验证需求: 2.1, 2.2, 2.3, 2.4, 2.5**

### 属性 3: 视觉顺序排列正确性
*对于任何* 文本元素集合，排序后的文本应该按照从上到下、从左到右的视觉阅读顺序，同行文本用空格分隔，不同行用换行符分隔
**验证需求: 3.1, 3.2, 3.3, 3.4, 3.5**

### 属性 4: 结果面板交互完整性
*对于任何* 提取的文本内容，结果面板应该正确显示内容、处理复制操作、提供用户反馈并响应隐藏操作
**验证需求: 4.2, 4.3, 4.4, 4.5**

### 属性 5: 非侵入性操作保证
*对于任何* 页面内容，插件操作不应该修改原始页面结构、发送网络请求或影响页面正常功能
**验证需求: 5.3, 5.5**

## 错误处理

### 1. 文本提取错误
- **场景**: getClientRects API 调用失败
- **处理**: 跳过该元素，继续处理其他元素，记录警告日志
- **用户反馈**: 在结果面板显示"部分文本可能未被提取"提示

### 2. 剪贴板访问错误  
- **场景**: 浏览器拒绝剪贴板写入权限
- **处理**: 降级到文本选择模式，允许用户手动复制
- **用户反馈**: 显示"请手动复制选中文本"提示

### 3. DOM 操作错误
- **场景**: 页面结构变化导致元素访问失败
- **处理**: 重新扫描页面元素，更新内部状态
- **用户反馈**: 自动重试，失败时提示"请重新选择"

### 4. 选择区域无效
- **场景**: 选择区域过小或无文本内容
- **处理**: 显示空结果提示，不创建结果面板
- **用户反馈**: 在选择框位置显示"未检测到文本"提示

## 测试策略

### 双重测试方法

本项目采用单元测试和基于属性的测试相结合的方法：

- **单元测试**: 验证具体示例、边界情况和错误条件
- **属性测试**: 验证应该在所有输入中保持的通用属性
- 两者互补提供全面覆盖：单元测试捕获具体错误，属性测试验证通用正确性

### 单元测试要求

单元测试通常覆盖：
- 演示正确行为的具体示例
- 组件之间的集成点  
- 单元测试很有用，但避免编写过多。属性测试的工作是处理大量输入的覆盖。

### 基于属性的测试要求

- 必须为目标语言选择基于属性的测试库并在设计文档中指定。不得从头实现基于属性的测试。
- 应该将每个基于属性的测试配置为运行至少100次迭代，因为属性测试过程是随机的。
- 必须为每个基于属性的测试添加注释，明确引用设计文档中该测试实现的正确性属性。
- 必须使用以下确切格式标记每个基于属性的测试：'**Feature: browser-selection-copy, Property {number}: {property_text}**'
- 每个正确性属性必须由单个基于属性的测试实现。

**选择的属性测试库**: 使用 JavaScript 的 fast-check 库进行属性测试，配置每个测试运行100次迭代以确保充分的随机性覆盖。

### 测试环境配置

- **浏览器环境**: 使用 Jest + jsdom 模拟浏览器环境
- **Chrome 扩展 API**: 使用 chrome-extension-testing-utils 模拟扩展API
- **DOM 操作**: 使用真实 DOM 操作而非模拟，确保测试的真实性
- **属性测试**: 使用 fast-check 生成随机测试数据

### 核心算法实现细节

#### 视觉文本排序算法
```typescript
// 核心排序逻辑 - 关键算法位置
function sortByVisualOrder(elements: TextElement[]): TextElement[] {
  // 1. 按Y坐标分组为视觉行（容差处理重叠）
  const lines = groupIntoVisualLines(elements);
  
  // 2. 行内按X坐标排序
  lines.forEach(line => {
    line.elements.sort((a, b) => a.rect.left - b.rect.left);
  });
  
  // 3. 按行顺序合并结果
  return lines
    .sort((a, b) => a.topY - b.topY)
    .flatMap(line => line.elements);
}

// 视觉行分组 - 处理行高差异和文本重叠
function groupIntoVisualLines(elements: TextElement[]): VisualLine[] {
  const tolerance = 5; // 像素容差
  const lines: VisualLine[] = [];
  
  elements.forEach(element => {
    const existingLine = lines.find(line => 
      Math.abs(line.topY - element.rect.top) <= tolerance
    );
    
    if (existingLine) {
      existingLine.elements.push(element);
      // 更新行边界
      existingLine.topY = Math.min(existingLine.topY, element.rect.top);
      existingLine.bottomY = Math.max(existingLine.bottomY, element.rect.bottom);
    } else {
      lines.push({
        lineIndex: lines.length,
        topY: element.rect.top,
        bottomY: element.rect.bottom,
        elements: [element]
      });
    }
  });
  
  return lines;
}
```

#### 文本提取和位置计算
```typescript
// 文本元素检测 - 核心提取逻辑
function getTextElements(selectionRect: SelectionRect): TextElement[] {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // 过滤空白和隐藏文本
        if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
        
        const parent = node.parentElement;
        if (!parent || !isVisible(parent)) return NodeFilter.FILTER_REJECT;
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  const elements: TextElement[] = [];
  let node: Text | null;
  
  while (node = walker.nextNode() as Text) {
    const parent = node.parentElement!;
    const rects = parent.getClientRects();
    
    // 检查每个rect是否与选择区域相交
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (intersects(rect, selectionRect)) {
        elements.push({
          text: node.textContent || '',
          rect: rect,
          element: parent,
          lineIndex: -1, // 稍后分配
          columnIndex: -1 // 稍后分配
        });
        break; // 每个文本节点只添加一次
      }
    }
  }
  
  return elements;
}

// 矩形相交检测
function intersects(rect: DOMRect, selection: SelectionRect): boolean {
  return !(rect.right < selection.left || 
           rect.left > selection.right ||
           rect.bottom < selection.top ||
           rect.top > selection.bottom);
}
```