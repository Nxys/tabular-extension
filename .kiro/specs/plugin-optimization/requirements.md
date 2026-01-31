# 需求文档：插件优化

## 简介

本规范针对插件的用户体验和交互设计进行优化，提升用户的使用满意度和转化率。主要包括：框选超限提示优化、Pro升级按钮设计改进等。

## 术语表

- **Selection_Limit**: 框选行数限制（免费用户5行）
- **Upgrade_Button**: Pro升级按钮
- **Limit_Prompt**: 超出限制时的提示信息
- **CTA**: Call To Action，行动号召按钮
- **Conversion_Rate**: 用户转化率

## 需求

### 需求 1：框选超限提示优化

**用户故事：** 作为免费用户，当我框选超过5行时，我希望看到一个吸引人的升级按钮，让我能够快速了解并升级到Pro版本。

#### 验收标准

1. WHEN 用户框选超过 Selection_Limit THEN THE System SHALL 显示升级提示面板
2. THE Limit_Prompt SHALL 包含清晰的限制说明文案
3. THE Limit_Prompt SHALL 包含一个视觉突出的 Upgrade_Button
4. THE Upgrade_Button SHALL 使用渐变色或高对比度配色方案
5. THE Upgrade_Button SHALL 包含明确的行动号召文案（如"立即升级Pro"）
6. WHEN 用户点击 Upgrade_Button THEN THE System SHALL 打开Pro升级页面或流程
7. THE Upgrade_Button SHALL 具有悬停效果（hover state）以增强交互感
8. THE Upgrade_Button SHALL 使用圆角、阴影等设计元素提升视觉吸引力

#### 设计要求

**按钮样式参考：**
- 背景：渐变色（如：从 #667eea 到 #764ba2，或从 #f093fb 到 #f5576c）
- 文字：白色，加粗，14-16px
- 圆角：8-12px
- 阴影：0 4px 15px rgba(0, 0, 0, 0.2)
- 悬停效果：轻微放大（scale: 1.05）+ 阴影加深
- 图标：可选添加 ⭐ 或 👑 等图标增强视觉吸引力

**文案建议：**
- "🚀 立即升级Pro，无限使用"
- "⭐ 升级Pro解锁全部功能"
- "👑 成为Pro用户"

### 需求 2：Pro升级流程优化

**用户故事：** 作为用户，当我点击升级按钮时，我希望能够快速完成升级流程，以便立即享受Pro功能。

#### 验收标准

1. WHEN 用户点击 Upgrade_Button THEN THE System SHALL 打开升级页面
2. THE System SHALL 提供清晰的Pro功能对比说明
3. THE System SHALL 提供简单的升级激活流程
4. WHEN 升级完成 THEN THE System SHALL 自动刷新插件状态
5. WHEN 升级完成 THEN THE System SHALL 显示欢迎提示或引导

### 需求 3：限制提示文案优化

**用户故事：** 作为免费用户，当我遇到功能限制时，我希望看到友好且有说服力的提示文案，让我了解升级的价值。

#### 验收标准

1. THE Limit_Prompt SHALL 使用积极正面的语言
2. THE Limit_Prompt SHALL 突出Pro版本的核心价值
3. THE Limit_Prompt SHALL 避免使用负面或限制性的表述
4. THE Limit_Prompt SHALL 包含具体的功能对比信息
5. THE Limit_Prompt SHALL 使用简洁明了的语言，避免冗长

#### 文案建议

**当前文案（需优化）：**
"免费版本仅支持框选5行以内的文本。升级Pro"

**优化后文案：**
- "🎯 免费版限制5行，升级Pro享受无限框选"
- "✨ Pro用户可以框选任意行数，立即升级解锁"
- "💎 升级Pro，解锁无限框选 + 高级清洗 + 更多功能"

### 需求 4：视觉层次优化

**用户故事：** 作为用户，我希望限制提示面板的视觉层次清晰，让我能够快速理解信息并做出决策。

#### 验收标准

1. THE Limit_Prompt SHALL 使用清晰的视觉层次结构
2. THE Upgrade_Button SHALL 是视觉焦点，最突出
3. THE Limit_Prompt SHALL 使用合适的间距和对齐
4. THE Limit_Prompt SHALL 在深色和浅色主题下都保持良好的可读性
5. THE Limit_Prompt SHALL 使用图标增强信息传达

#### 布局建议

```
┌─────────────────────────────────┐
│  ⚠️  框选限制提示                │
│                                 │
│  免费版限制5行                   │
│  升级Pro享受无限框选             │
│                                 │
│  ┌───────────────────────────┐  │
│  │  🚀 立即升级Pro，无限使用  │  │  ← 视觉焦点
│  └───────────────────────────┘  │
│                                 │
│  [稍后再说]                     │  ← 次要操作
└─────────────────────────────────┘
```

## 优先级

1. **P0 - 关键**: 需求1（框选超限提示优化）
2. **P1 - 重要**: 需求3（文案优化）、需求4（视觉层次）
3. **P2 - 一般**: 需求2（升级流程优化）

## 成功指标

- Pro转化率提升 20% 以上
- 用户点击升级按钮的比例提升 30% 以上
- 用户对限制提示的负面反馈减少 50% 以上

## 依赖关系

- 需求1 依赖于现有的 Selection_Limit 检查逻辑
- 需求2 依赖于Pro升级系统的实现
- 需求3 和 需求4 依赖于现有的UI组件系统
