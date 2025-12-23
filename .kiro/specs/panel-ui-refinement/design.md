# 设计文档：面板 UI 与行为调优

## 概述

本设计文档描述了如何修复文本预览面板与限制面板在边界场景下的显示与一致性问题，并对相关 UI 进行必要的设计优化。本次修改严格限制在 UI 层面，不涉及业务逻辑重构。

**面板类型说明：**
- **文本预览面板（Text Preview Panel）**：通过 `show()` 或 `showAligned()` 方法显示，包含 textarea 和复制按钮
- **限制面板（Limit Panel）**：通过 `showLimitReached()` 或 `showProRequired()` 方法显示，仅包含提示信息和升级按钮

## 架构

本次修改涉及以下模块：

1. **Panel 类** (`src/content/panel.ts`)
   - 负责面板的创建、显示和位置计算
   - 需要修改位置计算逻辑和样式生成

2. **Content 脚本** (`src/content/content.ts`)
   - 调用 Panel 类显示面板
   - 需要传递正确的位置参数

3. **CSS 样式** (`src/content/content.css`)
   - 定义面板的视觉样式
   - 需要添加新的样式类和优化现有样式

4. **Policy 模块** (`src/content/usage/policy.ts`)
   - 定义使用策略（已存在）
   - Panel 需要导入并读取策略数据

## 组件和接口

### 1. Panel 类修改

#### 新增接口

```typescript
/**
 * 面板配置选项
 */
interface PanelOptions {
  position: { left: number; top: number };
  editable?: boolean;
  forceCenter?: boolean; // 新增：强制居中显示
  usageInfo?: { // 新增：使用信息（用于显示剩余次数）
    remaining: number;
    max: number;
  };
}

/**
 * 限制面板配置
 */
interface LimitPanelConfig {
  type: 'limit' | 'pro-required';
  title: string;
  icon: string;
  message: string;
  showUpgradeButton: boolean;
  usageInfo?: { // 新增：使用信息
    current: number;
    max: number;
  };
}
```

#### 修改的方法

1. **show() 方法**
   - 添加视口边界检测逻辑
   - 确保面板完整显示在视口内
   - 接收可选的 `usageInfo` 参数（包含 remaining）
   - 将 `usageInfo` 传递给 createElement

2. **showLimitReached() 方法**
   - 添加 `forceCenter: true` 参数
   - 从 policy.ts 读取次数信息
   - 传递使用信息到 createElement

3. **showProRequired() 方法**
   - 添加 `forceCenter: true` 参数

4. **createElement() 方法**
   - 接收 usageInfo 参数（用于限制面板和结果面板）
   - 根据 forceCenter 参数决定定位方式
   - 使用 usageInfo 动态生成次数显示
   - 在结果面板标题区添加免费额度显示元素

5. **新增 adjustPositionForViewport() 方法**
   - 检测面板是否超出视口
   - 自动调整位置确保完整可见

### 2. Content 脚本修改

#### handleShowResult() 方法

修改以传递剩余次数信息：

```typescript
private handleShowResult(text: string): void {
  const mode = this.settings.panelPosition;
  if (mode === 'none') {
    navigator.clipboard?.writeText(text).catch((error) => {
      console.error('直接复制失败:', error);
    });
    return;
  }

  const position = this.calcPanelPosition(mode);
  
  // 获取剩余次数
  checkUsage().then(usage => {
    this.panel.show(text, { 
      position, 
      editable: true,
      usageInfo: usage.remaining !== undefined ? {
        remaining: usage.remaining,
        max: FREE_POLICY.maxPerDay
      } : undefined
    });
  });
  
  this.ignoreNextOutsideClick = true;
}
```

#### calcPanelPosition() 方法

修改 'mouse' 模式的位置计算逻辑：

```typescript
private calcPanelPosition(mode: PanelPosition): { left: number; top: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const panelWidth = 340; // 实际面板宽度
  const panelHeight = 460; // 实际面板最大高度

  if (mode === 'center') {
    return {
      left: Math.max(10, (viewportWidth - panelWidth) / 2),
      top: Math.max(10, (viewportHeight - panelHeight) / 2)
    };
  }

  // mouse 模式：计算初始位置，后续由 Panel 类调整
  const anchor = this.lastMouseUpPoint || { x: viewportWidth / 2, y: viewportHeight / 2 };
  return {
    left: anchor.x + 16,
    top: anchor.y + 16
  };
}
```

### 3. CSS 样式修改

#### 新增样式类

```css
/* 限制面板强制居中 */
.browser-selection-copy-panel-force-center {
  position: fixed !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
}

/* 免费额度显示（次要信息） */
.browser-selection-copy-panel-usage-info {
  font-size: 12px !important;
  color: rgba(255, 255, 255, 0.7) !important;
  font-weight: 400 !important;
  margin-left: 8px !important;
}

/* 限制面板次数信息 */
.browser-selection-copy-panel-limit-count {
  font-size: 16px !important;
  font-weight: 600 !important;
  color: var(--bsc-text) !important;
  margin: 8px 0 !important;
}

/* 限制面板次要信息 */
.browser-selection-copy-panel-limit-secondary {
  font-size: 13px !important;
  color: var(--bsc-text) !important;
  opacity: 0.7 !important;
  margin: 4px 0 !important;
}
```

## 数据模型

### 使用信息模型

```typescript
interface UsageInfo {
  current: number; // 当前已使用次数
  max: number;     // 最大允许次数
}
```

此模型从以下来源获取：
- `max`: 从 `policy.ts` 的 `FREE_POLICY.maxPerDay` 读取
- `current`: 从现有的 usage 系统读取

## 正确性属性

*属性是关于系统应该满足的特征或行为的形式化陈述，这些陈述应该在所有有效执行中保持为真。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1：文本预览面板视口边界完整性

*对于任意* 鼠标释放位置（x, y）和视口尺寸（width, height），当 Panel_Position 为 'mouse' 时，显示的文本预览面板的所有边界（top, bottom, left, right）都应该满足：
- `0 <= top`
- `bottom <= height`
- `0 <= left`
- `right <= width`

**验证：需求 1.1, 1.2, 1.3**

### 属性 2：限制面板强制居中

*对于任意* Panel_Position 配置值和页面滚动位置，当显示限制面板时，面板的定位方式应为 `position: fixed`，且面板中心点应与视口中心点重合（允许误差 ±1px）。

**验证：需求 3.1, 3.2, 3.3**

### 属性 3：策略数据一致性

*对于任意* Policy_Module 中的 maxPerDay 值，当限制面板显示使用次数信息时，显示的最大次数文本应该包含该 maxPerDay 值。

**验证：需求 4.1, 4.3**

### 属性 4：文本预览面板标题视觉层级

*对于任意* 文本预览面板显示，当包含免费额度信息时，免费额度的字号应该小于主标题字号，且免费额度的颜色透明度应该低于主标题颜色透明度。

**验证：需求 2.3, 2.4**

### 属性 5：文本预览面板免费额度数据一致性

*对于任意* 文本预览面板显示，当显示免费额度信息时，显示的剩余次数应该等于 `checkUsage()` 返回的 `remaining` 值。

**验证：需求 2.1, 2.2**

### 属性 6：限制面板文本层级分离

*对于任意* 限制面板显示，主提示文本的字号应该大于次要说明文本的字号，且主提示的颜色透明度应该高于次要说明的颜色透明度。

**验证：需求 5.1**

## 错误处理

### 策略数据读取失败

如果无法从 policy.ts 读取策略数据：
- 使用默认值（20 次）作为后备
- 在控制台输出警告信息
- 不阻止面板显示

### 视口尺寸异常

如果视口尺寸小于面板最小尺寸：
- 面板仍然显示
- 允许部分超出视口（优先显示顶部和左侧）
- 用户可以通过拖动调整位置

## 测试策略

### 单元测试

1. **位置计算测试**
   - 测试各种鼠标位置的面板位置计算
   - 测试边界情况（靠近视口边缘）
   - 测试不同视口尺寸

2. **样式应用测试**
   - 测试强制居中样式是否正确应用
   - 测试免费额度样式是否正确生成

3. **策略读取测试**
   - 测试从 policy.ts 正确读取 maxPerDay
   - 测试策略数据在 UI 中正确显示

### 属性测试

每个属性测试应运行至少 100 次迭代，使用随机生成的输入数据。

1. **属性 1 测试**
   - 生成随机鼠标位置和视口尺寸
   - 验证面板边界在视口内

2. **属性 2 测试**
   - 生成随机 Panel_Position 配置和滚动位置
   - 验证限制面板始终居中

3. **属性 3 测试**
   - 生成随机 maxPerDay 值
   - 验证 UI 显示与策略一致

4. **属性 4 测试**
   - 解析生成的 HTML
   - 验证样式属性的数值关系

### 手动测试

由于本次修改主要涉及视觉效果，需要进行以下手动测试：

1. 在不同浏览器窗口尺寸下测试面板显示
2. 测试鼠标在视口边缘释放时的面板位置
3. 测试限制面板的居中效果
4. 测试免费额度信息的视觉层级
5. 测试限制面板的文本样式和可读性

### 测试工具

- **单元测试框架**: Jest
- **属性测试库**: fast-check (TypeScript 的属性测试库)
- **测试标签格式**: `Feature: panel-ui-refinement, Property {number}: {property_text}`
