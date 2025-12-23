# 需求文档：面板 UI 与行为调优

## 简介

本功能旨在修复结果面板与限制面板在边界场景下的显示与一致性问题，并对相关 UI 进行必要的设计优化。**不进行任何业务逻辑重构，不新增策略规则，仅修正展示与位置逻辑**。

## 术语表

- **Text_Preview_Panel（文本预览面板）**: 显示提取结果和提供复制功能的浮动面板，包含 textarea 和复制按钮
- **Limit_Panel（限制面板）**: 当免费次数用尽时显示的提示面板，不包含文本预览功能
- **Viewport（视口）**: 浏览器窗口的可见区域
- **Panel_Position（面板位置模式）**: 用户配置的面板显示位置策略（center/mouse/none）
- **Policy_Module（策略模块）**: policy.ts 文件，定义免费版和 Pro 版的使用策略
- **Usage_Limit（使用限制）**: 免费版每日使用次数限制

## 需求

### 需求 1：文本预览面板位置修复（跟随鼠标模式）

**用户故事：** 作为用户，我希望在「跟随鼠标」模式下，文本预览面板始终完整显示在视口内，这样我可以看到所有操作按钮。

#### 验收标准

1. WHEN Panel_Position 设置为 'mouse' AND 鼠标释放位置靠近视口底部 THEN THE Text_Preview_Panel SHALL 自动向上偏移以确保面板底部在视口内
2. WHEN Panel_Position 设置为 'mouse' AND 鼠标释放位置靠近视口右侧 THEN THE Text_Preview_Panel SHALL 自动向左偏移以确保面板右侧在视口内
3. WHEN Text_Preview_Panel 显示时 THEN THE Text_Preview_Panel SHALL 保证底部操作区（复制按钮）始终在视口内可见
4. WHEN 计算面板位置时 THEN THE System SHALL 以「面板完整可见」为优先级而非简单 clamp 到鼠标点

### 需求 2：文本预览面板标题区增加免费额度显示并美化样式

**用户故事：** 作为用户，我希望在文本预览面板的标题区看到剩余免费次数，这样我可以了解自己的使用情况，同时这个信息应该清晰但不抢眼。

#### 验收标准

1. WHEN Text_Preview_Panel 显示时 THEN THE System SHALL 在标题区显示免费剩余次数信息
2. WHEN 显示免费剩余次数时 THEN THE System SHALL 从 usage 模块的 checkUsage() 获取 remaining 值
3. WHEN 显示免费剩余次数时 THEN THE System SHALL 使用次要视觉层级的样式（较小字号、较低对比度、较轻字重）
4. WHEN 显示免费剩余次数时 THEN THE System SHALL 与主标题形成清晰的信息层级
5. WHEN 设计免费额度样式时 THEN THE System SHALL 采用简洁、轻量、偏工具型的风格而非营销感
6. WHEN 免费额度为 0 时 THEN THE Text_Preview_Panel SHALL 不显示（因为会触发 Limit_Panel）

### 需求 3：限制面板弹出位置行为修正

**用户故事：** 作为用户，我希望限制面板始终在屏幕中央弹出，这样我可以清楚地看到限制提示。

#### 验收标准

1. WHEN Limit_Panel 触发显示时 THEN THE System SHALL 忽略所有 Panel_Position 配置
2. WHEN Limit_Panel 显示时 THEN THE Limit_Panel SHALL 强制在页面视口正中央弹出
3. WHEN 页面滚动时 THEN THE Limit_Panel SHALL 保持在视口中央（使用 fixed 定位）
4. WHEN Limit_Panel 显示时 THEN THE System SHALL 不引入动画效果

### 需求 4：限制面板次数来源修正（去硬编码）

**用户故事：** 作为开发者，我希望限制面板中的次数信息从策略模块读取，这样当策略调整时 UI 会自动同步。

#### 验收标准

1. WHEN Limit_Panel 显示使用次数时 THEN THE System SHALL 从 Policy_Module 读取 maxPerDay 值
2. WHEN Limit_Panel 显示时 THEN THE System SHALL 禁止在 UI 层硬编码次数数值
3. WHEN Policy_Module 中的策略调整时 THEN THE Limit_Panel SHALL 自动显示更新后的次数
4. WHEN 显示次数信息时 THEN THE System SHALL 不在 UI 层复制或重定义策略常量

### 需求 5：限制面板文本样式与整体美化

**用户故事：** 作为用户，我希望限制面板的文本样式清晰美观，这样我可以更好地理解限制信息。

#### 验收标准

1. WHEN Limit_Panel 显示时 THEN THE System SHALL 明确区分主提示和次要说明的视觉层级
2. WHEN 设计限制面板样式时 THEN THE System SHALL 调整字体大小、行高、颜色对比以提升可读性
3. WHEN 设计限制面板时 THEN THE System SHALL 避免"系统弹窗感"，采用产品化风格
4. WHEN 美化限制面板时 THEN THE System SHALL 不增加新文案且不改变原有文案含义

### 需求 6：修改约束

**用户故事：** 作为开发者，我希望本次修改仅限于 UI 层面，这样可以避免引入业务逻辑风险。

#### 验收标准

1. WHEN 实施本次修改时 THEN THE System SHALL 不重构现有组件结构
2. WHEN 实施本次修改时 THEN THE System SHALL 不修改业务逻辑、计数逻辑、策略判断
3. WHEN 实施本次修改时 THEN THE System SHALL 不引入第三方 UI 库
4. WHEN 实施本次修改时 THEN THE System SHALL 仅修改面板定位逻辑、样式、策略数据读取方式
5. WHEN 实施本次修改时 THEN THE System SHALL 保持现有 API 和事件流不变
