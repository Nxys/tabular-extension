# 设计文档：关键Bug修复

## 概述

本设计文档针对测试中发现的6个关键Bug提供详细的技术解决方案。这些Bug影响了插件的核心功能，需要在Background和Content层进行修复，同时严格遵守三层架构原则。

## 架构原则

遵循Chrome插件三层架构：
- **Background**: 业务逻辑、状态管理、决策
- **Content**: UI交互、DOM操作、无条件执行uiAction
- **Shared**: 类型定义、消息协议

**关键约束**:
- Content不得包含业务判断
- Content不得访问storage
- 通过消息协议通信
- Background生成所有文案
- uiAction控制UI渲染

## 需求1：插件关闭状态下禁用表格检测

### 问题分析

当前实现中，即使插件被禁用（`settings.enabled = false`），表格检测功能仍然会执行：
1. `content/index.ts` 的 `initialize()` 方法会扫描并注入表格按钮
2. MutationObserver 持续监听DOM变化并注入按钮
3. 用户可以点击表格导出按钮触发导出操作

这违反了用户预期：插件关闭时应该完全不可见、不可用。

### 设计方案

#### 方案1：在Content层检查settings.enabled（推荐）

**实现位置**: `src/content/index.ts`

**修改点**:

1. **扫描表格前检查状态**
```typescript
private scanAndInjectTableButtons(): void {
  // 新增：检查插件是否启用
  if (!this.settings.enabled) {
    return;  // 插件禁用时不扫描表格
  }
  
  try {
    const tables = scanTables();
    // ... 现有逻辑
  }
}
```

2. **初始化时检查状态**
```typescript
initialize(): void {
  this.settingsReady.then(() => {
    // 新增：只有在插件启用时才扫描表格
    if (this.settings.enabled) {
      const delay = this.calculateSmartDelay();
      setTimeout(() => {
        this.scanAndInjectTableButtons();
      }, delay);
    }
  });
  
  // ... 现有逻辑
}
```

3. **设置变化时处理按钮**
```typescript
async applySettings(partial: Partial<PluginSettings>, persist = false): Promise<void> {
  await this.settingsReady;
  const prevEnabled = this.settings.enabled;
  this.settings = { ...this.settings, ...partial };

  // 当被关闭时立刻清理 UI
  if (prevEnabled && !this.settings.enabled) {
    this.selection.clear();
    this.panel.hide();
    // 新增：移除所有表格导出按钮
    this.removeAllExportButtons();
  }
  
  // 新增：当被启用时扫描表格
  if (!prevEnabled && this.settings.enabled) {
    const delay = this.calculateSmartDelay();
    setTimeout(() => {
      this.scanAndInjectTableButtons();
    }, delay);
  }

  // ... 现有逻辑
}
```

**优点**:
- 简单直接，修改最小
- 符合Content层职责（UI控制）
- 不需要修改Background层

**缺点**:
- Content层需要维护settings状态

#### 方案2：在Background层拦截请求（备选）

**实现位置**: `src/background/index.ts`

**修改点**:

在 `handleActionRequest` 开头添加插件状态检查：

```typescript
async function handleActionRequest(
  payload: RequestActionMessage['payload']
): Promise<ActionResultMessage['payload']> {
  const { action, data } = payload;
  
  try {
    // 新增：检查插件是否启用
    const settings = await getSettings();
    if (!settings.enabled) {
      return {
        status: 'blocked',
        uiAction: 'SHOW_RESULT_PANEL',
        uiData: {
          message: '插件已禁用，请在设置中启用'
        }
      };
    }
    
    // ... 现有逻辑
  }
}
```

**优点**:
- 集中控制，所有操作都被拦截
- Content层无需关心业务状态

**缺点**:
- 用户仍能看到表格导出按钮（体验不佳）
- 需要额外的请求才能知道插件被禁用

### 推荐方案

**采用方案1**，原因：
1. 表格按钮的显示/隐藏属于UI控制，符合Content层职责
2. 避免用户看到无法使用的按钮（更好的UX）
3. 减少不必要的消息通信

### 测试验证

**单元测试** (`tests/unit/content/index.test.ts`):
```typescript
describe('插件禁用状态', () => {
  it('应该在插件禁用时不扫描表格', () => {
    const tabular = new Tabular();
    tabular.applySettings({ enabled: false });
    
    // 模拟初始化
    tabular.initialize();
    
    // 验证没有注入按钮
    const buttons = document.querySelectorAll('.table-export-button');
    expect(buttons.length).toBe(0);
  });
  
  it('应该在插件禁用时移除已有按钮', () => {
    const tabular = new Tabular();
    tabular.applySettings({ enabled: true });
    tabular.initialize();
    
    // 等待按钮注入
    // ...
    
    // 禁用插件
    tabular.applySettings({ enabled: false });
    
    // 验证按钮被移除
    const buttons = document.querySelectorAll('.table-export-button');
    expect(buttons.length).toBe(0);
  });
});
```

**集成测试** (`tests/integration/plugin-state.test.ts`):
```typescript
test('插件禁用时表格检测不可用', async ({ page, extensionId }) => {
  // 禁用插件
  await page.evaluate(() => {
    chrome.storage.local.set({ enabled: false });
  });
  
  // 加载包含表格的页面
  await page.goto('http://localhost:3000/table-page.html');
  
  // 等待页面加载
  await page.waitForTimeout(1000);
  
  // 验证没有导出按钮
  const buttons = await page.$$('.table-export-button');
  expect(buttons.length).toBe(0);
});
```



## 需求2：重构高级清洗功能

### 问题分析

当前高级清洗功能存在以下问题：
1. **"去除空行"是框选自带能力** - 框选时已经过滤空行，无需重复
2. **"合并多行"功能重复** - 与"合并为一行"语义重叠
3. **"自定义分隔符"与"合并为一行"互斥** - 设计不合理，应该可以组合使用

### 设计方案

#### 清洗选项重构

**移除选项**:
- ❌ "去除空行" (`removeEmptyLines`) - 框选已处理
- ❌ "合并多行" (`mergeMultipleLines`) - 功能重复

**保留选项**:
- ✅ "合并为一行" (`mergeToSingleLine`) - 将所有行合并为单行
- ✅ "自定义分隔符" (`customSeparator`) - 始终可用，不与其他选项互斥
- ✅ "去除重复行" (`removeDuplicates`) - 保留

#### 新的清洗逻辑

**实现位置**: `src/background/cleaner.ts`

**修改 CleaningRules 接口**:
```typescript
export interface CleaningRules {
  mergeToSingleLine: boolean;     // 合并为一行
  customSeparator?: string;       // 自定义分隔符（始终适用）
  removeDuplicates: boolean;      // 去重
}
```

**修改 advancedClean 函数**:
```typescript
export function advancedClean(data: string[], rules: CleaningRules): string[] {
  try {
    let result = [...data];

    // 1. 合并为一行（如果启用）
    if (rules.mergeToSingleLine) {
      // 使用自定义分隔符（如果提供），否则使用空格
      const separator = rules.customSeparator !== undefined 
        ? rules.customSeparator 
        : ' ';
      result = [result.join(separator)];
    } else if (rules.customSeparator !== undefined) {
      // 2. 如果没有合并为一行，但提供了自定义分隔符
      // 使用自定义分隔符连接所有行
      result = [result.join(rules.customSeparator)];
    }

    // 3. 去重（如果启用）
    if (rules.removeDuplicates) {
      const seen = new Set<string>();
      result = result.filter(line => {
        if (seen.has(line)) {
          return false;
        }
        seen.add(line);
        return true;
      });
    }

    return result;
  } catch (error) {
    console.error('Error applying advanced cleaning rules:', error);
    return basicClean(data);
  }
}
```

#### UI层修改

**实现位置**: `src/content/panel.ts`

**修改 showCleaningDialog 方法**:
```typescript
showCleaningDialog(uiData?: { text?: string }): void {
  // ... 创建弹窗代码 ...
  
  // 规则选项（重构后）
  const rules = [
    { id: 'mergeToSingleLine', label: '合并为一行' },
    { id: 'removeDuplicates', label: '去除重复行' }
  ];
  
  const checkboxes: Record<string, HTMLInputElement> = {};
  
  rules.forEach(rule => {
    const ruleItem = document.createElement('label');
    ruleItem.className = `${CSS_CLASS_PREFIX}-dialog-rule-item`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = rule.id;
    checkbox.className = `${CSS_CLASS_PREFIX}-dialog-checkbox`;
    checkboxes[rule.id] = checkbox;
    
    const labelText = document.createElement('span');
    labelText.textContent = rule.label;
    
    ruleItem.appendChild(checkbox);
    ruleItem.appendChild(labelText);
    rulesContainer.appendChild(ruleItem);
  });
  
  // 自定义分隔符选项（始终可用）
  const separatorItem = document.createElement('div');
  separatorItem.className = `${CSS_CLASS_PREFIX}-dialog-separator-item`;
  
  const separatorLabel = document.createElement('label');
  separatorLabel.textContent = '自定义分隔符（可选）：';
  
  const separatorInput = document.createElement('input');
  separatorInput.type = 'text';
  separatorInput.className = `${CSS_CLASS_PREFIX}-dialog-separator-input`;
  separatorInput.placeholder = '例如：, 或 | 或 空格';
  
  separatorItem.appendChild(separatorLabel);
  separatorItem.appendChild(separatorInput);
  rulesContainer.appendChild(separatorItem);
  
  // 移除互斥逻辑（不再需要）
  
  // 确认按钮
  confirmBtn.onclick = () => {
    const selectedRules = {
      mergeToSingleLine: checkboxes.mergeToSingleLine.checked,
      customSeparator: separatorInput.value || undefined,
      removeDuplicates: checkboxes.removeDuplicates.checked
    };
    
    if (this.onActionRequest) {
      this.onActionRequest('advanced-clean', {
        text: textToClean,
        cleaningRules: selectedRules,
        operation: 'copy'
      });
    }
    
    overlay.remove();
    // ... 清理代码 ...
  };
  
  // ... 其余代码 ...
}
```

#### 类型定义更新

**实现位置**: `src/shared/types.ts`

```typescript
export interface CleaningRules {
  mergeToSingleLine: boolean;     // 合并为一行
  customSeparator?: string;       // 自定义分隔符
  removeDuplicates: boolean;      // 去重
}
```

### 测试验证

**单元测试** (`tests/unit/background/cleaner.test.ts`):
```typescript
describe('重构后的高级清洗', () => {
  it('应该支持合并为一行 + 自定义分隔符', () => {
    const data = ['line1', 'line2', 'line3'];
    const rules: CleaningRules = {
      mergeToSingleLine: true,
      customSeparator: ' | ',
      removeDuplicates: false
    };
    
    const result = advancedClean(data, rules);
    expect(result).toEqual(['line1 | line2 | line3']);
  });
  
  it('应该支持仅使用自定义分隔符（不合并为一行）', () => {
    const data = ['line1', 'line2', 'line3'];
    const rules: CleaningRules = {
      mergeToSingleLine: false,
      customSeparator: ',',
      removeDuplicates: false
    };
    
    const result = advancedClean(data, rules);
    expect(result).toEqual(['line1,line2,line3']);
  });
  
  it('应该支持去重', () => {
    const data = ['line1', 'line2', 'line1', 'line3'];
    const rules: CleaningRules = {
      mergeToSingleLine: false,
      customSeparator: undefined,
      removeDuplicates: true
    };
    
    const result = advancedClean(data, rules);
    expect(result).toEqual(['line1', 'line2', 'line3']);
  });
});
```



## 需求3：修复面板框选问题

### 问题分析

当前实现中，【高级清洗规则】和【选择导出格式】这两个弹窗面板显示时，用户仍然可以在面板上进行文本框选，导致：
1. 用户体验混乱（面板内容被意外选中）
2. 与主面板的禁用框选行为不一致

**根本原因**：框选功能（Selection）的z-index层级管理不当，导致框选框可能出现在面板之上。

### 设计方案

#### 方案：基于z-index层级管理（推荐）

**核心思路**：
- 面板应该始终在最顶层（z-index最高）
- 框选框应该始终在面板层级之下（z-index = 面板z-index - 1）
- 当面板显示时，框选功能应该被禁用或框选框应该被隐藏

**实现位置**: `src/content/selection.ts` 和 `src/content/panel.ts`

#### 修改点1：定义z-index层级常量

**实现位置**: `src/shared/constants.ts`

```typescript
/**
 * z-index 层级定义
 */
export const Z_INDEX = {
  SELECTION_BOX: 9998,        // 框选框
  PANEL: 9999,                // 主面板
  DIALOG_OVERLAY: 10000,      // 弹窗遮罩层
  DIALOG: 10001               // 弹窗
} as const;
```

#### 修改点2：确保框选框使用正确的z-index

**实现位置**: `src/content/selection.ts`

```typescript
import { Z_INDEX } from '../shared/constants';

export class Selection {
  // ... 现有代码 ...
  
  start(x: number, y: number): void {
    // ... 现有逻辑 ...
    
    this.box = document.createElement('div');
    this.box.className = `${CSS_CLASS_PREFIX}-selection-box`;
    this.box.style.position = 'fixed';
    this.box.style.zIndex = String(Z_INDEX.SELECTION_BOX);  // 使用定义的z-index
    
    // ... 其余代码 ...
  }
}
```

#### 修改点3：确保面板使用正确的z-index

**实现位置**: `src/content/panel.ts`

```typescript
import { Z_INDEX } from '../shared/constants';

export class Panel {
  // ... 现有代码 ...
  
  showResult(uiData?: { /* ... */ }, panelPosition: PanelPosition = 'center'): void {
    // ... 创建面板代码 ...
    
    this.element = document.createElement('div');
    this.element.className = `${CSS_CLASS_PREFIX}-panel`;
    this.element.style.zIndex = String(Z_INDEX.PANEL);  // 使用定义的z-index
    
    // ... 其余代码 ...
  }
  
  showCleaningDialog(uiData?: { text?: string }): void {
    // ... 创建弹窗代码 ...
    
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = `${CSS_CLASS_PREFIX}-dialog-overlay`;
    overlay.style.zIndex = String(Z_INDEX.DIALOG_OVERLAY);  // 遮罩层z-index
    
    // 创建弹窗
    const dialog = document.createElement('div');
    dialog.className = `${CSS_CLASS_PREFIX}-dialog`;
    dialog.style.zIndex = String(Z_INDEX.DIALOG);  // 弹窗z-index
    
    // ... 其余代码 ...
  }
  
  showExportDialog(uiData?: { text?: string; exportFormats?: string[] }): void {
    // ... 创建弹窗代码 ...
    
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = `${CSS_CLASS_PREFIX}-dialog-overlay`;
    overlay.style.zIndex = String(Z_INDEX.DIALOG_OVERLAY);  // 遮罩层z-index
    
    // 创建弹窗
    const dialog = document.createElement('div');
    dialog.className = `${CSS_CLASS_PREFIX}-dialog`;
    dialog.style.zIndex = String(Z_INDEX.DIALOG);  // 弹窗z-index
    
    // ... 其余代码 ...
  }
}
```

#### 修改点4：在CSS中确保z-index一致性

**实现位置**: `src/content/content.css`

```css
/* 框选框 */
.tabular-extension-selection-box {
  z-index: 9998 !important;  /* 低于面板 */
}

/* 主面板 */
.tabular-extension-panel {
  z-index: 9999 !important;  /* 高于框选框 */
}

/* 弹窗遮罩层 */
.tabular-extension-dialog-overlay {
  z-index: 10000 !important;  /* 高于主面板 */
}

/* 弹窗 */
.tabular-extension-dialog {
  z-index: 10001 !important;  /* 最高层级 */
}
```

#### 修改点5：面板显示时隐藏框选框

**实现位置**: `src/content/index.ts`

在 `Tabular` 类中，当面板显示时，确保框选框被清除：

```typescript
private async handleMouseUp(event: MouseEvent): Promise<void> {
  if (!this.settings.enabled) return;
  if (!this.selection.getIsSelecting()) return;

  const rect = this.selection.finish();

  if (rect && this.selection.isValid(rect)) {
    // 1. 执行数据提取
    const items = collect(rect);
    const lines = layout(items, DEFAULT_LAYOUT_OPTIONS);
    const text = format(lines);

    // 2. 发送 REQUEST_ACTION 到 background
    try {
      const result = await this.requestAction('text-extract', text);
      
      // 新增：在显示面板前，确保框选框被清除
      this.selection.clear();
      
      // 3. 根据 uiAction 执行 UI 渲染
      this.executeUIAction(result);
    } catch (error) {
      console.error('Communication with background failed:', error);
    }
  }

  event.preventDefault();
  event.stopPropagation();
}
```

#### 修改点6：确保Selection的clear方法正确移除框选框

**实现位置**: `src/content/selection.ts`

```typescript
export class Selection {
  // ... 现有代码 ...
  
  clear(): void {
    if (this.box) {
      this.box.remove();  // 确保从DOM中移除
      this.box = null;
    }
    this.isSelecting = false;
    this.startX = 0;
    this.startY = 0;
  }
}
```

#### 修改点7：遮罩层显示时禁用框选

**实现位置**: `src/content/panel.ts`

在显示弹窗遮罩层时，需要禁用框选功能：

```typescript
showCleaningDialog(uiData?: { text?: string }): void {
  // ... 创建弹窗代码 ...
  
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = `${CSS_CLASS_PREFIX}-dialog-overlay`;
  overlay.style.zIndex = String(Z_INDEX.DIALOG_OVERLAY);
  
  // 新增：遮罩层阻止鼠标事件传递到页面
  overlay.style.pointerEvents = 'auto';  // 确保遮罩层捕获所有鼠标事件
  
  // 新增：阻止遮罩层上的鼠标事件触发框选
  overlay.addEventListener('mousedown', (e) => {
    e.stopPropagation();  // 阻止事件冒泡到页面
  });
  
  // ... 其余代码 ...
}

showExportDialog(uiData?: { text?: string; exportFormats?: string[] }): void {
  // ... 创建弹窗代码 ...
  
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = `${CSS_CLASS_PREFIX}-dialog-overlay`;
  overlay.style.zIndex = String(Z_INDEX.DIALOG_OVERLAY);
  
  // 新增：遮罩层阻止鼠标事件传递到页面
  overlay.style.pointerEvents = 'auto';
  
  // 新增：阻止遮罩层上的鼠标事件触发框选
  overlay.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  
  // ... 其余代码 ...
}
```

#### 修改点8：CSS中确保遮罩层阻止交互

**实现位置**: `src/content/content.css`

```css
/* 弹窗遮罩层 */
.tabular-extension-dialog-overlay {
  z-index: 10000 !important;  /* 高于主面板 */
  pointer-events: auto !important;  /* 捕获所有鼠标事件 */
  user-select: none !important;  /* 禁止文本选择 */
}
```

### 方案优势

1. **层级清晰**：通过z-index明确定义各元素的层级关系
2. **易于维护**：所有z-index值集中在constants.ts中管理
3. **不影响功能**：不需要全局禁用文本选择，只是确保层级正确
4. **符合预期**：面板始终在最上层，框选框不会遮挡面板

### 层级关系图

```
┌─────────────────────────────────┐
│  Dialog (z-index: 10001)        │  ← 最高层级
├─────────────────────────────────┤
│  Dialog Overlay (z-index: 10000)│
├─────────────────────────────────┤
│  Panel (z-index: 9999)          │
├─────────────────────────────────┤
│  Selection Box (z-index: 9998)  │  ← 最低层级
├─────────────────────────────────┤
│  Page Content (z-index: auto)   │
└─────────────────────────────────┘
```

### 测试验证

**单元测试** (`tests/unit/content/selection.test.ts`):
```typescript
describe('框选框z-index层级', () => {
  it('应该使用正确的z-index', () => {
    const selection = new Selection();
    selection.start(100, 100);
    
    const box = document.querySelector('.tabular-extension-selection-box') as HTMLElement;
    expect(box).toBeTruthy();
    expect(box.style.zIndex).toBe('9998');
  });
  
  it('应该在clear时移除框选框', () => {
    const selection = new Selection();
    selection.start(100, 100);
    
    let box = document.querySelector('.tabular-extension-selection-box');
    expect(box).toBeTruthy();
    
    selection.clear();
    
    box = document.querySelector('.tabular-extension-selection-box');
    expect(box).toBeNull();
  });
});
```

**集成测试** (`tests/integration/panel-z-index.test.ts`):
```typescript
test('面板应该在框选框之上', async ({ page }) => {
  // 框选文本
  await page.mouse.move(100, 100);
  await page.mouse.down();
  await page.mouse.move(200, 200);
  await page.mouse.up();
  
  // 等待面板显示
  await page.waitForSelector('.tabular-extension-panel');
  
  // 获取z-index值
  const panelZIndex = await page.$eval('.tabular-extension-panel', 
    el => window.getComputedStyle(el).zIndex
  );
  
  // 验证面板z-index为9999
  expect(panelZIndex).toBe('9999');
  
  // 验证框选框已被清除（不存在）
  const selectionBox = await page.$('.tabular-extension-selection-box');
  expect(selectionBox).toBeNull();
});

test('弹窗应该在面板之上', async ({ page }) => {
  // 框选文本并显示面板
  await page.mouse.move(100, 100);
  await page.mouse.down();
  await page.mouse.move(200, 200);
  await page.mouse.up();
  
  await page.waitForSelector('.tabular-extension-panel');
  
  // 点击高级清洗按钮
  await page.click('.tabular-extension-panel-advanced-clean-btn');
  
  // 等待弹窗显示
  await page.waitForSelector('.tabular-extension-dialog');
  
  // 获取z-index值
  const dialogOverlayZIndex = await page.$eval('.tabular-extension-dialog-overlay', 
    el => window.getComputedStyle(el).zIndex
  );
  const dialogZIndex = await page.$eval('.tabular-extension-dialog', 
    el => window.getComputedStyle(el).zIndex
  );
  
  // 验证层级关系
  expect(dialogOverlayZIndex).toBe('10000');
  expect(dialogZIndex).toBe('10001');
});

test('面板显示时不应该有框选框', async ({ page }) => {
  // 框选文本
  await page.mouse.move(100, 100);
  await page.mouse.down();
  await page.mouse.move(200, 200);
  await page.mouse.up();
  
  // 等待面板显示
  await page.waitForSelector('.tabular-extension-panel');
  
  // 验证框选框不存在
  const selectionBox = await page.$('.tabular-extension-selection-box');
  expect(selectionBox).toBeNull();
  
  // 尝试在面板上框选（应该不会创建新的框选框）
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.move(400, 400);
  await page.mouse.up();
  
  // 再次验证框选框不存在
  const selectionBox2 = await page.$('.tabular-extension-selection-box');
  expect(selectionBox2).toBeNull();
});

test('遮罩层显示时应该禁用框选', async ({ page }) => {
  // 框选文本并显示面板
  await page.mouse.move(100, 100);
  await page.mouse.down();
  await page.mouse.move(200, 200);
  await page.mouse.up();
  
  await page.waitForSelector('.tabular-extension-panel');
  
  // 点击高级清洗按钮显示遮罩层
  await page.click('.tabular-extension-panel-advanced-clean-btn');
  
  // 等待遮罩层显示
  await page.waitForSelector('.tabular-extension-dialog-overlay');
  
  // 尝试在遮罩层上框选
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.move(400, 400);
  await page.mouse.up();
  
  // 验证没有创建框选框
  const selectionBox = await page.$('.tabular-extension-selection-box');
  expect(selectionBox).toBeNull();
});
```



## 需求7：文本预览面板按钮状态管理

### 问题分析

当前实现中，即使文本预览面板中没有内容（空字符串），功能按钮（复制、高级清洗、导出）仍然可以点击，这会导致：
1. 用户点击后执行无意义的操作
2. 可能触发错误或异常
3. 用户体验不佳

### 设计方案

#### 方案：在showResult中检查文本内容并禁用按钮

**实现位置**: `src/content/panel.ts`

**修改 showResult 方法**:

```typescript
showResult(uiData?: { 
  text?: string; 
  table?: string[][]; 
  csv?: string;
  rowLimit?: number;
  totalRows?: number;
  isLimited?: boolean;
  limitMessage?: string;
  trialRemaining?: number;
}, panelPosition: PanelPosition = 'center'): void {
  // ... 现有逻辑 ...
  
  // 检查是否有有效内容
  const hasContent = !!(uiData?.text && uiData.text.trim().length > 0);
  
  // 按钮容器
  const btnWrapper = document.createElement('div');
  btnWrapper.className = `${CSS_CLASS_PREFIX}-panel-copy-wrapper`;

  // 复制按钮
  const copyBtn = document.createElement('button');
  copyBtn.className = `${CSS_CLASS_PREFIX}-panel-copy-btn`;
  copyBtn.textContent = '📋 复制';
  copyBtn.disabled = !hasContent;  // 新增：无内容时禁用
  if (!hasContent) {
    copyBtn.style.opacity = '0.5';
    copyBtn.style.cursor = 'not-allowed';
  }
  copyBtn.onclick = () => {
    if (!hasContent) return;  // 新增：无内容时不响应
    if (this.onActionRequest) {
      this.onActionRequest('copy', { text: uiData?.text || '' });
    }
  };
  btnWrapper.appendChild(copyBtn);

  // 高级清洗按钮
  const advancedCleanBtn = this.createAdvancedCleanButton(uiData?.trialRemaining, hasContent);
  btnWrapper.appendChild(advancedCleanBtn);

  // 导出按钮
  const exportBtn = this.createExportButton(uiData?.trialRemaining, hasContent);
  btnWrapper.appendChild(exportBtn);

  // ... 其余代码 ...
}
```

**修改按钮创建方法**:

```typescript
private createAdvancedCleanButton(trialRemaining?: number, hasContent: boolean = true): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `${CSS_CLASS_PREFIX}-panel-advanced-clean-btn`;
  
  // 基础文本
  let buttonText = '🧹 清洗';
  
  // 如果有试用次数信息，显示在按钮上
  if (trialRemaining !== undefined) {
    buttonText += ` (剩余 ${trialRemaining} 次)`;
  }
  
  btn.textContent = buttonText;
  
  // 新增：检查是否应该禁用按钮
  const shouldDisable = !hasContent || (trialRemaining !== undefined && trialRemaining === 0);
  btn.disabled = shouldDisable;
  
  if (shouldDisable) {
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  }
  
  btn.onclick = () => {
    if (shouldDisable) return;  // 禁用时不响应
    this.showCleaningDialog();
  };
  
  return btn;
}

private createExportButton(trialRemaining?: number, hasContent: boolean = true): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `${CSS_CLASS_PREFIX}-panel-export-btn`;
  
  // 基础文本
  let buttonText = '📤 导出';
  
  // 如果有试用次数信息，显示在按钮上
  if (trialRemaining !== undefined) {
    buttonText += ` (剩余 ${trialRemaining} 次)`;
  }
  
  btn.textContent = buttonText;
  
  // 新增：检查是否应该禁用按钮
  const shouldDisable = !hasContent || (trialRemaining !== undefined && trialRemaining === 0);
  btn.disabled = shouldDisable;
  
  if (shouldDisable) {
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  }
  
  btn.onclick = () => {
    if (shouldDisable) return;  // 禁用时不响应
    this.showExportDialog();
  };
  
  return btn;
}
```

### 测试验证

**单元测试** (`tests/unit/content/panel.test.ts`):
```typescript
describe('文本预览面板按钮状态', () => {
  it('应该在无内容时禁用所有按钮', () => {
    const panel = new Panel();
    
    // 显示空内容的面板
    panel.showResult({ text: '' });
    
    // 验证按钮被禁用
    const copyBtn = document.querySelector('.tabular-extension-panel-copy-btn') as HTMLButtonElement;
    const cleanBtn = document.querySelector('.tabular-extension-panel-advanced-clean-btn') as HTMLButtonElement;
    const exportBtn = document.querySelector('.tabular-extension-panel-export-btn') as HTMLButtonElement;
    
    expect(copyBtn.disabled).toBe(true);
    expect(cleanBtn.disabled).toBe(true);
    expect(exportBtn.disabled).toBe(true);
  });
  
  it('应该在有内容时启用所有按钮', () => {
    const panel = new Panel();
    
    // 显示有内容的面板
    panel.showResult({ text: 'Some content' });
    
    // 验证按钮被启用
    const copyBtn = document.querySelector('.tabular-extension-panel-copy-btn') as HTMLButtonElement;
    const cleanBtn = document.querySelector('.tabular-extension-panel-advanced-clean-btn') as HTMLButtonElement;
    const exportBtn = document.querySelector('.tabular-extension-panel-export-btn') as HTMLButtonElement;
    
    expect(copyBtn.disabled).toBe(false);
    expect(cleanBtn.disabled).toBe(false);
    expect(exportBtn.disabled).toBe(false);
  });
  
  it('应该在内容仅为空格时禁用按钮', () => {
    const panel = new Panel();
    
    // 显示仅包含空格的面板
    panel.showResult({ text: '   ' });
    
    // 验证按钮被禁用
    const copyBtn = document.querySelector('.tabular-extension-panel-copy-btn') as HTMLButtonElement;
    expect(copyBtn.disabled).toBe(true);
  });
});
```

**集成测试** (`tests/integration/panel-button-state.test.ts`):
```typescript
test('空内容时按钮应该被禁用', async ({ page }) => {
  // 创建一个返回空内容的测试场景
  await page.setContent('<div>Test</div>');
  
  // 模拟框选但返回空内容
  // ... 设置mock返回空字符串 ...
  
  // 等待面板显示
  await page.waitForSelector('.tabular-extension-panel');
  
  // 验证按钮被禁用
  const copyBtn = await page.$('.tabular-extension-panel-copy-btn');
  const isDisabled = await copyBtn?.evaluate(el => (el as HTMLButtonElement).disabled);
  expect(isDisabled).toBe(true);
  
  // 验证按钮样式
  const opacity = await copyBtn?.evaluate(el => window.getComputedStyle(el).opacity);
  expect(opacity).toBe('0.5');
});

test('有内容时按钮应该可用', async ({ page }) => {
  // 框选文本
  await page.setContent('<div>Some text content</div>');
  
  await page.mouse.move(100, 100);
  await page.mouse.down();
  await page.mouse.move(200, 200);
  await page.mouse.up();
  
  // 等待面板显示
  await page.waitForSelector('.tabular-extension-panel');
  
  // 验证按钮可用
  const copyBtn = await page.$('.tabular-extension-panel-copy-btn');
  const isDisabled = await copyBtn?.evaluate(el => (el as HTMLButtonElement).disabled);
  expect(isDisabled).toBe(false);
});
```



## 需求4：Pro功能用尽后计数显示修复

### 问题分析

当免费用户的Pro功能试用次数用尽后，面板上的计数显示不正确，可能的问题：
1. 计数没有实时更新
2. 计数显示逻辑有误
3. Background返回的数据不正确

### 设计方案

#### 问题定位

需要检查以下流程：
1. Background层：`handleAdvancedClean` 是否正确返回 `trialRemaining`
2. Content层：Panel是否正确显示 `trialRemaining`
3. 试用次数消耗后是否触发UI更新

#### 修改点1：确保Background返回正确的计数

**实现位置**: `src/background/index.ts`

在 `handleAdvancedClean` 中，确保返回最新的试用次数：

```typescript
async function handleAdvancedClean(data: unknown): Promise<ActionResultMessage['payload']> {
  // ... 现有逻辑 ...
  
  // 只在成功后消耗试用次数（Free 用户）
  if (!isPro) {
    await evolveTrial('advanced-cleaning');
    
    // 新增：获取消耗后的最新试用次数
    const updatedTrialState = await checkTrial('advanced-cleaning');
    
    result.uiData = {
      ...result.uiData,
      trialRemaining: updatedTrialState.remaining  // 返回最新的剩余次数
    };
  }
  
  return result;
}
```

类似地，在 `handleTableExport` 中也需要返回最新计数：

```typescript
async function handleTableExport(data: unknown): Promise<ActionResultMessage['payload']> {
  // ... 现有逻辑 ...
  
  // 只在成功后消耗试用次数（Free 用户）
  if (!isPro) {
    await evolveTrial('one-click-export');
    
    // 新增：获取消耗后的最新试用次数
    const updatedTrialState = await checkTrial('one-click-export');
    
    resolve({
      status: 'ok',
      uiAction: 'SHOW_RESULT_PANEL',
      uiData: {
        message: '导出成功！文件已保存到下载文件夹。',
        trialRemaining: updatedTrialState.remaining  // 返回最新的剩余次数
      }
    });
  }
  
  // ... 其余代码 ...
}
```

#### 修改点2：在Panel中显示试用次数

**实现位置**: `src/content/panel.ts`

在 `showResult` 方法中，如果有 `trialRemaining`，显示在面板上：

```typescript
showResult(uiData?: { 
  text?: string; 
  table?: string[][]; 
  csv?: string;
  rowLimit?: number;
  totalRows?: number;
  isLimited?: boolean;
  limitMessage?: string;
  trialRemaining?: number;  // 剩余试用次数
}, panelPosition: PanelPosition = 'center'): void {
  // ... 现有逻辑 ...
  
  // 按钮容器
  const btnWrapper = document.createElement('div');
  btnWrapper.className = `${CSS_CLASS_PREFIX}-panel-copy-wrapper`;

  // 高级清洗按钮
  const advancedCleanBtn = this.createAdvancedCleanButton(uiData?.trialRemaining);
  btnWrapper.appendChild(advancedCleanBtn);

  // 导出按钮
  const exportBtn = this.createExportButton(uiData?.trialRemaining);
  btnWrapper.appendChild(exportBtn);

  // ... 其余代码 ...
}
```

修改按钮创建方法，显示剩余次数：

```typescript
private createAdvancedCleanButton(trialRemaining?: number): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `${CSS_CLASS_PREFIX}-panel-advanced-clean-btn`;
  
  // 基础文本
  let buttonText = '🧹 清洗';
  
  // 如果有试用次数信息，显示在按钮上
  if (trialRemaining !== undefined) {
    buttonText += ` (剩余 ${trialRemaining} 次)`;
    
    // 如果次数为0，禁用按钮
    if (trialRemaining === 0) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    }
  }
  
  btn.textContent = buttonText;
  btn.onclick = () => {
    if (trialRemaining === 0) {
      return;  // 次数用尽，不响应点击
    }
    this.showCleaningDialog();
  };
  
  return btn;
}

private createExportButton(trialRemaining?: number): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `${CSS_CLASS_PREFIX}-panel-export-btn`;
  
  // 基础文本
  let buttonText = '📤 导出';
  
  // 如果有试用次数信息，显示在按钮上
  if (trialRemaining !== undefined) {
    buttonText += ` (剩余 ${trialRemaining} 次)`;
    
    // 如果次数为0，禁用按钮
    if (trialRemaining === 0) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    }
  }
  
  btn.textContent = buttonText;
  btn.onclick = () => {
    if (trialRemaining === 0) {
      return;  // 次数用尽，不响应点击
    }
    this.showExportDialog();
  };
  
  return btn;
}
```

#### 修改点3：在试用次数用尽时显示正确信息

确保 `showTrialExhausted` 方法正确显示剩余次数（应该是0）：

```typescript
showTrialExhausted(uiData?: { message?: string; trialRemaining?: number }): void {
  this.hide();
  
  // 禁用页面文本选择
  this.disableTextSelection();
  
  // 创建面板
  this.element = document.createElement('div');
  this.element.className = `${CSS_CLASS_PREFIX}-panel ${CSS_CLASS_PREFIX}-panel-force-center`;
  
  // 标题栏
  const header = this.createHeader('🔒', '试用次数已用完');
  
  // 消息内容
  const messageWrapper = document.createElement('div');
  messageWrapper.className = `${CSS_CLASS_PREFIX}-panel-message-wrapper`;

  const message = document.createElement('div');
  message.className = `${CSS_CLASS_PREFIX}-panel-message`;
  message.style.whiteSpace = 'pre-line';
  
  // 新增：显示剩余次数（应该是0）
  let messageText = uiData?.message || '试用次数已用完，升级 Pro 解锁无限使用';
  if (uiData?.trialRemaining !== undefined) {
    messageText = `剩余试用次数：${uiData.trialRemaining}\n\n${messageText}`;
  }
  
  message.textContent = messageText;

  messageWrapper.appendChild(message);

  // 组装面板
  this.element.appendChild(header);
  this.element.appendChild(messageWrapper);

  document.body.appendChild(this.element);
  this.bindDragEvents(header);
  
  // 绑定ESC键监听
  document.addEventListener('keydown', this.handleKeyDown);
}
```

### 测试验证

**单元测试** (`tests/unit/background/advanced-clean-integration.test.ts`):
```typescript
describe('Pro功能计数显示', () => {
  it('应该在消耗试用次数后返回最新计数', async () => {
    // 设置初始试用次数为1
    await chrome.storage.local.set({
      'trial_advanced-cleaning': { remaining: 1, lastReset: Date.now() }
    });
    
    // 执行高级清洗
    const result = await handleAdvancedClean({
      text: 'test',
      cleaningRules: { mergeToSingleLine: false, removeDuplicates: false },
      operation: 'copy'
    });
    
    // 验证返回的剩余次数为0
    expect(result.uiData?.trialRemaining).toBe(0);
  });
  
  it('应该在试用次数为0时返回blocked状态', async () => {
    // 设置试用次数为0
    await chrome.storage.local.set({
      'trial_advanced-cleaning': { remaining: 0, lastReset: Date.now() }
    });
    
    // 执行高级清洗
    const result = await handleAdvancedClean({
      text: 'test',
      cleaningRules: { mergeToSingleLine: false, removeDuplicates: false },
      operation: 'copy'
    });
    
    // 验证返回blocked状态
    expect(result.status).toBe('blocked');
    expect(result.uiAction).toBe('SHOW_TRIAL_EXHAUSTED');
    expect(result.uiData?.trialRemaining).toBe(0);
  });
});
```

**集成测试** (`tests/integration/pro-trial-counter.test.ts`):
```typescript
test('Pro功能用尽后应该显示正确计数', async ({ page, extensionId }) => {
  // 设置试用次数为1
  await page.evaluate(() => {
    chrome.storage.local.set({
      'trial_advanced-cleaning': { remaining: 1, lastReset: Date.now() }
    });
  });
  
  // 框选文本
  await page.mouse.move(100, 100);
  await page.mouse.down();
  await page.mouse.move(200, 200);
  await page.mouse.up();
  
  // 等待面板显示
  await page.waitForSelector('.tabular-extension-panel');
  
  // 点击高级清洗按钮
  await page.click('.tabular-extension-panel-advanced-clean-btn');
  
  // 等待清洗对话框
  await page.waitForSelector('.tabular-extension-dialog');
  
  // 点击应用清洗
  await page.click('.tabular-extension-dialog-btn-confirm');
  
  // 等待结果面板更新
  await page.waitForTimeout(500);
  
  // 验证按钮显示"剩余 0 次"
  const buttonText = await page.textContent('.tabular-extension-panel-advanced-clean-btn');
  expect(buttonText).toContain('剩余 0 次');
  
  // 验证按钮被禁用
  const isDisabled = await page.isDisabled('.tabular-extension-panel-advanced-clean-btn');
  expect(isDisabled).toBe(true);
});
```



## 需求5：修复表格识别流程

### 问题分析

当前实现中，点击表格识别按钮后，会显示【文本预览】面板，而不是直接显示【选择导出格式】面板。这导致用户需要多一步操作才能导出表格。

**期望流程**:
1. 用户点击表格导出按钮
2. 直接显示【选择导出格式】面板
3. 用户选择格式后直接导出

**当前流程**:
1. 用户点击表格导出按钮
2. 显示【文本预览】面板
3. 用户点击"导出"按钮
4. 显示【选择导出格式】面板
5. 用户选择格式后导出

### 设计方案

#### 方案1：修改Background返回的uiAction（推荐）

**实现位置**: `src/background/index.ts`

修改 `handleTableExport` 函数，直接返回 `SHOW_EXPORT_DIALOG`：

```typescript
async function handleTableExport(data: unknown): Promise<ActionResultMessage['payload']> {
  try {
    const payload = data as {
      text?: string;
      format?: string;
      table?: string[][];
      exportFormat?: 'csv' | 'excel';
      cleaningRules?: CleaningRules;
    };
    
    // 检查是否为 Pro 用户
    const isPro = await allow('table-detect');
    
    // 如果不是 Pro 用户，检查试用次数
    if (!isPro) {
      const authorized = await authorize('one-click-export');
      
      if (!authorized) {
        const trialState = await checkTrial('one-click-export');
        return {
          status: 'blocked',
          uiAction: 'SHOW_TRIAL_EXHAUSTED',
          uiData: {
            message: generateUpgradePrompt('one-click-export', trialState.remaining),
            trialRemaining: trialState.remaining
          }
        };
      }
    }
    
    // 解析表格数据
    let tableData: string[][];
    if (payload.table && Array.isArray(payload.table)) {
      tableData = payload.table;
    } else if (payload.text) {
      tableData = parseTextToTable(payload.text);
    } else {
      return {
        status: 'blocked',
        uiAction: 'SHOW_RESULT_PANEL',
        uiData: {
          message: '导出失败：未提供有效的数据'
        }
      };
    }
    
    // 新增：如果没有指定格式，返回 SHOW_EXPORT_DIALOG 让用户选择
    if (!payload.format && !payload.exportFormat) {
      return {
        status: 'ok',
        uiAction: 'SHOW_EXPORT_DIALOG',  // 修改：直接显示导出对话框
        data: tableData,
        uiData: {
          text: tableData.map(row => row.join('\t')).join('\n'),  // 提供文本格式供导出使用
          exportFormats: ['csv', 'excel']  // 可用的导出格式
        }
      };
    }
    
    // 如果已经指定了格式，直接导出
    const format: ExportFormat = (payload.format || payload.exportFormat || 'csv') as ExportFormat;
    
    // ... 现有的导出逻辑 ...
  } catch (error) {
    // ... 错误处理 ...
  }
}
```

#### 方案2：修改Content层的调用方式（备选）

**实现位置**: `src/content/index.ts`

修改表格导出按钮的点击回调，不传递 `exportFormat`：

```typescript
private scanAndInjectTableButtons(): void {
  // ... 现有逻辑 ...
  
  injectExportButton(table, async () => {
    try {
      // 提取表格数据
      const tableData = table.data;
      
      // 发送表格导出请求到 background
      // 修改：不传递 exportFormat，让 Background 返回 SHOW_EXPORT_DIALOG
      const result = await this.requestAction('table-export', {
        table: tableData
        // 移除：exportFormat: 'csv'
      });
      
      // 执行 UI 动作
      this.executeUIAction(result);
    } catch (error) {
      console.error('[Tabular] Table export failed:', error);
    }
  });
  
  // ... 其余逻辑 ...
}
```

### 推荐方案

**采用方案1 + 方案2组合**：
1. Content层不传递 `exportFormat`（方案2）
2. Background层检测到没有格式时返回 `SHOW_EXPORT_DIALOG`（方案1）
3. 用户在导出对话框选择格式后，Content层再次调用 `table-export` 并传递格式

这样可以保持架构清晰：
- Content层负责UI交互
- Background层负责业务逻辑和决策
- 通过uiAction控制UI流程

### 测试验证

**集成测试** (`tests/integration/table-export-flow.test.ts`):
```typescript
test('点击表格导出按钮应该直接显示导出格式选择', async ({ page }) => {
  // 加载包含表格的页面
  await page.goto('http://localhost:3000/table-page.html');
  
  // 等待表格导出按钮出现
  await page.waitForSelector('.table-export-button');
  
  // 点击表格导出按钮
  await page.click('.table-export-button');
  
  // 验证直接显示导出对话框（而不是预览面板）
  await page.waitForSelector('.tabular-extension-dialog');
  
  // 验证对话框标题是"选择导出格式"
  const title = await page.textContent('.tabular-extension-dialog-title');
  expect(title).toBe('选择导出格式');
  
  // 验证有CSV和Excel选项
  const csvBtn = await page.$('.tabular-extension-dialog-format-btn:has-text("CSV")');
  const excelBtn = await page.$('.tabular-extension-dialog-format-btn:has-text("Excel")');
  expect(csvBtn).toBeTruthy();
  expect(excelBtn).toBeTruthy();
});

test('选择导出格式后应该直接导出', async ({ page }) => {
  // 加载包含表格的页面
  await page.goto('http://localhost:3000/table-page.html');
  
  // 点击表格导出按钮
  await page.click('.table-export-button');
  
  // 等待导出对话框
  await page.waitForSelector('.tabular-extension-dialog');
  
  // 监听下载事件
  const downloadPromise = page.waitForEvent('download');
  
  // 点击CSV格式
  await page.click('.tabular-extension-dialog-format-btn:has-text("CSV")');
  
  // 验证触发了下载
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/export_.*\.csv/);
});
```

## 需求6：修复Excel导出格式

### 问题分析

当前导出的Excel文件只有一列，所有数据都挤在第一列中。问题可能出在：
1. 表格数据的解析不正确
2. CSV转换逻辑有误
3. Excel格式生成有问题

### 设计方案

#### 问题定位

检查以下流程：
1. `detector.ts` 的 `detectHTMLTable` 是否正确提取了多列数据
2. `exporter.ts` 的 `toCSV` 是否正确处理了多列数据
3. `exporter.ts` 的 `toExcel` 是否使用了正确的格式

#### 修改点1：确保表格数据正确提取

**实现位置**: `src/content/detector.ts`

检查 `detectHTMLTable` 函数，确保正确处理多列：

```typescript
export function detectHTMLTable(
  element: HTMLTableElement,
  config: TableDetectionConfig = DEFAULT_CONFIG
): TableInfo | null {
  try {
    // ... 现有逻辑 ...
    
    for (const row of rows) {
      const cells = row.querySelectorAll('td, th');
      let rowData: string[] = [];
      
      // 确保每个单元格都被正确提取
      for (const cell of cells) {
        const text = extractCellText(cell);
        rowData.push(text);  // 每个单元格作为独立的列
      }
      
      data.push(rowData);
      maxCols = Math.max(maxCols, rowData.length);
    }
    
    // 验证：打印表格数据结构
    console.log('[TableDetector] Extracted table data:', {
      rows: data.length,
      cols: maxCols,
      sample: data.slice(0, 2)  // 打印前两行作为样本
    });
    
    // ... 其余逻辑 ...
  }
}
```

#### 修改点2：确保CSV转换正确处理多列

**实现位置**: `src/background/exporter.ts`

检查 `toCSV` 函数，确保正确处理多列：

```typescript
export function toCSV(data: string[][]): string {
  // 添加数据验证
  if (!data || !Array.isArray(data)) {
    console.error('Invalid data: data is not an array');
    throw new Error('数据格式无效：必须是数组');
  }
  
  if (data.length === 0) {
    return '';
  }
  
  // 验证：打印数据结构
  console.log('[Exporter] Converting to CSV:', {
    rows: data.length,
    cols: data[0]?.length || 0,
    sample: data.slice(0, 2)
  });
  
  return data.map(row => {
    // 验证每行也是数组
    if (!Array.isArray(row)) {
      console.warn('Invalid row: not an array', row);
      throw new Error('数据格式无效：每行必须是数组');
    }
    
    // 确保每个单元格都被处理
    return row.map(field => {
      const fieldStr = String(field);
      
      // 检查是否需要引号包裹
      const needsQuotes = 
        fieldStr.includes(',') || 
        fieldStr.includes('"') || 
        fieldStr.includes('\n') ||
        fieldStr.includes('\r');
      
      if (needsQuotes) {
        const escaped = fieldStr.replace(/"/g, '""');
        return `"${escaped}"`;
      }
      
      return fieldStr;
    }).join(',');  // 使用逗号分隔列
  }).join('\r\n') + '\r\n';
}
```

#### 修改点3：改进Excel导出实现

**实现位置**: `src/background/exporter.ts`

当前 `toExcel` 函数使用CSV格式作为简化实现，这可能导致Excel打开时只显示一列。需要改进：

```typescript
export function toExcel(data: string[][]): Blob {
  // 方案1：使用制表符分隔（Excel会自动识别为多列）
  const tsvContent = data.map(row => {
    return row.map(field => {
      const fieldStr = String(field);
      // 转义制表符和换行符
      return fieldStr.replace(/\t/g, ' ').replace(/\n/g, ' ');
    }).join('\t');  // 使用制表符分隔
  }).join('\r\n') + '\r\n';
  
  // 使用 Excel 兼容的 MIME 类型
  return new Blob([tsvContent], { 
    type: 'application/vnd.ms-excel;charset=utf-8;' 
  });
}
```

**更好的方案**：使用真正的Excel格式（需要引入库）

如果上述方案仍然不够，可以考虑引入 `xlsx` 库：

```typescript
import * as XLSX from 'xlsx';

export function toExcel(data: string[][]): Blob {
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  
  // 生成Excel文件
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  return new Blob([wbout], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}
```

**注意**: 引入 `xlsx` 库会增加包体积，需要权衡。建议先尝试制表符分隔方案。

### 测试验证

**单元测试** (`tests/unit/background/exporter.test.ts`):
```typescript
describe('Excel导出多列', () => {
  it('应该正确导出多列数据', () => {
    const data = [
      ['Name', 'Age', 'City'],
      ['Alice', '25', 'Beijing'],
      ['Bob', '30', 'Shanghai']
    ];
    
    const blob = toExcel(data);
    
    // 验证Blob类型
    expect(blob.type).toContain('excel');
    
    // 读取Blob内容
    return blob.text().then(content => {
      // 验证包含制表符（多列分隔）
      expect(content).toContain('\t');
      
      // 验证每行有3列
      const lines = content.split('\r\n').filter(line => line.length > 0);
      expect(lines.length).toBe(3);
      
      lines.forEach(line => {
        const cols = line.split('\t');
        expect(cols.length).toBe(3);
      });
    });
  });
  
  it('应该正确处理包含特殊字符的单元格', () => {
    const data = [
      ['Name', 'Description'],
      ['Product A', 'Contains\ttab'],
      ['Product B', 'Contains\nnewline']
    ];
    
    const blob = toExcel(data);
    
    return blob.text().then(content => {
      // 验证特殊字符被正确转义
      expect(content).not.toContain('\t\t');  // 制表符应该被替换
      const lines = content.split('\r\n');
      expect(lines[1]).toContain('Contains tab');  // 制表符被替换为空格
      expect(lines[2]).toContain('Contains newline');  // 换行符被替换为空格
    });
  });
});
```

**集成测试** (`tests/integration/excel-export.test.ts`):
```typescript
test('Excel导出应该包含多列', async ({ page }) => {
  // 创建包含多列表格的测试页面
  await page.setContent(`
    <table>
      <tr><th>Name</th><th>Age</th><th>City</th></tr>
      <tr><td>Alice</td><td>25</td><td>Beijing</td></tr>
      <tr><td>Bob</td><td>30</td><td>Shanghai</td></tr>
    </table>
  `);
  
  // 等待表格导出按钮
  await page.waitForSelector('.table-export-button');
  
  // 点击导出按钮
  await page.click('.table-export-button');
  
  // 等待导出对话框
  await page.waitForSelector('.tabular-extension-dialog');
  
  // 监听下载事件
  const downloadPromise = page.waitForEvent('download');
  
  // 选择Excel格式
  await page.click('.tabular-extension-dialog-format-btn:has-text("Excel")');
  
  // 等待下载完成
  const download = await downloadPromise;
  const path = await download.path();
  
  // 读取下载的文件
  const fs = require('fs');
  const content = fs.readFileSync(path, 'utf-8');
  
  // 验证包含制表符（多列分隔）
  expect(content).toContain('\t');
  
  // 验证每行有3列
  const lines = content.split('\r\n').filter((line: string) => line.length > 0);
  expect(lines.length).toBe(3);
  
  lines.forEach((line: string) => {
    const cols = line.split('\t');
    expect(cols.length).toBe(3);
  });
});
```

## 总结

本设计文档提供了7个关键Bug的详细修复方案：

1. **插件关闭状态下禁用表格检测** - 在Content层检查settings.enabled
2. **重构高级清洗功能** - 移除重复选项，优化逻辑
3. **修复面板框选问题** - 基于z-index层级管理，遮罩层阻止框选
4. **Pro功能用尽后计数显示修复** - 返回最新试用次数并在UI显示
5. **修复表格识别流程** - 直接显示导出格式选择对话框
6. **修复Excel导出格式** - 使用制表符分隔多列数据
7. **文本预览面板按钮状态管理** - 无内容时禁用功能按钮

所有方案都严格遵守三层架构原则，确保代码质量和可维护性。

