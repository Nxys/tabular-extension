# 任务列表：关键Bug修复

## 任务概述

本任务列表基于设计文档，将7个关键Bug的修复工作分解为可执行的任务。任务按照优先级和依赖关系排序。

## 任务分类

- **P0 - 关键**: 需求1、需求6
- **P1 - 重要**: 需求2、需求5
- **P2 - 一般**: 需求3、需求4、需求7

## 任务列表

### 1. 需求1：插件关闭状态下禁用表格检测

- [x] 1.1 修改 `scanAndInjectTableButtons` 方法检查插件状态
  - 在方法开头添加 `if (!this.settings.enabled) return;`
  - 文件：`src/content/index.ts`

- [x] 1.2 修改 `initialize` 方法检查插件状态
  - 只在插件启用时才扫描表格
  - 文件：`src/content/index.ts`

- [x] 1.3 修改 `applySettings` 方法处理状态变化
  - 插件禁用时移除所有导出按钮
  - 插件启用时扫描并注入按钮
  - 文件：`src/content/index.ts`

- [x] 1.4 编写单元测试
  - 测试插件禁用时不扫描表格
  - 测试插件禁用时移除已有按钮
  - 文件：`tests/unit/content/index.test.ts`

- [x] 1.5 编写集成测试
  - 测试插件禁用时表格检测不可用
  - 文件：`tests/integration/plugin-state.test.ts`

### 2. 需求2：重构高级清洗功能

- [x] 2.1 更新 `CleaningRules` 接口
  - 移除 `removeEmptyLines` 和 `mergeMultipleLines`
  - 保留 `mergeToSingleLine`、`customSeparator`、`removeDuplicates`
  - 文件：`src/background/cleaner.ts`、`src/shared/types.ts`

- [x] 2.2 重构 `advancedClean` 函数
  - 实现新的清洗逻辑
  - 支持 `mergeToSingleLine` + `customSeparator` 组合
  - 支持仅使用 `customSeparator`
  - 文件：`src/background/cleaner.ts`

- [x] 2.3 更新 `showCleaningDialog` 方法
  - 移除"去除空行"和"合并多行"选项
  - 移除互斥逻辑
  - 更新确认按钮的数据收集逻辑
  - 文件：`src/content/panel.ts`

- [x] 2.4 编写单元测试
  - 测试合并为一行 + 自定义分隔符
  - 测试仅使用自定义分隔符
  - 测试去重功能
  - 文件：`tests/unit/background/cleaner.test.ts`

- [x] 2.5 更新现有测试
  - 修改所有使用旧 `CleaningRules` 的测试
  - 确保测试覆盖率不降低

### 3. 需求3：修复面板框选问题

- [x] 3.1 定义z-index层级常量
  - 在 `src/shared/constants.ts` 中定义 `Z_INDEX` 常量
  - 定义：SELECTION_BOX=9998, PANEL=9999, DIALOG_OVERLAY=10000, DIALOG=10001
  - 文件：`src/shared/constants.ts`

- [x] 3.2 修改框选框使用正确的z-index
  - 在 `Selection.start()` 方法中设置 `z-index: Z_INDEX.SELECTION_BOX`
  - 文件：`src/content/selection.ts`

- [x] 3.3 修改面板使用正确的z-index
  - 在 `showResult()` 中设置面板 `z-index: Z_INDEX.PANEL`
  - 在 `showCleaningDialog()` 中设置遮罩层和弹窗的z-index
  - 在 `showExportDialog()` 中设置遮罩层和弹窗的z-index
  - 文件：`src/content/panel.ts`

- [x] 3.4 更新CSS确保z-index一致性
  - 为所有相关类添加z-index样式（使用 `!important`）
  - 文件：`src/content/content.css`

- [x] 3.5 确保面板显示时清除框选框
  - 在 `handleMouseUp()` 中，显示面板前调用 `this.selection.clear()`
  - 文件：`src/content/index.ts`

- [x] 3.6 确保Selection的clear方法正确移除框选框
  - 验证 `clear()` 方法正确调用 `this.box.remove()`
  - 文件：`src/content/selection.ts`

- [x] 3.7 遮罩层显示时禁用框选
  - 在 `showCleaningDialog()` 中为遮罩层添加 `pointer-events: auto`
  - 在 `showExportDialog()` 中为遮罩层添加 `pointer-events: auto`
  - 为遮罩层添加 `mousedown` 事件监听，阻止事件冒泡
  - 文件：`src/content/panel.ts`

- [x] 3.8 CSS中确保遮罩层阻止交互
  - 为遮罩层添加 `pointer-events: auto !important`
  - 为遮罩层添加 `user-select: none !important`
  - 文件：`src/content/content.css`

- [x] 3.9 编写单元测试
  - 测试框选框使用正确的z-index
  - 测试clear方法移除框选框
  - 文件：`tests/unit/content/selection.test.ts`

- [x] 3.10 编写集成测试
  - 测试面板在框选框之上
  - 测试弹窗在面板之上
  - 测试面板显示时不应该有框选框
  - 测试遮罩层显示时应该禁用框选
  - 文件：`tests/integration/panel-z-index.test.ts`

### 4. 需求4：Pro功能用尽后计数显示修复

- [x] 4.1 修改 `handleAdvancedClean` 返回最新计数
  - 在消耗试用次数后获取最新状态
  - 在 `uiData` 中返回 `trialRemaining`
  - 文件：`src/background/index.ts`

- [x] 4.2 修改 `handleTableExport` 返回最新计数
  - 在消耗试用次数后获取最新状态
  - 在 `uiData` 中返回 `trialRemaining`
  - 文件：`src/background/index.ts`

- [x] 4.3 修改 `showResult` 方法接收计数参数
  - 更新 `uiData` 类型定义
  - 将 `trialRemaining` 传递给按钮创建方法
  - 文件：`src/content/panel.ts`

- [x] 4.4 修改按钮创建方法显示计数
  - 更新 `createAdvancedCleanButton` 显示剩余次数
  - 更新 `createExportButton` 显示剩余次数
  - 次数为0时禁用按钮
  - 文件：`src/content/panel.ts`

- [x] 4.5 修改 `showTrialExhausted` 显示计数
  - 在消息中显示剩余次数（应该是0）
  - 文件：`src/content/panel.ts`

- [x] 4.6 编写单元测试
  - 测试消耗试用次数后返回最新计数
  - 测试试用次数为0时返回blocked状态
  - 文件：`tests/unit/background/advanced-clean-integration.test.ts`

- [x] 4.7 编写集成测试
  - 测试Pro功能用尽后显示正确计数
  - 测试按钮被禁用
  - 文件：`tests/integration/pro-trial-counter.test.ts`

### 5. 需求5：修复表格识别流程

- [x] 5.1 修改 `handleTableExport` 返回 `SHOW_EXPORT_DIALOG`
  - 检测到没有指定格式时返回 `SHOW_EXPORT_DIALOG`
  - 在 `uiData` 中提供文本和可用格式
  - 文件：`src/background/index.ts`

- [x] 5.2 修改表格导出按钮回调
  - 移除 `exportFormat` 参数
  - 只传递 `table` 数据
  - 文件：`src/content/index.ts`

- [ ] 5.3 确保导出对话框支持表格数据
  - 验证 `showExportDialog` 可以处理表格数据
  - 确保选择格式后正确调用 `table-export`
  - 文件：`src/content/panel.ts`

- [ ] 5.4 编写集成测试
  - 测试点击表格导出按钮直接显示导出格式选择
  - 测试选择格式后直接导出
  - 文件：`tests/integration/table-export-flow.test.ts`

### 6. 需求6：修复Excel导出格式

- [x] 6.1 修改 `toExcel` 函数使用制表符分隔
  - 将逗号分隔改为制表符分隔
  - 转义单元格中的制表符和换行符
  - 文件：`src/background/exporter.ts`

- [ ] 6.2 添加数据验证和日志
  - 在 `detectHTMLTable` 中添加日志
  - 在 `toCSV` 中添加日志
  - 验证数据结构正确
  - 文件：`src/content/detector.ts`、`src/background/exporter.ts`

- [ ] 6.3 编写单元测试
  - 测试正确导出多列数据
  - 测试正确处理特殊字符
  - 文件：`tests/unit/background/exporter.test.ts`

- [ ] 6.4 编写集成测试
  - 测试Excel导出包含多列
  - 验证下载的文件格式正确
  - 文件：`tests/integration/excel-export.test.ts`

### 7. 需求7：文本预览面板按钮状态管理

- [ ] 7.1 修改 `showResult` 方法检查内容
  - 检查 `uiData.text` 是否为空或仅包含空格
  - 根据内容状态设置 `hasContent` 标志
  - 文件：`src/content/panel.ts`

- [ ] 7.2 修改复制按钮支持禁用状态
  - 根据 `hasContent` 设置按钮 `disabled` 属性
  - 无内容时设置视觉反馈（opacity: 0.5, cursor: not-allowed）
  - 无内容时不响应点击事件
  - 文件：`src/content/panel.ts`

- [ ] 7.3 修改 `createAdvancedCleanButton` 支持内容检查
  - 添加 `hasContent` 参数
  - 结合 `trialRemaining` 和 `hasContent` 判断是否禁用
  - 文件：`src/content/panel.ts`

- [ ] 7.4 修改 `createExportButton` 支持内容检查
  - 添加 `hasContent` 参数
  - 结合 `trialRemaining` 和 `hasContent` 判断是否禁用
  - 文件：`src/content/panel.ts`

- [ ] 7.5 编写单元测试
  - 测试无内容时禁用所有按钮
  - 测试有内容时启用所有按钮
  - 测试仅包含空格时禁用按钮
  - 文件：`tests/unit/content/panel.test.ts`

- [ ] 7.6 编写集成测试
  - 测试空内容时按钮被禁用
  - 测试有内容时按钮可用
  - 文件：`tests/integration/panel-button-state.test.ts`

### 8. 代码质量和文档

- [ ] 8.1 运行所有测试确保通过
  - 运行 `npm test`
  - 确保覆盖率达标（Background ≥90%，Content ≥85%）

- [ ] 8.2 运行集成测试
  - 运行 `npm run test:integration`
  - 确保所有集成测试通过

- [ ] 8.3 运行类型检查
  - 运行 `getDiagnostics` 检查所有修改的文件
  - 修复所有类型错误

- [ ] 8.4 更新文档
  - 更新 CHANGELOG（如果有）
  - 更新相关的技术文档

## 执行顺序建议

### 阶段1：核心功能修复（P0）
1. 任务1：插件关闭状态下禁用表格检测
2. 任务6：修复Excel导出格式

### 阶段2：重要功能优化（P1）
3. 任务2：重构高级清洗功能
4. 任务5：修复表格识别流程

### 阶段3：体验改进（P2）
5. 任务3：修复面板框选问题
6. 任务4：Pro功能用尽后计数显示修复
7. 任务7：文本预览面板按钮状态管理

### 阶段4：质量保证
8. 任务8：代码质量和文档

## 注意事项

1. **架构约束**：严格遵守三层架构原则
   - Background：业务逻辑、状态管理
   - Content：UI交互、无业务判断
   - 通过消息协议通信

2. **测试优先**：每个任务完成后立即编写测试

3. **增量提交**：每完成一个子任务就提交代码

4. **向后兼容**：确保修改不破坏现有功能

5. **性能考虑**：注意不要引入性能问题

## 验收标准

- [ ] 所有单元测试通过，覆盖率达标
- [ ] 所有集成测试通过
- [ ] 无TypeScript类型错误
- [ ] 代码符合ESLint规范
- [ ] 所有7个Bug都已修复并验证
- [ ] 文档已更新
