# 设计文档

## 概述

本设计文档针对Chrome插件的6个UI/UX改进需求提供技术实现方案。这些改进涵盖功能修复（自定义分隔符、导出错误）、视觉优化（深色主题适配）、功能优化（消除重复）和交互改进（面板行为、ESC关闭、导出UI）。

所有改进严格遵循三层架构规范：
- **Background层**：处理业务逻辑、生成文案、决定UI行为
- **Content层**：纯UI渲染，无业务判断
- **Shared层**：类型定义和协议

## 架构

### 模块划分

1. **cleaner.ts (Background)**
   - 修复自定义分隔符逻辑
   - 优化"合并多行"和"合并为一行"的语义

2. **panel.ts (Content)**
   - 添加ESC键监听
   - 禁用页面文本框选
   - 修改导出面板UI（移除取消按钮，添加关闭×按钮）

3. **content.css (Content)**
   - 深色主题文字颜色适配
   - 导出面板关闭按钮样式

4. **exporter.ts (Background)**
   - 修复导出错误处理
   - 添加数据验证

5. **types.ts (Shared)**
   - 无需修改（现有协议已足够）

### 依赖关系

```
Background (cleaner, exporter)
    ↓ (消息协议)
Content (panel, selection)
    ↓ (样式)
content.css
```

## 组件和接口

### 1. 自定义分隔符修复 (cleaner.ts)

**问题分析**：
当前代码中，`mergeMultipleLines` 选项只有在同时提供 `customSeparator` 时才生效。但用户可能期望：
- 勾选"合并多行" + 提供自定义分隔符 → 使用自定义分隔符
- 勾选"合并多行" + 未提供自定义分隔符 → 使用默认分隔符（换行符）

**修复方案**：
```typescript
// 修改前
if (rules.mergeMultipleLines && rules.customSeparator !== undefined) {
  result = [result.join(rules.customSeparator)];
}

// 修改后
if (rules.mergeMultipleLines) {
  const separator = rules.customSeparator !== undefined && rules.customSeparator !== '' 
    ? rules.customSeparator 
    : '\n';
  result = [result.join(separator)];
}
```

### 2. 功能重复性优化 (cleaner.ts)

**问题分析**：
- "合并多行"：使用分隔符连接所有行
- "合并为一行"：使用空格连接所有行

这两个功能确实存在语义重叠。

**优化方案**：
保留两个选项，但明确语义：
- "合并多行"：保留原有结构，使用自定义分隔符（默认换行符）
- "合并为一行"：强制单行，使用空格分隔

互斥逻辑：当"合并为一行"启用时，忽略"合并多行"。

### 3. 深色主题适配 (content.css)

**问题分析**：
高级清洗弹窗中的选项文字在深色主题下颜色为黑色，对比度不足。

**修复方案**：
```css
/* 确保弹窗规则选项文字使用主题变量 */
.tabular-extension-dialog-rule-item {
  color: var(--bsc-text) !important;
}

.tabular-extension-dialog-separator-item label {
  color: var(--bsc-text) !important;
}
```

### 4. 面板交互改进 (panel.ts)

#### 4.1 禁用页面文本框选

**实现方案**：
在面板显示时，添加全局样式禁用文本选择：

```typescript
// Panel类添加方法
private disableTextSelection(): void {
  const style = document.createElement('style');
  style.id = `${CSS_CLASS_PREFIX}-disable-selection`;
  style.textContent = `
    * {
      user-select: none !important;
      -webkit-user-select: none !important;
    }
  `;
  document.head.appendChild(style);
}

private enableTextSelection(): void {
  const style = document.getElementById(`${CSS_CLASS_PREFIX}-disable-selection`);
  if (style) {
    style.remove();
  }
}
```

在 `showResult()`, `showLimit()`, `showPro()`, `showTrialExhausted()` 中调用 `disableTextSelection()`。
在 `hide()` 中调用 `enableTextSelection()`。

#### 4.2 ESC键关闭面板（支持多层弹窗）

**实现方案**：

需要支持多层弹窗的逐层关闭。当有多个弹窗时（例如：结果面板 + 清洗弹窗 + 导出弹窗），ESC键应该关闭最上层的弹窗。

**方案1：使用全局弹窗栈**
```typescript
// 在content.ts中维护全局弹窗栈
const dialogStack: HTMLElement[] = [];

// Panel类方法
showCleaningDialog(): void {
  // ... 创建弹窗 ...
  dialogStack.push(overlay);
  
  // ESC键监听
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && dialogStack[dialogStack.length - 1] === overlay) {
      overlay.remove();
      dialogStack.pop();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}

// 主面板的ESC监听
private handleKeyDown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && dialogStack.length === 0) {
    this.hide();
  }
};
```

**方案2：使用z-index判断**
```typescript
// 检查当前元素是否是最上层
private isTopmost(): boolean {
  if (!this.element) return false;
  
  const allPanels = document.querySelectorAll(
    `.${CSS_CLASS_PREFIX}-panel, .${CSS_CLASS_PREFIX}-dialog-overlay`
  );
  
  if (allPanels.length === 0) return false;
  
  let maxZIndex = -1;
  let topmostElement: Element | null = null;
  
  allPanels.forEach(panel => {
    const zIndex = parseInt(window.getComputedStyle(panel).zIndex || '0');
    if (zIndex > maxZIndex) {
      maxZIndex = zIndex;
      topmostElement = panel;
    }
  });
  
  return topmostElement === this.element || 
         this.element.contains(topmostElement);
}

private handleKeyDown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && this.isTopmost()) {
    this.hide();
  }
};
```

**推荐方案1**：使用弹窗栈更清晰，易于维护。

### 5. 导出面板UI优化 (panel.ts + content.css)

**修改方案**：

在 `showExportDialog()` 中：
- **保留"取消"按钮**，但调整布局为居右
- **不添加关闭×按钮**

```typescript
showExportDialog(uiData?: { text?: string; exportFormats?: string[] }): void {
  // ... 创建遮罩和弹窗 ...
  
  // 标题（不带关闭按钮）
  const title = document.createElement('div');
  title.className = `${CSS_CLASS_PREFIX}-dialog-title`;
  title.textContent = '选择导出格式';
  
  // ... 格式选项 ...
  
  // 取消按钮（居右布局）
  const btnContainer = document.createElement('div');
  btnContainer.className = `${CSS_CLASS_PREFIX}-dialog-export-buttons`;
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = `${CSS_CLASS_PREFIX}-dialog-btn-cancel`;
  cancelBtn.textContent = '取消';
  cancelBtn.onclick = () => {
    overlay.remove();
  };
  
  btnContainer.appendChild(cancelBtn);
  
  // 组装弹窗
  dialog.appendChild(title);
  dialog.appendChild(formatsContainer);
  dialog.appendChild(btnContainer);
}
```

CSS样式：
```css
/* 导出弹窗按钮容器 - 居右布局 */
.tabular-extension-dialog-export-buttons {
  display: flex !important;
  justify-content: flex-end !important;
  margin-top: 20px !important;
}

.tabular-extension-dialog-export-buttons .tabular-extension-dialog-btn-cancel {
  padding: 10px 24px !important;
  min-width: 80px !important;
}
```

### 6. 导出功能错误修复及文件下载 (exporter.ts + background/index.ts)

**问题分析**：
1. 错误信息 "Cannot read properties of undefined (reading 'length')" 表明传入的数据为 `undefined`
2. 当前实现只返回Blob，没有触发浏览器下载

**修复方案**：

#### 6.1 数据验证和错误处理

```typescript
export function toCSV(data: string[][]): string {
  try {
    // 添加数据验证
    if (!data || !Array.isArray(data)) {
      console.error('Invalid data: data is not an array');
      return '';
    }
    
    if (data.length === 0) {
      return '';
    }
    
    return data.map(row => {
      // 验证每行也是数组
      if (!Array.isArray(row)) {
        console.warn('Invalid row: not an array', row);
        return '';
      }
      
      return row.map(field => {
        // ... 现有逻辑 ...
      }).join(',');
    }).join('\r\n') + '\r\n';
  } catch (error) {
    console.error('Error converting to CSV:', error);
    return '';
  }
}

export async function exportData(
  data: string[][],
  options: ExportOptions
): Promise<Blob> {
  try {
    // 添加数据验证
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid or empty data provided for export');
    }
    
    // ... 现有逻辑 ...
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error; // 抛出错误，让调用方处理
  }
}
```

#### 6.2 触发浏览器下载

在Background层添加下载触发逻辑：

```typescript
// background/index.ts 中处理导出请求
async function handleTableExport(data: { text: string; format: ExportFormat }) {
  try {
    // 解析文本为二维数组
    const tableData = parseTextToTable(data.text);
    
    // 生成导出文件
    const blob = await exportData(tableData, { format: data.format });
    
    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const extension = data.format === 'csv' ? 'csv' : 'xls';
    const filename = `export_${timestamp}.${extension}`;
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    
    // 通过chrome.downloads API触发下载
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true  // 显示保存对话框
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError);
        // 返回错误给Content
        return {
          status: 'blocked',
          uiAction: 'SHOW_RESULT_PANEL',
          uiData: {
            message: `导出失败: ${chrome.runtime.lastError.message}`
          }
        };
      }
      
      // 清理URL对象
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      // 返回成功消息
      return {
        status: 'ok',
        uiAction: 'SHOW_RESULT_PANEL',
        uiData: {
          message: '导出成功！文件已保存到下载文件夹。'
        }
      };
    });
  } catch (error) {
    console.error('Export error:', error);
    return {
      status: 'blocked',
      uiAction: 'SHOW_RESULT_PANEL',
      uiData: {
        message: `导出失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    };
  }
}

// 辅助函数：解析文本为表格
function parseTextToTable(text: string): string[][] {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text data');
  }
  
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  return lines.map(line => [line]); // 简单实现，每行作为一个单元格
}
```

#### 6.3 manifest.json权限

确保manifest.json包含下载权限：

```json
{
  "permissions": [
    "downloads"
  ]
}
```

## 数据模型

无需新增数据模型，使用现有类型：
- `CleaningRules` (已存在)
- `ExportOptions` (已存在)
- `ExportFormat` (已存在)

## 正确性属性

属性是一种特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。

### 清洗功能属性

**属性 1：自定义分隔符应用**
*对于任何*文本数组和自定义分隔符，当启用"合并多行"并提供分隔符时，清洗结果应该是使用该分隔符连接的单个字符串
**验证需求：1.1, 1.4**

**属性 2：默认分隔符行为**
*对于任何*文本数组，当启用"合并多行"但未提供自定义分隔符时，清洗结果应该使用换行符连接
**验证需求：1.2**

### 导出功能属性

**属性 3：CSV格式生成**
*对于任何*有效的二维字符串数组，CSV导出应该生成符合RFC 4180标准的格式化字符串
**验证需求：6.1**

**属性 4：Excel格式生成**
*对于任何*有效的二维字符串数组，Excel导出应该生成有效的Blob对象
**验证需求：6.2**

**属性 5：导出错误处理**
*对于任何*无效输入（空数组、undefined、null），导出函数应该抛出明确的错误信息
**验证需求：6.3, 6.4**

**属性 6：文件下载触发**
*对于任何*成功的导出操作，Background应该通过chrome.downloads API触发浏览器下载
**验证需求：6.1, 6.2**

### UI交互示例测试

以下是具体的UI交互场景，适合用示例测试验证：

**示例 1：面板显示时禁用文本选择**
当面板显示时，应该在DOM中添加禁用文本选择的样式标签
**验证需求：4.1**

**示例 2：面板隐藏时恢复文本选择**
当面板隐藏时，应该从DOM中移除禁用文本选择的样式标签
**验证需求：4.3**

**示例 3：ESC键逐层关闭弹窗**
当有多层弹窗时，按ESC键应该关闭最上层的弹窗，而不是关闭所有弹窗
**验证需求：4.2**

**示例 4：导出面板UI结构**
导出弹窗应该包含居右的"取消"按钮，且不包含关闭×按钮
**验证需求：5.1, 5.2, 5.3**

**示例 5：取消按钮行为**
点击导出弹窗的取消按钮应该移除弹窗，且不触发导出操作
**验证需求：5.4, 5.5**



## 错误处理

### 1. 清洗模块错误处理

**场景**：用户提供的自定义分隔符可能包含特殊字符或为空字符串

**策略**：
- 空字符串或undefined → 使用默认分隔符（换行符）
- 特殊字符（\n, \t等）→ 正常处理，不做转义
- 异常情况 → 降级到基础清洗

```typescript
try {
  // 清洗逻辑
} catch (error) {
  console.error('Error applying advanced cleaning rules:', error);
  return basicClean(data);
}
```

### 2. 导出模块错误处理

**场景**：数据为空、undefined、格式错误

**策略**：
- 数据验证：检查是否为有效数组
- 空数据 → 返回空字符串或错误提示Blob
- 异常捕获 → 返回包含错误信息的Blob，不抛出异常

```typescript
if (!data || !Array.isArray(data) || data.length === 0) {
  throw new Error('Invalid or empty data provided for export');
}
```

### 3. UI交互错误处理

**场景**：事件监听器可能在面板销毁后仍被触发

**策略**：
- 在hide()方法中移除所有事件监听器
- 使用箭头函数保持this上下文
- 检查元素存在性再操作

```typescript
hide(): void {
  if (this.element) {
    this.element.remove();
    this.element = null;
  }
  document.removeEventListener('keydown', this.handleKeyDown);
  this.enableTextSelection();
}
```

## 测试策略

### 双重测试方法

本项目采用单元测试和属性测试相结合的方式：

**单元测试**：
- 验证具体示例和边缘情况
- 测试UI交互行为（ESC键、按钮点击）
- 测试DOM结构（面板元素、样式标签）
- 集成点测试（消息协议）

**属性测试**：
- 验证清洗逻辑的通用属性
- 验证导出格式的正确性
- 通过随机输入覆盖大量场景
- 每个属性测试至少100次迭代

### 测试配置

**属性测试库**：使用 `fast-check`（TypeScript的属性测试库）

**测试标签格式**：
```typescript
// Feature: ui-ux-improvements, Property 1: 自定义分隔符应用
test('property: custom separator is applied correctly', () => {
  fc.assert(
    fc.property(
      fc.array(fc.string()),
      fc.string(),
      (textArray, separator) => {
        // 测试逻辑
      }
    ),
    { numRuns: 100 }
  );
});
```

### 测试覆盖范围

**cleaner.ts**：
- 属性测试：自定义分隔符、默认分隔符
- 单元测试：特殊字符处理、空数组、错误降级

**exporter.ts**：
- 属性测试：CSV格式、Excel格式、错误处理
- 单元测试：RFC 4180合规性、特殊字符转义

**panel.ts**：
- 单元测试：ESC键逐层关闭、文本选择禁用/恢复、导出弹窗UI结构（取消按钮居右）
- 集成测试：面板显示/隐藏流程、弹窗栈管理

**background/index.ts**：
- 单元测试：导出请求处理、文件名生成、下载触发
- 集成测试：完整导出流程（从请求到下载）

**content.css**：
- 手动测试：深色主题视觉验证
- 自动化测试：CSS变量定义存在性

**manifest.json**：
- 验证：downloads权限已添加

### 测试优先级

1. **高优先级**（核心功能）：
   - 自定义分隔符修复
   - 导出错误处理
   - ESC键关闭

2. **中优先级**（用户体验）：
   - 文本选择禁用
   - 导出面板UI

3. **低优先级**（视觉优化）：
   - 深色主题适配（手动验证）

### 不进行自动化测试的部分

以下需求通过手动验证或代码审查：
- 深色主题文字对比度（需求2）
- 功能语义清晰度（需求3）
- 取消按钮样式一致性（需求5）
- 多面板管理（需求4.4，通过弹窗栈实现）
- 浏览器下载行为（需求6.5，依赖浏览器API）
