# 需求文档：表格 Pro 功能

## 简介

本需求文档定义了浏览器框选复制插件的第三版核心功能：**表格列识别、视觉列对齐、CSV 导出和强 Pro 限制系统**。

这是在第二版重构基础上的**增量功能开发**，核心目标是：
- 引入真正值得付费的表格识别能力
- 通过多点分散的 Pro 限制保护核心算法价值
- 保持免费版基础文本功能完全可用
- 确保核心算法资产（collect / layout / format）不被污染

当前架构状态：
```
collect → layout → format  （第二版核心资产，不可修改）
usage 限制逻辑（流程层）
```

第三版目标：
```
新增 table pipeline（Pro 专属）
新增 pro gate 系统（多点防护）
免费版保持不变
```

## 术语表

- **Table（表格）**: 基于视觉对齐识别出的列结构数据，不依赖 DOM table 元素
- **Column（列）**: 通过 X 轴位置聚类识别出的垂直对齐文本组
- **Table Detection（表格检测）**: 从视觉行结构中推导列结构的核心算法
- **Column Alignment（列对齐）**: 将表格数据按列补齐空格，生成视觉对齐的文本
- **CSV Export（CSV 导出）**: 将表格数据转换为标准 CSV 格式
- **Pro Feature（Pro 功能）**: 需要付费才能使用的高级功能
- **Pro Gate（Pro 门控）**: 多点分散的能力限制系统，防止绕过
- **Pipeline（管道）**: 数据处理流程，分为 free pipeline 和 pro pipeline
- **Free Pipeline（免费管道）**: collect → layout → format，输出纯文本
- **Pro Pipeline（Pro 管道）**: collect → layout → table → align/csv，输出表格数据
- **Core Asset（核心资产）**: collect / layout / format 三个模块，不可污染

## 需求

### 需求 1：表格列识别（核心算法）

**用户故事：** 作为 Pro 用户，我希望系统能够自动识别视觉上对齐的列结构，即使不是 HTML table 元素也能识别，以便我可以获得结构化的表格数据。

#### 验收标准

1. THE System SHALL 创建 `content/table/detect.ts` 模块
2. THE `detect.ts` SHALL 导出 `Table` 接口，包含 `columns: number` 和 `rows: Array<Array<{ text: string; col: number }>>`
3. THE `detect.ts` SHALL 导出 `detectTable` 函数，接受 `lines: TextItem[][]` 参数，返回 `Table`
4. WHEN 执行 detectTable 时，THE System SHALL 基于 X 轴位置进行聚类分析
5. WHEN 进行聚类时，THE System SHALL 自动合并接近的 X 中心点为同一列
6. WHEN 识别列时，THE System SHALL 动态决定列数量，不依赖预设值
7. THE detectTable 函数 SHALL NOT 依赖 DOM 元素类型（table/tr/td）
8. THE detectTable 函数 SHALL NOT 修改输入的 lines 数据
9. THE detectTable 函数 SHALL 能够识别非 HTML table 的视觉表格
10. THE System SHALL 将表格检测作为 Pro 核心算法价值点

### 需求 2：视觉列对齐

**用户故事：** 作为 Pro 用户，我希望识别出的表格能够按列对齐显示，每列使用空格补齐，以便我可以直观地查看表格结构。

#### 验收标准

1. THE System SHALL 创建 `content/table/align.ts` 模块
2. THE `align.ts` SHALL 导出 `alignTable` 函数，接受 `table: Table` 参数，返回 `string[][]`
3. WHEN 执行 alignTable 时，THE System SHALL 计算每列的最大字符宽度
4. WHEN 对齐列时，THE System SHALL 使用空格补齐到最大宽度
5. THE alignTable 函数 SHALL 生成二维字符串矩阵
6. THE alignTable 函数 SHALL NOT 负责 CSV 格式转换
7. THE alignTable 函数 SHALL NOT 负责下载或保存文件
8. THE alignTable 函数 SHALL 处理中文字符宽度（按 2 个字符计算）
9. THE System SHALL 确保对齐后的文本可直接用于预览显示

### 需求 3：CSV 导出

**用户故事：** 作为 Pro 用户，我希望能够将识别出的表格导出为标准 CSV 格式，以便我可以在 Excel 或其他工具中使用。

#### 验收标准

1. THE System SHALL 创建 `content/table/csv.ts` 模块
2. THE `csv.ts` SHALL 导出 `toCSV` 函数，接受 `table: Table` 参数，返回 `string`
3. WHEN 执行 toCSV 时，THE System SHALL 自动处理字段中的引号（双引号转义）
4. WHEN 执行 toCSV 时，THE System SHALL 自动处理字段中的逗号（使用引号包裹）
5. WHEN 执行 toCSV 时，THE System SHALL 自动处理字段中的换行符（使用引号包裹）
6. THE toCSV 函数 SHALL 生成 UTF-8 编码的 CSV 字符串
7. THE toCSV 函数 SHALL NOT 负责文件下载
8. THE toCSV 函数 SHALL NOT 负责文件保存
9. THE toCSV 函数 SHALL 遵循 RFC 4180 CSV 标准
10. THE System SHALL 确保生成的 CSV 可被 Excel 正确打开

### 需求 4：Pro 能力门控系统（核心防护）

**用户故事：** 作为产品负责人，我希望 Pro 功能有多点分散的限制机制，不能通过简单的布尔值绕过，以保护核心算法价值。

#### 验收标准

1. THE System SHALL 创建 `content/pro/gate.ts` 模块
2. THE `gate.ts` SHALL 导出 `ProFeature` 类型，包含 `'table-detect'`、`'column-align'`、`'csv-export'` 三个字面量
3. THE `gate.ts` SHALL 导出 `allow` 函数，接受 `feature: ProFeature` 参数，返回 `boolean`
4. WHEN 执行 allow 函数时，THE System SHALL 对每个 feature 单独判断
5. WHEN 判断权限时，THE System SHALL 结合 usage 状态
6. WHEN 判断权限时，THE System SHALL 结合本地签名（简单 hash）
7. WHEN 判断权限时，THE System SHALL 结合执行路径校验
8. THE allow 函数 SHALL NOT 使用单一的 isPro 布尔变量
9. THE System SHALL NOT 仅在 UI 层判断 Pro 权限
10. THE System SHALL 确保直接调用 table/csv 函数无法绕过 gate
11. THE System SHALL 在多个执行步骤中分散权限检查
12. THE System SHALL 确保单点绕过无法解锁完整能力

### 需求 5：Pro 策略映射

**用户故事：** 作为开发者，我希望有清晰的策略映射机制，根据内容类型自动选择 free 或 pro pipeline。

#### 验收标准

1. THE System SHALL 创建 `content/pro/strategy.ts` 模块
2. THE `strategy.ts` SHALL 导出 `resolvePipeline` 函数，接受 `mode: 'text' | 'table'` 参数，返回 `'free' | 'pro'`
3. WHEN mode 为 'text' 时，THE System SHALL 返回 'free'
4. WHEN mode 为 'table' 时，THE System SHALL 返回 'pro'
5. THE resolvePipeline 函数 SHALL NOT 直接判断用户权限
6. THE resolvePipeline 函数 SHALL 只负责策略映射
7. THE System SHALL 确保普通文本始终使用 free pipeline
8. THE System SHALL 确保表格/CSV 功能强制使用 pro pipeline

### 需求 6：Content.ts 执行流程集成

**用户故事：** 作为开发者，我希望在主流程中集成 Pro pipeline，同时保持免费版功能不受影响。

#### 验收标准

1. WHEN 提取文本时，THE System SHALL 首先执行 `collect` 和 `layout`
2. WHEN 检测到表格模式时，THE System SHALL 调用 `resolvePipeline('table')`
3. IF resolvePipeline 返回 'pro'，THE System SHALL 检查 `allow('table-detect')`
4. IF allow 返回 false，THE System SHALL 调用 `panel.showProRequired()`
5. IF allow 返回 true，THE System SHALL 执行 `detectTable(lines)`
6. WHEN 表格检测成功后，THE System SHALL 检查 `allow('column-align')`
7. IF column-align 允许，THE System SHALL 调用 `panel.showAligned(alignTable(table))`
8. WHEN 需要 CSV 时，THE System SHALL 检查 `allow('csv-export')`
9. IF csv-export 允许，THE System SHALL 调用 `panel.enableCSVExport(toCSV(table))`
10. IF resolvePipeline 返回 'free'，THE System SHALL 执行原有的 `format(lines)` 流程
11. THE System SHALL 确保 Pro 判断分散在多个步骤中
12. THE System SHALL 确保免费版流程完全不受影响

### 需求 7：Panel 组件扩展

**用户故事：** 作为用户，我希望 Panel 能够展示表格对齐结果和提供 CSV 导出功能，同时保持原有文本展示功能。

#### 验收标准

1. THE Panel 组件 SHALL 新增 `showAligned` 方法，接受 `table: string[][]` 参数
2. THE Panel 组件 SHALL 新增 `enableCSVExport` 方法，接受 `csv: string` 参数
3. THE Panel 组件 SHALL 新增 `showProRequired` 方法，无参数
4. WHEN 调用 showAligned 时，THE System SHALL 显示对齐后的表格文本
5. WHEN 调用 enableCSVExport 时，THE System SHALL 显示 CSV 导出按钮
6. WHEN 点击 CSV 导出按钮时，THE System SHALL 触发文件下载
7. WHEN 调用 showProRequired 时，THE System SHALL 显示 Pro 升级提示
8. THE Panel 组件 SHALL NOT 替代原有的 `show` 方法
9. THE Panel 组件 SHALL 保持原有的所有功能（编辑、拖动、复制、关闭）
10. THE System SHALL 确保免费版用户看不到 Pro 功能按钮

### 需求 8：核心资产保护

**用户故事：** 作为架构负责人，我希望核心算法模块（collect / layout / format）保持纯净，不被 Pro 功能污染。

#### 验收标准

1. THE System SHALL NOT 在 `collect.ts` 中添加任何表格相关代码
2. THE System SHALL NOT 在 `layout.ts` 中添加任何表格相关代码
3. THE System SHALL NOT 在 `format.ts` 中添加任何表格相关代码
4. THE System SHALL NOT 在 `extractor/index.ts` 中添加表格相关导出
5. THE System SHALL 确保 collect / layout / format 的职责和接口保持不变
6. THE System SHALL 确保 Pro 功能以独立模块形式存在
7. THE System SHALL 确保 table 模块只依赖 layout 的输出，不修改其行为
8. THE System SHALL 确保构建产物结构不变

### 需求 9：免费版功能保持不变

**用户故事：** 作为免费版用户，我希望所有原有功能继续正常工作，不受 Pro 功能影响。

#### 验收标准

1. WHEN 免费版用户使用插件时，THE System SHALL 提供与第二版完全相同的功能
2. THE System SHALL 保持相同的文本提取结果
3. THE System SHALL 保持相同的 UI 外观（不显示 Pro 功能）
4. THE System SHALL 保持相同的交互行为
5. THE System SHALL 保持相同的快捷键
6. THE System SHALL 保持相同的性能表现
7. THE System SHALL NOT 在免费版中显示表格相关功能
8. THE System SHALL NOT 在免费版中显示 CSV 导出按钮
9. THE System SHALL 确保免费版用户体验不受干扰

### 需求 10：Pro 功能触发机制

**用户故事：** 作为产品经理，我希望有明确的机制判断何时应该使用 Pro pipeline，而不是所有内容都尝试表格识别。

#### 验收标准

1. THE System SHALL 提供表格检测的启发式规则
2. WHEN 选择区域包含明显的列对齐特征时，THE System SHALL 建议使用表格模式
3. WHEN 用户主动选择表格模式时，THE System SHALL 使用 Pro pipeline
4. THE System SHALL 提供 UI 开关让用户选择文本模式或表格模式
5. THE System SHALL 默认使用文本模式（免费版兼容）
6. THE System SHALL 在检测到表格特征时显示提示（仅 Pro 用户）
7. THE System SHALL NOT 强制所有内容都进行表格识别
8. THE System SHALL 确保用户可以手动切换模式

### 需求 11：测试策略

**用户故事：** 作为开发者，我希望有完善的测试覆盖 Pro 功能，确保表格识别和 Pro 限制的正确性。

#### 验收标准

1. THE System SHALL 为 `detectTable` 函数编写单元测试
2. THE System SHALL 为 `alignTable` 函数编写单元测试
3. THE System SHALL 为 `toCSV` 函数编写单元测试
4. THE System SHALL 为 `allow` 函数编写单元测试
5. THE System SHALL 为 `resolvePipeline` 函数编写单元测试
6. THE System SHALL 编写集成测试验证完整的 Pro pipeline
7. THE System SHALL 编写测试验证 Pro 限制无法被绕过
8. THE System SHALL 编写测试验证免费版功能不受影响
9. THE System SHALL 确保所有测试通过
10. THE System SHALL 确保测试覆盖率不低于现有水平

### 需求 12：禁止事项

**用户故事：** 作为项目负责人，我希望第三版严格限制在表格 Pro 功能范围内，不做无关改动。

#### 验收标准

1. THE System SHALL NOT 修改 collect / layout / format 的任何代码
2. THE System SHALL NOT 修改 usage 模块的现有逻辑
3. THE System SHALL NOT 在 UI 层单独控制 Pro 能力
4. THE System SHALL NOT 使用单一 isPro 变量解决所有问题
5. THE System SHALL NOT 引入网络请求
6. THE System SHALL NOT 引入支付功能
7. THE System SHALL NOT 引入 OCR 功能
8. THE System SHALL NOT 修改免费版的任何行为
9. THE System SHALL NOT 引入第三方依赖
10. THE System SHALL NOT 修改构建配置（除非必要）


### 需求 13：Usage 模块语义升级（行为信号记录器）

**用户故事：** 作为架构负责人，我希望将 usage 模块从"限制器"升级为"行为信号记录器"，使其成为 Pro gate 判断的信号源之一，而不是直接阻断流程的单点限制器。

#### 验收标准

1. THE System SHALL 保留 usage 模块的 storage 和日期重置逻辑
2. THE System SHALL 移除或弱化 usage 模块中的 `allowed / denied` 直接决策接口
3. THE usage 模块 SHALL NOT 直接阻断任何流程
4. THE usage 模块 SHALL 转变为行为信号记录器（signal source）
5. THE System SHALL 确保 usage 只记录发生过什么，不判断是否合法
6. THE System SHALL 确保 usage 不涉及 UI 交互
7. THE System SHALL 保持对第二版行为的兼容性
8. THE System SHALL 确保免费用户的基础文本复制行为不受影响

### 需求 14：Usage 事件级记录能力

**用户故事：** 作为开发者，我希望 usage 模块能够记录用户的行为事件，为 Pro gate 提供判断依据。

#### 验收标准

1. THE System SHALL 在 usage 模块中新增 `record` 函数，接受 `event: UsageEvent` 参数
2. THE System SHALL 在 usage 模块中新增 `getRecentStats` 函数，返回最近的行为统计
3. THE `UsageEvent` 类型 SHALL 至少包含 `'select'`、`'table-detect'`、`'column-align'`、`'csv-export'` 四种事件
4. WHEN 调用 record 函数时，THE System SHALL 记录事件到 storage
5. WHEN 调用 getRecentStats 函数时，THE System SHALL 返回最近的事件统计数据
6. THE record 函数 SHALL NOT 判断事件是否合法
7. THE record 函数 SHALL NOT 阻断任何流程
8. THE getRecentStats 函数 SHALL NOT 涉及 UI 交互
9. THE System SHALL 确保事件记录不影响性能
10. THE System SHALL 确保事件记录支持跨天重置

### 需求 15：Pro Gate 使用 Usage 作为信号输入

**用户故事：** 作为开发者，我希望 Pro gate 能够使用 usage 提供的行为信号作为判断条件之一，而不是唯一条件。

#### 验收标准

1. WHEN Pro gate 执行 allow 判断时，THE System SHALL 调用 `usage.getRecentStats()` 获取行为信号
2. THE Pro gate SHALL 将 usage 信号作为判断条件之一
3. THE Pro gate SHALL NOT 将 usage 作为唯一判断条件
4. THE Pro gate SHALL 结合执行路径、本地签名和 usage 信号进行综合判断
5. THE System SHALL 确保即使绕过 usage，也无法完整解锁 Pro 能力
6. THE System SHALL 确保 usage → gate → feature 的关系为"信号 → 判断 → 执行"
7. THE System SHALL NOT 引入新的全局 isPro 布尔变量
8. THE System SHALL 确保多点防护机制仍然有效

### 需求 16：Usage 升级的兼容性保证

**用户故事：** 作为用户，我希望 usage 模块的升级不影响现有功能和用户体验。

#### 验收标准

1. WHEN 未触发表格/CSV 能力时，THE System SHALL 确保 usage 行为不产生副作用
2. THE System SHALL 确保免费用户的基础文本复制行为完全不受影响
3. THE System SHALL NOT 引入新的弹窗或提示
4. THE System SHALL NOT 引入新的使用统计 UI
5. THE System SHALL NOT 引入新的限制规则
6. THE System SHALL NOT 引入远程校验
7. THE System SHALL NOT 引入新的权限概念
8. THE System SHALL 确保 collect / layout / format 仍完全无 usage 痕迹
9. THE System SHALL 确保构建产物结构不变
10. THE System SHALL 确保所有现有测试仍然通过
