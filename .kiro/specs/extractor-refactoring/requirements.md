# 需求文档：Extractor 重构

## 简介

本需求文档定义了浏览器框选复制插件（Browser Selection Copy）的代码重构需求。这是一个**纯重构项目**，目标是在保持所有现有功能和行为完全不变的前提下，重新组织代码结构，为未来的 V2 版本（可变现、可扩展）做准备。

当前问题不是功能缺失，而是代码结构不利于演进：
- 文本提取逻辑职责过重
- 视觉算法与 UI/流程耦合
- 算法模块难以作为长期资产演进

## 术语表

- **Extractor（文本提取器）**: 负责从选择区域提取文本并按视觉顺序排列的核心模块
- **BrowserSelectionCopy（主控制器）**: 组合所有组件并管理完整用户操作流程的主类
- **Selection（选择框组件）**: 处理鼠标交互，创建和管理选择框 UI 的组件
- **Panel（结果面板）**: 显示提取结果和提供复制功能的浮动面板组件
- **TextItem**: 包含文本内容和位置信息的数据结构
- **视觉行（Visual Line）**: 根据视觉位置（Y 坐标）分组的文本元素集合
- **Pipeline（管道）**: 按顺序执行的数据处理流程
- **DOM**: Document Object Model，文档对象模型
- **ClientRect**: 元素在视口中的位置和尺寸信息

## 需求

### 需求 1：Extractor 三段式 Pipeline 重构

**用户故事：** 作为开发者，我希望将 Extractor 拆分为清晰的三段式 pipeline，以便每个阶段的职责单一且易于维护和测试。

#### 验收标准

1. THE System SHALL 创建新的目录结构 `content/extractor/`，包含 `collect.ts`、`layout.ts`、`format.ts` 和 `index.ts` 四个文件
2. WHEN 重构完成后，THE System SHALL 删除原有的 `content/extractor.ts` 文件
3. THE `index.ts` SHALL 作为 Extractor 模块的唯一对外接口
4. THE System SHALL 确保所有现有测试在重构后仍然通过
5. THE System SHALL 确保构建产物结构保持不变（仍输出单一 content.js）

### 需求 2：Collect 模块 - 事实采集

**用户故事：** 作为开发者，我希望有一个专门负责事实采集的模块，只做 DOM 遍历和数据收集，不包含任何业务逻辑。

#### 验收标准

1. THE `collect.ts` SHALL 导出 `TextItem` 接口，包含 `text: string` 和 `rect: DOMRect` 两个字段
2. THE `collect.ts` SHALL 导出 `collect` 函数，接受 `selectionRect: DOMRect` 参数，返回 `TextItem[]`
3. WHEN 执行 collect 函数时，THE System SHALL 遍历 DOM TextNode
4. WHEN 遍历 DOM 时，THE System SHALL 调用 `getClientRects` 获取元素位置信息
5. WHEN 处理文本节点时，THE System SHALL 过滤不可见文本（display: none, visibility: hidden, opacity: 0）
6. WHEN 处理矩形区域时，THE System SHALL 过滤不在选择矩形内的 rect
7. THE `collect` 函数 SHALL NOT 执行排序操作
8. THE `collect` 函数 SHALL NOT 执行行合并操作
9. THE `collect` 函数 SHALL NOT 执行文本拼接操作
10. THE `collect` 函数 SHALL NOT 包含任何视觉判断逻辑

### 需求 3：Layout 模块 - 视觉行分组

**用户故事：** 作为开发者，我希望有一个专门负责视觉行分组的模块，将文本元素按视觉位置组织成二维结构，这是插件的核心技术护城河。

#### 验收标准

1. THE `layout.ts` SHALL 导出 `LayoutOptions` 接口，包含 `lineThresholdRatio: number` 和 `minHorizontalGap: number` 两个字段
2. THE `layout.ts` SHALL 导出 `layout` 函数，接受 `items: TextItem[]` 和 `options: LayoutOptions` 参数，返回 `TextItem[][]`
3. WHEN 执行 layout 函数时，THE System SHALL 使用现有的视觉行算法
4. THE layout 函数 SHALL 将所有魔法数字（如 LINE_TOLERANCE = 5）转换为显式参数
5. THE layout 函数 SHALL 按 Y 坐标将 TextItem 分组为视觉行
6. THE layout 函数 SHALL 在每个视觉行内按 X 坐标排序
7. THE layout 函数 SHALL 在行间按 Y 坐标排序
8. THE layout 函数 SHALL NOT 改变现有算法的行为
9. THE layout 函数 SHALL NOT 执行文本拼接操作

### 需求 4：Format 模块 - 文本格式化

**用户故事：** 作为开发者，我希望有一个专门负责文本格式化的模块，将视觉行结构转换为最终可复制的文本。

#### 验收标准

1. THE `format.ts` SHALL 导出 `format` 函数，接受 `lines: TextItem[][]` 参数，返回 `string`
2. WHEN 执行 format 函数时，THE System SHALL 在行内根据水平间距判断是否插入空格
3. WHEN 执行 format 函数时，THE System SHALL 在行间插入换行符
4. THE format 函数 SHALL 产生与当前版本完全一致的输出
5. THE format 函数 SHALL 包含现有的所有防护措施（元素数量限制、文本长度限制等）
6. THE format 函数 SHALL 处理边界情况（空数组、过长文本等）

### 需求 5：Extractor Index 模块 - 统一接口

**用户故事：** 作为开发者，我希望 Extractor 模块有一个清晰的对外接口，隐藏内部实现细节。

#### 验收标准

1. THE `index.ts` SHALL 导出 `extractText` 函数作为唯一对外接口
2. THE `extractText` 函数 SHALL 接受 `selectionRect: DOMRect` 和 `options: LayoutOptions` 参数，返回 `string`
3. WHEN 执行 extractText 函数时，THE System SHALL 严格按照 `collect → layout → format` 的顺序执行
4. THE `index.ts` SHALL 重新导出 `TextItem` 和 `LayoutOptions` 类型供外部使用
5. THE System SHALL NOT 允许外部直接导入 `collect.ts`、`layout.ts` 或 `format.ts`

### 需求 6：BrowserSelectionCopy 职责收敛

**用户故事：** 作为开发者，我希望主控制器只负责流程编排，不包含算法细节，以提高代码的可维护性。

#### 验收标准

1. THE `content.ts` SHALL 移除所有 DOM 遍历相关代码
2. THE `content.ts` SHALL 移除所有 rect 处理相关代码
3. THE `content.ts` SHALL 移除所有排序相关代码
4. THE `content.ts` SHALL 移除所有文本拼接相关代码
5. WHEN 需要提取文本时，THE `content.ts` SHALL 通过调用 `extractText` 函数获取最终文本
6. THE `content.ts` SHALL 保留插件启停状态管理
7. THE `content.ts` SHALL 保留快捷键处理
8. THE `content.ts` SHALL 保留 storage 读写操作
9. THE `content.ts` SHALL 保留 Selection 和 Panel 生命周期管理

### 需求 7：Panel 组件职责纯化

**用户故事：** 作为开发者，我希望 Panel 组件只负责展示结果，不介入任何业务决策。

#### 验收标准

1. THE Panel 组件 SHALL 统一对外接口为 `show({ text: string })`
2. THE Panel 组件 SHALL NOT 判断是否允许使用插件
3. THE Panel 组件 SHALL NOT 判断试用或 Pro 状态
4. THE Panel 组件 SHALL NOT 介入任何算法决策
5. THE Panel 组件 SHALL NOT 介入任何业务决策
6. THE Panel 组件 SHALL 保留所有现有的 UI 功能（编辑、拖动、复制、关闭）

### 需求 8：Selection 组件职责纯化

**用户故事：** 作为开发者，我希望 Selection 组件保持完全无业务语义，只提供纯粹的选择框功能。

#### 验收标准

1. THE Selection 组件 SHALL 保持当前的接口不变
2. THE Selection 组件 SHALL NOT 访问 storage
3. THE Selection 组件 SHALL NOT 引用 panel
4. THE Selection 组件 SHALL NOT 引用 extractor
5. THE Selection 组件 SHALL NOT 判断插件状态
6. THE Selection 组件 SHALL 只负责选择框的创建、更新和销毁

### 需求 9：测试与构建保持不变

**用户故事：** 作为开发者，我希望重构不影响现有的测试和构建流程。

#### 验收标准

1. THE System SHALL NOT 新增测试文件
2. THE System SHALL NOT 删除测试文件
3. WHEN import 路径变化时，THE System SHALL 相应调整测试代码
4. WHEN 重构完成后，THE System SHALL 确保所有测试通过
5. THE System SHALL 确保构建产物结构保持不变（仍输出单一 content.js）
6. THE System SHALL 确保 manifest.json 保持不变
7. THE System SHALL 确保不引入第三方依赖

### 需求 10：功能行为完全一致

**用户故事：** 作为用户，我希望重构后的插件功能和行为与重构前完全一致。

#### 验收标准

1. WHEN 用户使用插件时，THE System SHALL 提供与重构前完全相同的功能
2. THE System SHALL 保持相同的 UI 外观
3. THE System SHALL 保持相同的交互行为
4. THE System SHALL 保持相同的快捷键
5. THE System SHALL 保持相同的配置选项
6. THE System SHALL 保持相同的文本提取结果
7. THE System SHALL 保持相同的错误处理行为
8. THE System SHALL NOT 修改 README 描述的任何行为

### 需求 11：禁止事项

**用户故事：** 作为项目负责人，我希望重构严格限制在结构调整范围内，不做任何功能性改动。

#### 验收标准

1. THE System SHALL NOT "顺手优化"算法
2. THE System SHALL NOT 改变 UI、交互或文案
3. THE System SHALL NOT 引入第三方依赖
4. THE System SHALL NOT 修改 manifest 权限
5. THE System SHALL NOT 改变 README 描述的行为
6. THE System SHALL NOT 添加新功能
7. THE System SHALL NOT 删除现有功能
