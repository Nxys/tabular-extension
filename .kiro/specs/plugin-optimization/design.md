# 设计文档：插件优化

## 概述

本设计文档描述了插件用户体验优化的技术实现方案，重点关注框选超限提示的视觉优化和转化率提升。优化遵循现有的三层架构（Background/Content/Shared），主要涉及 Content 层的 UI 渲染和 CSS 样式调整。

## 架构

### 三层架构遵循

本次优化严格遵循现有的三层架构：

1. **Background 层**：负责生成优化后的文案内容，决定何时显示升级提示
2. **Content 层**：负责根据 Background 的指令渲染优化后的 UI
3. **Shared 层**：定义消息协议和类型（无需修改）

### 消息流程

```
用户框选超限
    ↓
Content 发送 REQUEST_ACTION
    ↓
Background 检测超限 → 生成优化文案
    ↓
返回 ACTION_RESULT { uiAction: 'SHOW_LIMIT_PANEL', uiData: { message, upgradeUrl } }
    ↓
Content 渲染优化后的升级提示面板
```

## 组件和接口

### 1. 结果面板超限提示优化

**位置**：`src/content/panel.ts` 中的 `showResult()` 方法

**设计理念**：
- 不使用独立的升级提示面板
- 在现有结果面板顶部添加超限提示条
- 用户仍能看到和复制前5行内容
- 提示条视觉突出但不侵入

**优化后实现**：
```typescript
showResult(uiData?: { 
  text?: string;
  isLimited?: boolean;   // 是否被限制
  limitMessage?: string; // 限制提示文案（由 Background 生成）
  upgradeUrl?: string;   // 升级页面 URL（由 Background 生成）
  // ... 其他现有字段
}, panelPosition: PanelPosition = 'center'): void
```

**UI 结构**：
```
┌─────────────────────────────────────┐
│  📋 文本预览                         │  ← 标题栏
├─────────────────────────────────────┤
│  🎯 已限制为5行，升级Pro解锁无限框选  │  ← 超限提示条（醒目）
│  [🚀 升级Pro]                       │  ← 渐变色升级按钮
├─────────────────────────────────────┤
│  [复制的文本内容...]                 │  ← 前5行内容（可复制）
│                                     │
│  [复制] [高级清洗] [导出]            │  ← 操作按钮
└─────────────────────────────────────┘
```

### 2. 超限提示条组件

**新增方法**：`createLimitBanner(limitMessage: string, upgradeUrl?: string)`

**功能**：
- 创建醒目的超限提示条
- 包含提示文案和升级按钮
- 应用渐变色背景和悬停效果
- 点击升级按钮时在当前标签页打开升级页面

**接口**：
```typescript
private createLimitBanner(limitMessage: string, upgradeUrl?: string): HTMLDivElement
```

**返回结构**：
```html
<div class="tabular-extension-panel-limit-banner">
  <div class="tabular-extension-panel-limit-message">
    🎯 已限制为5行，升级Pro解锁无限框选
  </div>
  <button class="tabular-extension-panel-upgrade-btn">
    🚀 升级Pro
  </button>
</div>
```

### 3. CSS 样式类

**新增样式类**：

1. `.tabular-extension-panel-limit-banner` - 超限提示条容器
2. `.tabular-extension-panel-limit-message` - 提示文案
3. `.tabular-extension-panel-upgrade-btn` - 升级按钮（渐变色）

## 数据模型

### UIData 扩展

在 `src/shared/types.ts` 的 `ActionResultMessage` 中扩展 `uiData`：

```typescript
uiData?: {
  message?: string;           // 主提示文案
  upgradeUrl?: string;        // 升级页面 URL（新增）
  // ... 其他现有字段
}
```

## 正确性属性

*属性是关于系统行为的形式化陈述，应该在所有有效执行中保持为真。每个属性都是可测试的规范，用于验证实现的正确性。*

### 属性 1：框选超限显示提示条

*对于任意* 框选行数，当行数超过限制（5行）时，系统应该在结果面板顶部显示超限提示条，同时显示前5行内容。

**验证需求：1.1, 1.2**

### 属性 2：升级按钮符合设计规范

*对于任意* 升级提示面板，升级按钮应该：
- 存在于 DOM 中
- 使用渐变色背景（CSS gradient）
- 包含行动号召文案（包含"升级"或"Pro"关键词）
- 具有圆角样式（border-radius ≥ 8px）
- 具有阴影效果（box-shadow 已定义）
- 具有悬停效果（:hover 状态定义了 transform 或 scale）

**验证需求：1.3, 1.4, 1.5, 1.7, 1.8**

### 属性 3：点击升级按钮打开升级页面

*对于任意* 升级按钮点击事件，系统应该在当前标签页打开升级页面（通过 window.location.href 或 chrome.tabs.update）。

**验证需求：1.6, 2.1**

### 属性 4：提示文案完整且简洁

*对于任意* 超限提示条，提示文案应该：
- 包含限制说明（包含"5行"或"限制"关键词）
- 包含功能对比信息（包含"无限"、"Pro"等关键词）
- 字符数在合理范围内（15-50字，更简洁）

**验证需求：1.2, 3.4, 3.5**

### 属性 5：主题适配良好

*对于任意* 浏览器主题（浅色/深色），超限提示条的文本颜色对比度应该符合 WCAG AA 标准（对比度 ≥ 4.5:1）。

**验证需求：4.4**

### 属性 6：提示条布局符合规范

超限提示条应该：
- 包含图标元素（emoji）
- 使用合适的间距（padding ≥ 12px）
- 提示文案和按钮水平排列
- 视觉上与内容区域明显分隔

**验证需求：4.1, 4.3, 4.5**

## 错误处理

### 1. 升级 URL 缺失

**场景**：Background 未提供 upgradeUrl

**处理**：使用默认升级页面 URL

```typescript
const defaultUpgradeUrl = 'https://example.com/upgrade';
const url = upgradeUrl || defaultUpgradeUrl;
```

### 2. 页面跳转失败

**场景**：无法跳转到升级页面

**处理**：显示 Toast 提示用户，并提供备用方案

```typescript
try {
  window.location.href = url;
} catch (error) {
  // 备用方案：复制链接到剪贴板
  navigator.clipboard.writeText(url);
  this.showToast('❌ 无法跳转，升级链接已复制到剪贴板');
}
```

## 测试策略

### 单元测试和属性测试

本项目采用双重测试策略：

1. **单元测试**：验证具体示例、边界情况和错误条件
2. **属性测试**：验证通用属性在所有输入下的正确性

两者互补，共同确保全面覆盖。

### 属性测试配置

- **测试库**：fast-check（TypeScript 的 PBT 库）
- **迭代次数**：每个属性测试最少 100 次
- **标签格式**：`// Feature: plugin-optimization, Property N: [属性描述]`

### 测试用例

**单元测试**（`tests/unit/content/panel.test.ts`）：
- 超限提示条创建测试
- 结果面板渲染测试（包含提示条）
- 升级按钮点击事件测试

**集成测试**（`tests/integration/upgrade-prompt.test.ts`）：
- 框选超限显示提示条
- 升级按钮交互
- 主题适配
- 用户仍能复制前5行内容

**属性测试示例**：
```typescript
// Feature: plugin-optimization, Property 2: 升级按钮符合设计规范
fc.assert(
  fc.property(
    fc.constant(null),
    () => {
      // 渲染升级提示面板
      // 验证按钮符合所有设计规范
    }
  ),
  { numRuns: 100 }
);
```

## 实现细节

### 面板宽度调整

为了容纳超限提示条和升级按钮，将面板宽度从 340px 增加到 420px：

```css
.tabular-extension-panel {
  width: 420px !important;  /* 从 340px 增加到 420px */
}
```

### CSS 样式规范

**超限提示条样式**：
```css
.tabular-extension-panel-limit-banner {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-left: 4px solid #ff9800;
  padding: 12px 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tabular-extension-panel-limit-message {
  flex: 1;
  font-size: 14px;
  color: #e65100;
  font-weight: 500;
}

.tabular-extension-panel-upgrade-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 13px;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.tabular-extension-panel-upgrade-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
```

### showResult 方法优化

**在 showResult 中添加超限提示条**：
```typescript
showResult(uiData?: { 
  text?: string;
  isLimited?: boolean;
  limitMessage?: string;
  upgradeUrl?: string;
  // ... 其他字段
}, panelPosition: PanelPosition = 'center'): void {
  // ... 创建面板基础结构
  
  // 如果被限制，在内容区域顶部添加提示条
  if (uiData?.isLimited && uiData?.limitMessage) {
    const banner = this.createLimitBanner(uiData.limitMessage, uiData.upgradeUrl);
    previewWrapper.insertBefore(banner, previewWrapper.firstChild);
  }
  
  // ... 继续渲染其他内容
}
```

### 提示条创建方法

```typescript
private createLimitBanner(limitMessage: string, upgradeUrl?: string): HTMLDivElement {
  const banner = document.createElement('div');
  banner.className = `${CSS_CLASS_PREFIX}-panel-limit-banner`;
  
  const message = document.createElement('div');
  message.className = `${CSS_CLASS_PREFIX}-panel-limit-message`;
  message.textContent = limitMessage;
  
  const btn = document.createElement('button');
  btn.className = `${CSS_CLASS_PREFIX}-panel-upgrade-btn`;
  btn.textContent = '🚀 升级Pro';
  btn.onclick = () => {
    const url = upgradeUrl || 'https://example.com/upgrade';
    try {
      window.location.href = url;
    } catch (error) {
      navigator.clipboard.writeText(url);
      console.error('无法跳转，链接已复制');
    }
  };
  
  banner.appendChild(message);
  banner.appendChild(btn);
  
  return banner;
}
```

## 性能考虑

1. **CSS 动画性能**：使用 `transform` 实现悬停效果，利用 GPU 加速
2. **事件监听器清理**：确保面板关闭时移除所有事件监听器
3. **DOM 操作优化**：一次性创建完整的 DOM 结构

## 可访问性

1. **键盘导航**：升级按钮支持 Tab 键聚焦和 Enter 键触发
2. **颜色对比度**：确保文本和背景的对比度符合 WCAG AA 标准（≥ 4.5:1）

## 兼容性

- **浏览器**：Chrome 88+, Edge 88+
- **主题**：支持浅色和深色主题自动适配
- **分辨率**：支持 1920x1080 及以上分辨率
