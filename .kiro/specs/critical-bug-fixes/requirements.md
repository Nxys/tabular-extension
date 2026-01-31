# 需求文档：关键Bug修复

## 简介

本规范针对测试中发现的关键功能性Bug进行修复，这些Bug影响了插件的核心功能和用户体验。主要包括：插件状态控制、高级清洗逻辑错误、面板交互问题、Pro功能计数错误、表格识别流程错误和Excel导出格式问题。

## 术语表

- **Extension_State**: 插件启用/禁用状态
- **Table_Detection**: 表格检测功能
- **Advanced_Cleaning**: 高级清洗功能模块
- **Selection_Box**: 页面文本框选功能
- **Export_Panel**: 导出格式选择面板
- **Preview_Panel**: 文本预览面板
- **Pro_Counter**: Pro功能使用次数计数器
- **Excel_Export**: Excel格式导出功能

## 需求

### 需求 1：插件关闭状态下禁用表格检测

**用户故事：** 作为用户，当我关闭插件时，我希望表格检测功能完全不可用，以避免误操作和资源浪费。

#### 验收标准

1. WHEN Extension_State 为 disabled THEN THE Table_Detection SHALL 不执行任何检测逻辑
2. WHEN Extension_State 为 disabled THEN THE System SHALL 不在页面上显示任何检测相关的UI元素
3. WHEN Extension_State 为 disabled THEN THE System SHALL 不响应用户的表格检测相关操作
4. WHEN Extension_State 从 disabled 变为 enabled THEN THE Table_Detection SHALL 恢复正常工作
5. WHEN 用户尝试在插件关闭状态下使用表格检测 THEN THE System SHALL 不执行任何操作

### 需求 2：重构高级清洗功能

**用户故事：** 作为用户，我希望高级清洗功能逻辑清晰、选项合理，以便我能准确理解和使用每个清洗选项。

#### 验收标准

1. THE Advanced_Cleaning SHALL 移除"去除空行"选项（框选自带此能力）
2. THE Advanced_Cleaning SHALL 移除"合并多行"选项（功能重复）
3. THE Advanced_Cleaning SHALL 保留"合并为一行"选项
4. THE Advanced_Cleaning SHALL 保留"自定义分隔符"选项
5. WHEN 用户选择"合并为一行" THEN THE System SHALL 将所有文本合并为单行
6. WHEN 用户输入"自定义分隔符" THEN THE System SHALL 始终应用该分隔符，不受其他选项影响
7. WHEN 用户同时选择"合并为一行"和"自定义分隔符" THEN THE System SHALL 先合并为一行，再应用自定义分隔符
8. THE Advanced_Cleaning SHALL 确保选项之间的逻辑关系清晰且不互斥

### 需求 3：修复面板框选问题

**用户故事：** 作为用户，当我查看高级清洗规则或选择导出格式时，我不希望意外触发页面文本框选，以避免操作混乱。

#### 验收标准

1. WHEN Advanced_Cleaning 面板显示时 THEN THE Selection_Box SHALL 被禁用
2. WHEN Export_Panel 显示时 THEN THE Selection_Box SHALL 被禁用
3. WHEN 面板关闭后 THEN THE Selection_Box SHALL 恢复启用
4. THE System SHALL 确保面板内容不会触发页面文本框选
5. WHEN 用户在面板上进行鼠标操作 THEN THE System SHALL 阻止事件冒泡到页面层
6. WHEN 弹窗显示模糊遮罩时 THEN THE Selection_Box SHALL 被禁用
7. WHEN 遮罩层存在时 THEN THE System SHALL 阻止页面框选功能

### 需求 4：Pro功能用尽后计数显示修复

**用户故事：** 作为免费用户，当我的Pro功能试用次数用尽后，我希望看到准确的剩余次数显示，以便了解我的使用状态。

#### 验收标准

1. WHEN Pro_Counter 为 0 THEN THE Preview_Panel SHALL 显示"剩余 0 次"
2. WHEN Pro_Counter 为 0 THEN THE System SHALL 禁用Pro功能按钮
3. WHEN 用户使用Pro功能 THEN THE System SHALL 实时更新 Pro_Counter 显示
4. WHEN Pro_Counter 更新后 THEN THE Preview_Panel SHALL 立即反映最新的计数值
5. THE System SHALL 确保 Pro_Counter 在所有面板中显示一致

### 需求 5：修复表格识别流程

**用户故事：** 作为用户，当我点击表格识别按钮时，我希望直接看到导出格式选择面板，而不是文本预览面板，以便快速完成导出操作。

#### 验收标准

1. WHEN 用户点击表格识别按钮 THEN THE System SHALL 显示 Export_Panel
2. WHEN 用户点击表格识别按钮 THEN THE System SHALL 不显示 Preview_Panel
3. WHEN 用户在 Export_Panel 选择格式后 THEN THE System SHALL 直接执行导出操作
4. THE System SHALL 确保表格识别流程不经过文本预览步骤
5. WHEN 表格识别完成 THEN THE System SHALL 将数据准备好供导出使用

### 需求 6：修复Excel导出格式

**用户故事：** 作为用户，当我导出Excel格式时，我希望数据能够正确分布在多列中，而不是全部挤在一列，以便我能正常使用导出的数据。

#### 验收标准

1. WHEN 用户导出Excel格式 THEN THE Excel_Export SHALL 正确解析表格的列结构
2. WHEN 表格有N列 THEN THE Excel_Export SHALL 生成N列的Excel文件
3. WHEN 单元格包含特殊字符 THEN THE Excel_Export SHALL 正确转义和保存
4. WHEN 表格包含合并单元格 THEN THE Excel_Export SHALL 正确处理合并单元格的数据
5. THE Excel_Export SHALL 确保每行数据的列数与表头列数一致
6. WHEN 导出完成 THEN THE System SHALL 生成可被Excel/WPS等软件正常打开的文件

### 需求 7：文本预览面板按钮状态管理

**用户故事：** 作为用户，当文本预览面板中没有内容时，我希望功能按钮被禁用，以避免执行无意义的操作。

#### 验收标准

1. WHEN Preview_Panel 中文本内容为空 THEN THE System SHALL 禁用所有功能按钮
2. WHEN Preview_Panel 中文本内容为空字符串 THEN THE System SHALL 禁用"复制"按钮
3. WHEN Preview_Panel 中文本内容为空字符串 THEN THE System SHALL 禁用"高级清洗"按钮
4. WHEN Preview_Panel 中文本内容为空字符串 THEN THE System SHALL 禁用"导出"按钮
5. WHEN Preview_Panel 中文本内容不为空 THEN THE System SHALL 启用所有功能按钮
6. THE System SHALL 在按钮禁用时显示视觉反馈（灰色、不可点击）

## 优先级

1. **P0 - 关键**: 需求1（插件状态控制）、需求6（Excel导出）
2. **P1 - 重要**: 需求2（高级清洗重构）、需求5（表格识别流程）
3. **P2 - 一般**: 需求3（面板框选）、需求4（Pro计数显示）、需求7（按钮状态管理）

## 依赖关系

- 需求2 依赖于现有的 Advanced_Cleaning 模块
- 需求3 依赖于现有的 Selection_Box 模块
- 需求4 依赖于现有的 Pro_Counter 模块
- 需求5 和 需求6 依赖于现有的表格检测和导出模块
- 需求7 依赖于现有的 Preview_Panel 模块
