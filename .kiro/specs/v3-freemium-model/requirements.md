# Requirements Document

## Introduction

本文档定义浏览器插件第三版升级的需求规格，核心目标是实现 Free + Pro 双轨制变现模型。该模型通过"基础能力限制数据规模 + 高级能力限制使用次数"的方式，在不影响基础可用性的前提下，为用户提供理性、可理解的升级动机。

### 现有功能概述

当前插件已实现：
- 框选文本提取（每日 20 次限制）
- 预览面板（可编辑、可拖动、可配置位置）
- 基础复制和导出功能
- Pro 功能占位（表格检测、列对齐、CSV 导出）
- 快捷键开关（Ctrl/Cmd + Shift + Y）
- 三层架构（Background 业务层、Content UI 层、Shared 协议层）

### 本次升级范围

本次升级将：
1. **调整变现策略**：从"每日次数限制"改为"双轨制限制模型"
2. **新增高级清洗功能**：提供可视化的数据清洗规则选择
3. **实现表格自动识别**：自动扫描页面表格并注入导出按钮
4. **优化 Pro 权限管理**：实现试用次数机制
5. **重新设计 Popup**：展示能力简述和剩余次数
6. **扩展预览窗口**：集成高级清洗入口

## Glossary

- **System**: 浏览器插件系统（Chrome Extension）
- **Free_User**: 免费版用户
- **Pro_User**: Pro 订阅用户
- **Basic_Capability**: 基础能力（框选、复制、导出、基础清洗）
- **Advanced_Capability**: 高级能力（高级清洗、表格识别、一键导出）
- **Preview_Panel**: 框选后弹出的预览窗口
- **Popup**: 点击插件图标后弹出的设置界面
- **Row_Limit**: 行数限制（Free 版为 5 行）
- **Trial_Count**: 高级能力试用次数（Free 版每项 3 次）
- **Advanced_Cleaning**: 高级清洗功能（去空行、合并多行、自定义分隔符、去重等）
- **Table_Detection**: 表格自动识别功能
- **One_Click_Export**: 一键导出完整表格功能
- **Export_Button**: 表格左上角注入的导出按钮

## Requirements

### Requirement 1: 双轨制限制模型（业务调整）

**User Story:** 作为产品设计者，我希望实现双轨制限制模型，以便在不影响基础可用性的前提下实现合理变现。

**变更说明：** 从"每日 20 次统一限制"改为"基础能力行数限制 + 高级能力次数限制"

#### Acceptance Criteria

1. THE System SHALL 实现轨道 A（基础能力 + 数据规模限制）
2. THE System SHALL 实现轨道 B（高级能力 + 使用次数限制）
3. WHEN Free_User 使用 Basic_Capability THEN THE System SHALL 限制最大处理行数为 5 行
4. WHEN Free_User 使用 Advanced_Capability THEN THE System SHALL 允许完整能力但限制试用次数为 3 次
5. WHEN Pro_User 使用任何能力 THEN THE System SHALL 解除所有限制
6. THE System SHALL 移除原有的"每日 20 次"统一限制

### Requirement 2: 基础能力与行数限制（业务调整）

**User Story:** 作为 Free_User，我希望能够使用基础功能处理少量数据，以便满足日常轻量级需求。

**变更说明：** 基础框选、复制、导出功能已存在，需调整为 5 行限制（原为每日 20 次限制）

#### Acceptance Criteria

1. WHEN Free_User 框选内容 THEN THE System SHALL 允许框选符合最小区域限制的区域
2. WHEN 提取的数据超过 5 行 THEN THE Preview_Panel SHALL 仅显示前 5 行
3. WHEN Free_User 点击复制 THEN THE System SHALL 仅复制前 5 行数据
4. WHEN Free_User 点击导出 THEN THE System SHALL 仅导出前 5 行数据
5. WHEN 数据被限制为 5 行 THEN THE Preview_Panel SHALL 显示明确提示："Free 版最多处理 5 行，升级 Pro 解锁完整数据"
6. WHEN Pro_User 使用基础能力 THEN THE System SHALL 处理和显示全部数据行

### Requirement 3: 高级清洗功能（新功能）

**User Story:** 作为用户，我希望使用高级清洗功能来精细化处理数据，以便获得更符合需求的输出结果。

**变更说明：** 全新功能，当前不存在任何清洗规则选择界面

#### Acceptance Criteria

1. WHEN 用户点击高级清洗 THEN THE System SHALL 显示可视化清洗规则选择界面
2. THE Advanced_Cleaning SHALL 支持去空行选项
3. THE Advanced_Cleaning SHALL 支持合并多行选项
4. THE Advanced_Cleaning SHALL 支持自定义分隔符选项
5. THE Advanced_Cleaning SHALL 支持是否合并为一行选项
6. THE Advanced_Cleaning SHALL 支持去重选项
7. WHEN 用户勾选清洗规则并确认 THEN THE System SHALL 应用规则到复制或导出操作
8. WHEN Free_User 使用高级清洗 THEN THE System SHALL 消耗一次试用次数
9. WHEN Free_User 试用次数用尽 THEN THE System SHALL 禁用高级清洗入口并显示升级提示
10. WHEN Pro_User 使用高级清洗 THEN THE System SHALL 不限制使用次数

### Requirement 4: 表格自动识别（新功能）

**User Story:** 作为用户，我希望系统能自动识别页面中的表格，以便快速导出表格数据。

**变更说明：** 全新功能，当前表格检测功能仅为占位实现。需要实现智能表格识别算法，不仅识别 `<table>` 元素，还要识别其他元素实现的表格结构（核心能力）

#### Acceptance Criteria

1. WHEN 插件启用 THEN THE System SHALL 自动扫描页面中所有 `<table>` 元素
2. WHEN 插件启用 THEN THE System SHALL 自动识别其他元素实现的表格结构（如 div、span 等）
3. WHEN 检测到表格结构 THEN THE System SHALL 识别可导出的表格
4. WHEN 识别到表格 THEN THE System SHALL 在表格左上角注入 Export_Button
5. THE Export_Button SHALL 显示为可点击的导出图标
6. WHEN Free_User 使用表格识别 THEN THE System SHALL 消耗一次试用次数
7. WHEN Free_User 试用次数用尽 THEN THE System SHALL 不再注入 Export_Button 并在点击时显示升级提示
8. WHEN Pro_User 使用表格识别 THEN THE System SHALL 不限制使用次数

### Requirement 5: 一键导出完整表格（新功能）

**User Story:** 作为用户，我希望点击表格上的导出按钮就能直接导出完整表格，以便快速获取数据。

**变更说明：** 全新功能，当前 CSV 导出仅为占位实现。需要提供导出格式选择（CSV、Excel），后续可扩展更多格式

#### Acceptance Criteria

1. WHEN 用户点击 Export_Button THEN THE System SHALL 提取该表格的完整数据
2. WHEN 用户点击 Export_Button THEN THE System SHALL 显示导出格式选择（CSV、Excel）
3. WHEN Free_User 点击导出且有试用次数 THEN THE System SHALL 导出完整表格数据（不受 5 行限制）
4. WHEN Free_User 点击导出且试用次数用尽 THEN THE System SHALL 显示升级 Pro 提示
5. WHEN Pro_User 点击导出 THEN THE System SHALL 导出完整表格数据
6. THE System SHALL 支持导出为 CSV 格式
7. THE System SHALL 支持导出为 Excel 格式
8. THE System SHALL 为后续扩展更多导出格式预留接口

### Requirement 6: Popup 界面设计（业务优化）

**User Story:** 作为用户，我希望通过 Popup 界面管理插件设置和查看状态，以便了解当前权限和剩余次数。

**变更说明：** 现有 Popup 仅有开关和位置设置，需新增能力简述、版本信息、剩余次数展示

#### Acceptance Criteria

1. WHEN 用户点击插件图标 THEN THE System SHALL 显示 Popup 界面
2. THE Popup SHALL 包含框选开关（开启/关闭插件功能）
3. THE Popup SHALL 包含框选结果弹窗位置设置（页面居中/跟随鼠标/直接复制）
4. THE Popup SHALL 显示 Free 和 Pro 能力简述
5. THE Popup SHALL 显示当前版本信息
6. WHEN Free_User 打开 Popup THEN THE System SHALL 显示剩余高级能力试用次数
7. THE Popup SHALL 包含升级 Pro 按钮
8. WHEN 用户修改设置 THEN THE System SHALL 持久化保存设置

### Requirement 7: 预览窗口功能扩展（业务优化）

**User Story:** 作为用户，我希望预览窗口提供完整的数据处理功能，以便在复制或导出前进行精细化处理。

**变更说明：** 现有预览窗口仅有复制按钮，需新增导出按钮、高级清洗入口和行数限制提示。导出操作需提供格式选择（CSV、Excel）

#### Acceptance Criteria

1. WHEN 框选完成 THEN THE System SHALL 立即显示 Preview_Panel
2. WHEN Free_User 框选内容 THEN THE Preview_Panel SHALL 显示前 5 行并标识"仅展示前 5 行"
3. WHEN Pro_User 框选内容 THEN THE Preview_Panel SHALL 显示全部内容
4. THE Preview_Panel SHALL 包含【复制】按钮
5. THE Preview_Panel SHALL 包含【导出】按钮
6. THE Preview_Panel SHALL 包含【高级清洗（Pro）】按钮
7. WHEN 用户点击导出 THEN THE System SHALL 显示导出格式选择（CSV、Excel）
8. WHEN 用户点击复制或导出 THEN THE System SHALL 支持应用高级清洗规则
9. WHEN Free_User 使用高级清洗进行复制或导出 THEN THE System SHALL 消耗一次试用次数
10. WHEN Free_User 未使用高级清洗 THEN THE System SHALL 按基础清洗 + 5 行限制处理
11. WHEN 试用次数用尽 THEN THE Preview_Panel SHALL 禁用高级清洗入口并显示升级提示

### Requirement 8: 升级提示触发规则（业务调整）

**User Story:** 作为产品设计者，我希望严格控制升级提示的触发时机，以便避免打扰用户并保持良好体验。

**变更说明：** 现有升级提示逻辑需调整，确保仅在无试用次数时触发

#### Acceptance Criteria

1. WHEN Free_User 无高级能力试用次数且尝试使用高级能力 THEN THE System SHALL 显示升级提示
2. THE System SHALL NOT 在打开插件时立即弹出付费提示
3. THE System SHALL NOT 在未点击高级能力时弹出付费提示
4. THE System SHALL NOT 完全禁用复制或导出功能
5. WHEN 显示升级提示 THEN THE System SHALL 说明升级后可获得的具体权益

### Requirement 9: 试用次数管理（新功能）

**User Story:** 作为 Free_User，我希望了解每项高级能力的剩余试用次数，以便合理规划使用。

**变更说明：** 全新功能，当前仅有"每日 20 次"统一计数，需改为每项高级能力独立计数。为防止破解无限试用，需实现基于无语义状态的非线性派生机制

#### Acceptance Criteria

1. THE System SHALL 为每项高级能力独立管理状态（高级清洗、表格识别、一键导出）
2. WHEN Free_User 首次安装 THEN THE System SHALL 初始化无语义状态种子
3. WHEN Free_User 成功使用高级能力 THEN THE System SHALL 通过非线性计算演化对应状态
4. WHEN 派生的可用性判断为 false THEN THE System SHALL 禁用该高级能力入口
5. THE System SHALL 在 Popup 中显示派生的剩余次数视图值
6. WHEN Pro_User 使用高级能力 THEN THE System SHALL 不演化状态
7. THE System SHALL NOT 使用线性计数（++、--、+=、-=）
8. THE System SHALL NOT 存储直接的次数值（quota、used、remain）
9. THE System SHALL 仅维护无语义状态（state、entropy、seed）
10. THE System SHALL 通过多步非线性计算派生可用性和剩余次数
11. WHEN 计算函数中的常量或运算符被修改 THEN 派生的额度 SHALL 失效或变小
12. THE System SHALL 确保状态演化具备单调性（只能不变或变差）
13. THE UI 显示的剩余次数 SHALL 仅为派生视图值，不参与授权判断
14. THE 授权判断 SHALL 由多因子输入、多步骤计算后折叠得到 boolean

### Requirement 10: 数据处理一致性（新功能）

**User Story:** 作为用户，我希望复制和导出功能都能应用相同的清洗规则，以便获得一致的数据处理结果。

**变更说明：** 全新功能，当前复制和导出无清洗规则选择

#### Acceptance Criteria

1. WHEN 用户选择高级清洗规则 THEN THE System SHALL 将规则应用于复制操作
2. WHEN 用户选择高级清洗规则 THEN THE System SHALL 将规则应用于导出操作
3. WHEN 用户未选择高级清洗 THEN THE System SHALL 使用基础清洗规则
4. THE System SHALL 确保复制和导出使用相同的清洗逻辑
5. WHEN Free_User 使用高级清洗 THEN THE System SHALL 在复制和导出时都遵守 5 行限制（如果未使用高级能力试用次数）

### Requirement 11: Pro 权限验证（业务优化）

**User Story:** 作为系统管理者，我希望准确验证用户的 Pro 权限，以便正确解锁功能。

**变更说明：** 现有 Pro 验证为占位实现（始终返回 false），需实现完整验证逻辑

#### Acceptance Criteria

1. THE System SHALL 提供 Pro 权限验证机制
2. WHEN 验证 Pro 权限 THEN THE System SHALL 检查用户的订阅状态
3. WHEN Pro_User 登录 THEN THE System SHALL 解除所有行数限制
4. WHEN Pro_User 登录 THEN THE System SHALL 解除所有试用次数限制
5. WHEN Pro_User 登录 THEN THE System SHALL 在 Popup 中显示 Pro 状态

### Requirement 12: 架构约束遵守

**User Story:** 作为开发者，我希望新功能遵守现有架构约束，以便保持代码质量和可维护性。

#### Acceptance Criteria

1. THE System SHALL 将所有业务逻辑放在 Background 层
2. THE System SHALL 将所有 UI 渲染逻辑放在 Content 层
3. THE System SHALL 通过消息协议实现 Background 和 Content 通信
4. THE System SHALL 将所有跨层类型定义放在 Shared 层
5. THE Content 层 SHALL NOT 包含业务逻辑判断
6. THE Content 层 SHALL NOT 直接访问 chrome.storage
7. THE Content 层 SHALL NOT import Background 层文件
8. THE Background 层 SHALL 生成所有业务相关文案
9. THE Background 层 SHALL 决定所有 UI Action
10. THE System SHALL 通过架构守门测试验证约束遵守情况
