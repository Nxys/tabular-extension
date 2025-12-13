# 需求文档

## 介绍

浏览器框选复制插件是一个 Chrome 扩展程序，允许用户通过鼠标拖拽创建矩形选择框，智能提取选择区域内的文本，并按视觉呈现顺序重新组织为可复制的纯文本格式。该插件专注于提供简洁高效的文本提取体验，无需网络权限，所有操作在本地完成。

## 术语表

- **Selection_Box**: 用户通过鼠标拖拽在页面上创建的矩形选择区域
- **Visual_Text_Extractor**: 负责从选择区域提取和排序文本的核心组件
- **Result_Panel**: 显示提取结果和复制功能的浮动面板
- **Chrome_Extension**: 基于 Manifest v3 的浏览器扩展程序
- **Client_Rects**: DOM 元素的屏幕位置信息，通过 getClientRects API 获取
- **Visual_Order**: 按照从上到下、从左到右的视觉阅读顺序

## 需求

### 需求 1

**用户故事:** 作为网页用户，我希望能够通过鼠标拖拽创建选择框，以便精确选择我想要复制的页面区域。

#### 验收标准

1. WHEN 用户在页面上按下鼠标左键并拖拽 THEN Selection_Box SHALL 显示一个可视的矩形选择框
2. WHILE 用户拖拽鼠标 THEN Selection_Box SHALL 实时更新矩形框的大小和位置
3. WHEN 用户释放鼠标按钮 THEN Selection_Box SHALL 完成选择区域的定义
4. WHEN 选择框创建完成 THEN Selection_Box SHALL 触发文本提取流程
5. WHEN 用户点击页面其他区域 THEN Selection_Box SHALL 清除当前选择框

### 需求 2

**用户故事:** 作为网页用户，我希望插件能够准确识别选择框内的所有文本元素，以便获取完整的内容。

#### 验收标准

1. WHEN 选择框确定后 THEN Visual_Text_Extractor SHALL 检测矩形区域内所有可见的文本元素
2. WHEN 检测文本元素 THEN Visual_Text_Extractor SHALL 使用 getClientRects API 获取每个文本的精确屏幕位置
3. WHEN 文本元素部分位于选择框内 THEN Visual_Text_Extractor SHALL 包含该文本元素
4. WHEN 文本元素完全位于选择框外 THEN Visual_Text_Extractor SHALL 排除该文本元素
5. WHEN 文本元素不可见（display:none 或 visibility:hidden）THEN Visual_Text_Extractor SHALL 忽略该元素

### 需求 3

**用户故事:** 作为网页用户，我希望提取的文本按照视觉阅读顺序排列，以便获得符合阅读习惯的文本格式。

#### 验收标准

1. WHEN 处理提取的文本 THEN Visual_Text_Extractor SHALL 按照从上到下的顺序排序文本行
2. WHEN 文本位于同一视觉行 THEN Visual_Text_Extractor SHALL 按照从左到右的顺序排列文本
3. WHEN 确定文本行归属 THEN Visual_Text_Extractor SHALL 基于文本的垂直位置进行行分组
4. WHEN 生成最终文本 THEN Visual_Text_Extractor SHALL 在不同视觉行之间插入换行符
5. WHEN 合并同行文本 THEN Visual_Text_Extractor SHALL 在文本片段之间保留适当的空格

### 需求 4

**用户故事:** 作为网页用户，我希望看到提取结果并能够方便地复制文本，以便在其他应用中使用。

#### 验收标准

1. WHEN 文本提取完成 THEN Result_Panel SHALL 在页面右上角显示结果面板
2. WHEN 显示结果面板 THEN Result_Panel SHALL 包含提取的文本预览和复制按钮
3. WHEN 用户点击复制按钮 THEN Result_Panel SHALL 将文本复制到系统剪贴板
4. WHEN 复制操作完成 THEN Result_Panel SHALL 显示复制成功的反馈信息
5. WHEN 用户点击面板外区域 THEN Result_Panel SHALL 隐藏结果面板

### 需求 5

**用户故事:** 作为 Chrome 用户，我希望插件能够安全可靠地运行，以便在任何网站上使用而不影响浏览器性能。

#### 验收标准

1. WHEN 插件安装 THEN Chrome_Extension SHALL 使用 Manifest v3 规范
2. WHEN 插件运行 THEN Chrome_Extension SHALL 不请求 host 权限
3. WHEN 执行文本提取 THEN Chrome_Extension SHALL 仅在本地处理数据，不发送网络请求
4. WHEN 插件激活 THEN Chrome_Extension SHALL 不依赖任何外部库或框架
5. WHEN 处理页面内容 THEN Chrome_Extension SHALL 不修改原始页面结构或样式

### 需求 6

**用户故事:** 作为开发者，我希望代码结构清晰且易于维护，以便后续功能扩展和问题排查。

#### 验收标准

1. WHEN 编写代码注释 THEN Chrome_Extension SHALL 使用中文注释说明功能逻辑
2. WHEN 实现视觉文本提取算法 THEN Chrome_Extension SHALL 在关键位置添加详细注释标注
3. WHEN 定义变量和函数 THEN Chrome_Extension SHALL 使用英文命名但提供中文注释说明
4. WHEN 组织代码结构 THEN Chrome_Extension SHALL 保持模块化和职责分离
5. WHEN 处理错误情况 THEN Chrome_Extension SHALL 提供适当的错误处理和用户反馈