# 需求文档：表格检测增强

## 简介

本功能旨在增强 Chrome 浏览器扩展的表格检测能力，特别是针对 Ant Design 等现代 UI 框架的复杂表格结构。当前系统在检测空表格、固定列表格和深度嵌套表格时存在问题，导致用户无法看到复制/导出标识。本需求将系统化地解决这些问题，提升表格检测的准确性和覆盖率。

## 术语表

- **Detector（检测器）**：负责扫描页面并识别表格结构的模块
- **HTML_Table（HTML 表格）**：使用标准 `<table>` 元素实现的表格
- **Div_Table（Div 表格）**：使用 `<div>` 或 `<span>` 元素通过 CSS 布局实现的表格
- **Empty_Table（空表格）**：只有表头没有数据行，或数据行显示"暂无数据"占位符的表格
- **Fixed_Column_Table（固定列表格）**：包含固定列（sticky positioning）的表格
- **Nested_Table（嵌套表格）**：包含多层 DOM 嵌套结构的表格
- **Export_Button（导出按钮）**：注入到表格上的复制/导出标识按钮
- **Ant_Design_Table（Ant Design 表格）**：使用 Ant Design UI 框架实现的表格组件
- **Visibility_Check（可见性检查）**：判断 DOM 元素是否在页面上可见的检查逻辑

## 需求

### 需求 1：空表格检测支持

**用户故事：** 作为用户，我希望系统能够检测到空表格（只有表头没有数据的表格），以便我可以导出表头结构或在数据加载后导出完整数据。

#### 验收标准

1. WHEN 页面包含只有表头的 HTML 表格 THEN THE Detector SHALL 识别该表格并提取表头信息
2. WHEN 页面包含带有"暂无数据"占位符的表格 THEN THE Detector SHALL 识别该表格并标记为空表格
3. WHEN 空表格的 tbody 只包含占位行（如 `class="ant-table-placeholder"`）THEN THE Detector SHALL 正确识别表头结构
4. WHEN 空表格被检测到 THEN THE Detector SHALL 返回至少包含表头行的表格数据
5. THE Detector SHALL 将空表格的最小行数要求降低为 1（仅表头）

### 需求 2：固定列表格检测支持

**用户故事：** 作为用户，我希望系统能够检测包含固定列的表格，以便我可以导出包括固定列在内的完整表格数据。

#### 验收标准

1. WHEN 表格包含固定列（使用 `position: sticky` 或 `position: fixed`）THEN THE Detector SHALL 识别所有列包括固定列
2. WHEN 表格单元格包含 `ant-table-cell-fix-left` 或 `ant-table-cell-fix-right` 类名 THEN THE Detector SHALL 将其识别为固定列
3. WHEN 提取固定列表格数据 THEN THE Detector SHALL 按照视觉顺序（从左到右）排列所有列
4. WHEN 固定列与普通列重叠显示 THEN THE Detector SHALL 去重并保留唯一的列数据
5. THE Detector SHALL 正确计算包含固定列的表格的总列数

### 需求 3：嵌套结构表格检测支持

**用户故事：** 作为用户，我希望系统能够检测具有复杂嵌套 DOM 结构的表格，以便我可以导出这些现代 UI 框架实现的表格。

#### 验收标准

1. WHEN 表格包含多层容器嵌套（如 `ant-table-container` > `ant-table-content`）THEN THE Detector SHALL 穿透嵌套层级找到实际的 `<table>` 元素
2. WHEN 表格单元格内部包含复杂的 DOM 结构 THEN THE Detector SHALL 提取所有可见文本内容
3. WHEN 表格使用 `overflow: auto` 或 `overflow: hidden` 容器 THEN THE Detector SHALL 正确识别容器内的表格
4. WHEN 表格包含测量行（如 `class="ant-table-measure-row"`）THEN THE Detector SHALL 过滤掉这些辅助行
5. THE Detector SHALL 识别并跳过高度为 0 或 `aria-hidden="true"` 的辅助行

### 需求 4：UI 框架表格特征识别

**用户故事：** 作为用户，我希望系统能够识别各种主流前端 UI 框架的表格特征，以便更准确地检测和提取这些常见框架实现的表格。

#### 验收标准

1. WHEN 表格容器包含已知 UI 框架的特征类名 THEN THE Detector SHALL 识别框架类型并应用对应的检测规则
2. THE Detector SHALL 支持识别以下框架：Ant Design、Element UI、Element Plus、Arco Design、Naive UI、Vuetify、Material-UI、Bootstrap、Semantic UI
3. WHEN 表格包含框架特定的空表格标识（如 `ant-table-empty`、`el-table__empty-block`）THEN THE Detector SHALL 识别为空表格并提取表头
4. WHEN 表格包含框架特定的固定列标识 THEN THE Detector SHALL 识别固定列并正确提取数据
5. WHEN 表格框架类型无法识别 THEN THE Detector SHALL 标记为 'unknown' 并使用通用检测规则

### 需求 5：导出按钮注入增强

**用户故事：** 作为用户，我希望在所有被检测到的表格上都能看到导出按钮，包括空表格和复杂嵌套表格。

#### 验收标准

1. WHEN 表格被成功检测到 THEN THE Detector SHALL 在表格上注入导出按钮
2. WHEN 表格容器使用 `position: static` THEN THE Detector SHALL 自动设置为 `position: relative` 以支持按钮定位
3. WHEN 表格已经有导出按钮 THEN THE Detector SHALL 跳过重复注入
4. WHEN 表格容器有多层嵌套 THEN THE Detector SHALL 将按钮注入到最外层可见容器
5. THE Export_Button SHALL 在表格左上角显示并在鼠标悬停时高亮

### 需求 6：可见性检查优化

**用户故事：** 作为用户，我希望系统只检测可见的表格，避免检测隐藏的或不可见的表格元素。

#### 验收标准

1. WHEN 表格的 `display` 属性为 `none` THEN THE Detector SHALL 跳过该表格
2. WHEN 表格的 `visibility` 属性为 `hidden` THEN THE Detector SHALL 跳过该表格
3. WHEN 表格的 `opacity` 属性为 `0` THEN THE Detector SHALL 跳过该表格
4. WHEN 表格的 `getBoundingClientRect()` 返回宽度和高度都为 0 THEN THE Detector SHALL 跳过该表格（非测试环境）
5. THE Visibility_Check SHALL 递归检查父元素的可见性直到 document.body

### 需求 7：表格数据提取增强

**用户故事：** 作为用户，我希望系统能够准确提取表格数据，包括空单元格、合并单元格和特殊字符。

#### 验收标准

1. WHEN 表格单元格为空 THEN THE Detector SHALL 在数据数组中保留空字符串占位
2. WHEN 表格单元格包含 `colspan` 或 `rowspan` 属性 THEN THE Detector SHALL 正确处理合并单元格的数据提取
3. WHEN 表格单元格包含特殊字符（如换行符、制表符）THEN THE Detector SHALL 保留或规范化这些字符
4. WHEN 表格单元格包含多个文本节点 THEN THE Detector SHALL 合并所有文本内容
5. THE Detector SHALL 去除单元格文本的首尾空白字符

### 需求 8：错误处理和降级策略

**用户故事：** 作为开发者，我希望系统在遇到异常表格结构时能够优雅降级，而不是完全失败。

#### 验收标准

1. WHEN 检测单个表格时发生错误 THEN THE Detector SHALL 记录错误并继续检测其他表格
2. WHEN 提取表格数据时发生错误 THEN THE Detector SHALL 返回 null 而不是抛出异常
3. WHEN 注入导出按钮时发生错误 THEN THE Detector SHALL 静默失败不影响页面功能
4. WHEN 扫描页面时发生致命错误 THEN THE Detector SHALL 返回空数组而不是崩溃
5. THE Detector SHALL 在控制台记录所有错误信息以便调试

### 需求 9：性能优化

**用户故事：** 作为用户，我希望表格检测功能不会显著影响页面性能和响应速度。

#### 验收标准

1. WHEN 页面包含大量 DOM 元素 THEN THE Detector SHALL 在 500ms 内完成扫描
2. WHEN 检测 Div 表格时 THEN THE Detector SHALL 使用可见性缓存避免重复计算
3. WHEN 页面包含超过 100 个候选元素 THEN THE Detector SHALL 优先检测最可能是表格的元素
4. WHEN 重复扫描页面 THEN THE Detector SHALL 复用已检测的表格信息
5. THE Detector SHALL 避免在检测过程中触发页面重排（reflow）

### 需求 10：配置灵活性

**用户故事：** 作为开发者，我希望能够配置表格检测的参数，以适应不同的使用场景。

#### 验收标准

1. THE Detector SHALL 支持配置最小行数阈值（默认为 1 以支持空表格）
2. THE Detector SHALL 支持配置最小列数阈值（默认为 2）
3. THE Detector SHALL 支持配置对齐阈值用于 Div 表格检测（默认为 5px）
4. THE Detector SHALL 支持配置网格间隙容差（默认为 10px）
5. WHERE 配置未提供 THEN THE Detector SHALL 使用默认配置值
