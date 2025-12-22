# 实现计划：表格 Pro 功能

## 概述

本实现计划将表格 Pro 功能分解为离散的编码任务，按照以下顺序执行：
1. 核心表格算法模块（table/）
2. Pro 防护系统（pro/）
3. 主流程集成（content.ts）
4. UI 扩展（panel.ts）
5. 测试和验证

每个任务都是独立的、可验证的步骤，确保增量开发和早期验证。

## 任务

- [x] 1. 创建表格检测模块
  - 创建 `src/content/table/detect.ts` 文件
  - 实现 `TableCell` 和 `Table` 接口
  - 实现 `detectTable` 函数，包含 X 轴聚类算法
  - 处理边界情况（空输入、单列）
  - _需求：1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8_

- [x] 1.1 编写表格检测的属性测试
  - **Property 1: 表格列识别的正确性**
  - **验证：需求 1.4, 1.5, 1.6, 1.8**
  - 创建 `test/table-detect.property.test.ts`
  - 使用 fast-check 生成随机表格数据
  - 验证列数量识别正确
  - 验证单元格分配正确
  - 验证输入不变性
  - _需求：1.4, 1.5, 1.6, 1.8_

- [x] 1.2 编写表格检测的单元测试
  - 创建 `test/table-detect.test.ts`
  - 测试空输入处理
  - 测试单列表格
  - 测试多列表格（2-5 列）
  - 测试列对齐偏移容差
  - _需求：1.4, 1.5, 1.6_

- [x] 2. 创建列对齐模块
  - 创建 `src/content/table/align.ts` 文件
  - 实现字符显示宽度计算函数（处理中文）
  - 实现 `alignTable` 函数
  - 计算每列最大宽度
  - 生成空格补齐的二维字符串数组
  - _需求：2.1, 2.2, 2.3, 2.4, 2.8_

- [x] 2.1 编写列对齐的属性测试
  - **Property 2: 列对齐的一致性**
  - **验证：需求 2.4, 2.8**
  - 创建 `test/table-align.property.test.ts`
  - 使用 fast-check 生成包含中英文的随机表格
  - 验证每列宽度一致
  - 验证中文字符宽度计算正确（2 个字符）
  - _需求：2.4, 2.8_

- [x] 2.2 编写列对齐的单元测试
  - 创建 `test/table-align.test.ts`
  - 测试空表格处理
  - 测试纯 ASCII 文本对齐
  - 测试中文字符对齐
  - 测试混合中英文对齐
  - _需求：2.4, 2.8_

- [x] 3. 创建 CSV 导出模块
  - 创建 `src/content/table/csv.ts` 文件
  - 实现 CSV 字段转义函数
  - 实现 `toCSV` 函数
  - 处理引号、逗号、换行符转义
  - 遵循 RFC 4180 标准
  - _需求：3.1, 3.2, 3.3, 3.4, 3.5, 3.9_

- [x] 3.1 编写 CSV 导出的属性测试
  - **Property 3: CSV 转义的正确性**
  - **验证：需求 3.3, 3.4, 3.5**
  - 创建 `test/table-csv.property.test.ts`
  - 使用 fast-check 生成包含特殊字符的随机表格
  - 验证引号转义正确
  - 验证逗号处理正确
  - 验证换行符处理正确
  - _需求：3.3, 3.4, 3.5_

- [x] 3.2 编写 CSV 往返属性测试
  - **Property 5: CSV 往返一致性**
  - **验证：需求 3.9**
  - 在 `test/table-csv.property.test.ts` 中添加
  - 生成简单随机表格
  - 转换为 CSV 后解析回来
  - 验证结果与原表格等价
  - _需求：3.9_

- [x] 3.3 编写 CSV 导出的单元测试
  - 创建 `test/table-csv.test.ts`
  - 测试空表格处理
  - 测试简单文本导出
  - 测试引号转义
  - 测试逗号处理
  - 测试换行符处理
  - _需求：3.3, 3.4, 3.5_

- [x] 4. Checkpoint - 表格算法模块验证
  - 确保所有表格算法测试通过
  - 验证 table/ 模块不依赖其他业务模块
  - 询问用户是否有问题

- [x] 5. 创建 Pro 门控系统
  - 创建 `src/content/pro/gate.ts` 文件
  - 定义 `ProFeature` 类型
  - 定义 `ProState` 接口
  - 实现 `getProState` 函数（从 storage 读取）
  - 实现 `verifySignature` 函数（简化版本）
  - 实现 `verifyCallPath` 函数（调用栈检查）
  - 实现 `allow` 函数（多点判断）
  - _需求：4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.10, 4.12_

- [x] 5.1 编写 Pro 门控的单元测试
  - 创建 `test/pro-gate.test.ts`
  - 测试免费用户权限检查
  - 测试 Pro 用户权限检查
  - 测试功能独立性（Property 6）
  - 测试签名验证
  - 测试调用路径验证
  - _需求：4.4, 4.5, 4.6, 4.7_

- [x] 5.2 编写 Pro 门控的安全测试
  - 在 `test/pro-gate.test.ts` 中添加
  - 测试直接调用函数被拦截
  - 测试单点绕过无效
  - 测试签名篡改检测
  - _需求：4.10, 4.12_

- [x] 6. 创建 Pro 策略映射
  - 创建 `src/content/pro/strategy.ts` 文件
  - 定义 `ContentMode` 和 `PipelineType` 类型
  - 实现 `resolvePipeline` 函数
  - _需求：5.1, 5.2, 5.3, 5.4_

- [x] 6.1 编写策略映射的单元测试
  - 创建 `test/pro-strategy.test.ts`
  - 测试 text 模式映射到 free
  - 测试 table 模式映射到 pro
  - _需求：5.3, 5.4_

- [x] 7. Checkpoint - Pro 防护系统验证
  - 确保所有 Pro 门控测试通过
  - 验证多点防护机制有效
  - 询问用户是否有问题

- [x] 8. 扩展 Panel 组件
  - 修改 `src/content/panel.ts` 文件
  - 添加 `showAligned` 方法（显示对齐表格）
  - 添加 `enableCSVExport` 方法（显示 CSV 导出按钮）
  - 添加 `downloadCSV` 私有方法（触发文件下载）
  - 添加 `showProRequired` 方法（显示 Pro 升级提示）
  - 修改 `createElement` 方法支持 'pro-required' 类型
  - _需求：7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 8.1 编写 Panel 扩展的单元测试
  - 创建 `test/panel-pro.test.ts`
  - 测试 showAligned 方法
  - 测试 enableCSVExport 方法
  - 测试 downloadCSV 方法
  - 测试 showProRequired 方法
  - _需求：7.4, 7.5, 7.6, 7.7_

- [x] 9. 添加 Panel CSS 样式
  - 修改 `src/content/content.css` 文件
  - 添加表格模式样式（等宽字体）
  - 添加 CSV 导出按钮样式
  - 添加 Pro 升级提示样式
  - _需求：7.4, 7.5, 7.7_

- [x] 10. 集成 Pro Pipeline 到 Content.ts
  - 修改 `src/content/content.ts` 文件
  - 导入 table 和 pro 模块
  - 添加 `getUserSelectedMode` 方法（默认返回 'text'）
  - 添加 `handleProPipeline` 方法
  - 修改 `handleSelectionComplete` 方法集成 Pro pipeline
  - 实现多点权限检查流程
  - _需求：6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12_

- [x] 10.1 编写集成测试
  - 创建 `test/table-integration.test.ts`
  - 测试免费版用户尝试使用表格功能
  - 测试 Pro 用户使用表格功能
  - 测试完整 Pro pipeline 流程
  - 测试权限绕过尝试
  - _需求：6.1-6.12_

- [x] 11. Checkpoint - 集成验证
  - 确保所有集成测试通过
  - 验证 Pro pipeline 正确执行
  - 验证免费版功能不受影响
  - 询问用户是否有问题

- [ ] 12. 运行回归测试
  - 运行所有现有测试套件
  - 验证 free pipeline 行为不变
  - 验证 UI 和交互不变
  - 确保构建产物结构不变
  - _需求：9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 13. 生成测试覆盖率报告
  - 运行 `npm test -- --coverage`
  - 验证单元测试覆盖率 ≥ 90%
  - 验证核心算法属性测试覆盖率 100%
  - 生成覆盖率报告到 `test/coverage/`
  - _需求：11.9, 11.10_

- [ ] 14. 最终验证和文档
  - 验证所有需求已实现
  - 验证核心资产（collect/layout/format）未被修改
  - 验证构建成功
  - 更新 README（如需要）
  - _需求：8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

## 注意事项

- 所有任务都是必需的，确保从一开始就有全面的测试覆盖
- 每个任务都引用了具体的需求编号，便于追溯
- Checkpoint 任务确保增量验证
- 属性测试使用 fast-check 库，每个测试至少运行 100 次迭代
- 所有测试必须通过才能进入下一阶段

## 实现顺序说明

1. **先实现核心算法**（任务 1-4）：table/ 模块是 Pro 功能的核心价值
2. **再实现防护系统**（任务 5-7）：pro/ 模块保护核心算法
3. **然后集成到主流程**（任务 8-11）：content.ts 和 panel.ts 集成
4. **最后验证和测试**（任务 12-14）：确保质量和兼容性

这个顺序确保：
- 核心算法可以独立开发和测试
- 防护系统可以独立验证
- 集成时核心模块已经稳定
- 最后的回归测试确保不破坏现有功能


## Usage 模块语义升级任务（追加）

- [ ] 15. 重构 Usage 模块为行为信号记录器
  - 修改 `src/content/usage/usage.ts` 文件
  - 新增 `UsageEvent` 类型定义（'select', 'table-detect', 'column-align', 'csv-export'）
  - 新增 `UsageStats` 接口定义
  - 实现 `record(event: UsageEvent)` 函数（记录事件，不阻断流程）
  - 实现 `getRecentStats()` 函数（返回事件统计）
  - 标记 `checkUsage` 和 `consumeUsage` 为 deprecated（保留用于兼容）
  - _需求：13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 14.1, 14.2, 14.3_

- [ ] 15.1 编写 Usage 升级的单元测试
  - 创建 `test/usage-upgrade.test.ts`
  - 测试 record 函数记录各种事件
  - 测试 getRecentStats 返回正确的统计
  - 测试跨天重置功能
  - 测试 record 不抛出异常（Property 9）
  - 测试事件计数独立性（Property 8）
  - _需求：14.4, 14.5, 14.6, 14.7, 14.9_

- [ ] 15.2 编写 Usage 兼容性测试
  - 在 `test/usage-upgrade.test.ts` 中添加
  - 测试 checkUsage 仍然工作（deprecated）
  - 测试 consumeUsage 仍然工作（deprecated）
  - 测试免费版功能不受影响
  - 测试未触发 Pro 功能时无副作用
  - _需求：13.7, 13.8, 16.1, 16.2, 16.3_

- [ ] 16. 扩展 Storage 模块支持事件统计
  - 修改 `src/content/usage/storage.ts` 文件
  - 新增 `USAGE_STATS` 存储键
  - 实现 `saveStats(stats: UsageStats)` 函数
  - 实现 `getStats()` 函数
  - 修改 `resetIfNewDay` 函数支持重置事件统计
  - 保留原有的 `USAGE_COUNT` 和 `LAST_USAGE_DATE`（兼容性）
  - _需求：14.4, 14.5, 14.10_

- [ ] 16.1 编写 Storage 扩展的单元测试
  - 修改 `test/storage.test.ts` 文件
  - 测试 saveStats 和 getStats 函数
  - 测试跨天重置包含事件统计
  - 测试 storage 失败时的降级处理
  - _需求：14.4, 14.5, 14.10_

- [ ] 17. 集成 Usage 信号到 Pro Gate
  - 修改 `src/content/pro/gate.ts` 文件
  - 导入 `getRecentStats` 函数
  - 在 `allow` 函数中调用 `getRecentStats()` 获取行为信号
  - 实现 `verifyUsagePattern` 函数（检测异常使用模式）
  - 将 usage 信号作为判断条件之一（不是唯一条件）
  - 确保多点防护机制仍然有效
  - _需求：15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

- [ ] 17.1 编写 Pro Gate 集成 Usage 的测试
  - 创建 `test/pro-gate-usage.test.ts`
  - 测试 allow 函数使用 usage 信号
  - 测试异常使用模式检测
  - 测试绕过 usage 信号无效（Property 10）
  - 测试多点防护仍然有效
  - 测试 usage 不是唯一判断条件
  - _需求：15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 18. 在 Content.ts 中记录 Usage 事件
  - 修改 `src/content/content.ts` 文件
  - 导入 `record` 函数
  - 在 `handleSelectionComplete` 中记录 'select' 事件
  - 在 `handleProPipeline` 中记录 'table-detect' 事件
  - 在列对齐时记录 'column-align' 事件
  - 在 CSV 导出时记录 'csv-export' 事件
  - 保留 `checkUsage` 调用（用于免费版限制）
  - _需求：14.4, 14.7, 16.1_

- [ ] 18.1 编写 Content.ts Usage 集成测试
  - 修改 `test/content-integration.test.ts` 文件
  - 测试选择时记录 'select' 事件
  - 测试 Pro 功能时记录对应事件
  - 测试事件记录不阻断流程
  - 测试免费版功能不受影响
  - _需求：14.4, 14.7, 16.1, 16.2_

- [ ] 19. Checkpoint - Usage 升级验证
  - 确保所有 Usage 升级测试通过
  - 验证 usage 不再是单点限制器
  - 验证即使绕过 usage，也无法完整解锁 Pro 能力
  - 验证 usage → gate → feature 的关系为"信号 → 判断 → 执行"
  - 验证 collect / layout / format 仍完全无 usage 痕迹
  - 验证免费版功能完全不受影响
  - 询问用户是否有问题

- [ ] 20. 运行完整回归测试（包含 Usage 升级）
  - 运行所有现有测试套件
  - 验证免费版功能不受影响
  - 验证 Pro 功能正常工作
  - 验证多点防护机制有效
  - 验证构建产物结构不变
  - _需求：16.8, 16.9, 16.10_

- [ ] 21. 更新测试覆盖率报告（包含 Usage 模块）
  - 运行 `npm test -- --coverage`
  - 验证 usage 模块覆盖率 ≥ 90%
  - 验证 pro/gate 模块覆盖率 ≥ 90%
  - 验证整体覆盖率不低于现有水平
  - 生成最终覆盖率报告
  - _需求：11.9, 11.10_

## 实现顺序说明（更新）

**原有顺序（任务 1-14）：**
1. 核心算法模块（table/）
2. Pro 防护系统（pro/）
3. 主流程集成（content.ts + panel.ts）
4. 测试和验证

**追加顺序（任务 15-21）：**
5. **Usage 模块升级**（任务 15-16）：将 usage 从限制器升级为信号记录器
6. **Pro Gate 集成 Usage**（任务 17）：使用 usage 信号作为判断条件之一
7. **Content.ts 记录事件**（任务 18）：在关键点记录 usage 事件
8. **最终验证**（任务 19-21）：确保升级不影响现有功能

**为什么这个顺序：**
- Usage 升级是独立的模块重构，可以在 Pro 功能之后进行
- Pro Gate 需要先实现基础功能，再集成 usage 信号
- Content.ts 集成是最后一步，确保所有模块都已就绪
- 最终验证确保整个系统的一致性和兼容性
