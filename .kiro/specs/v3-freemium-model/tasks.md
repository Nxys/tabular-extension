# Implementation Plan: V3 Freemium Model

## Overview

本实现计划将第三版 Free + Pro 双轨制变现模型分解为可执行的编码任务。实现将严格遵守现有三层架构约束，所有业务逻辑在 Background 层，Content 层只负责 UI 渲染。

## Tasks

- [x] 1. 重构 Usage 模块为无语义状态管理
  - **完全移除**原有的线性计数实现（包括 INITIAL_TRIAL_COUNT、consumeTrial 等）
  - 移除原有的"每日 20 次"统一限制逻辑
  - 实现每项高级能力的无语义状态存储（FeatureState: seed, entropy, timestamp）
  - 实现状态初始化函数（initializeTrials）：生成随机 seed 和 entropy
  - 实现非线性派生函数（deriveAllowed）：多步哈希计算，返回 boolean
  - 实现派生视图函数（deriveRemaining）：仅供 UI 显示，不参与授权
  - 实现状态演化函数（evolveState）：单调性保护，只能变差
  - 实现多因子授权函数（authorize）：多因子折叠，返回 boolean
  - 重构接口：checkTrial（返回派生结果）、evolveTrial（演化状态）、getAllTrials（返回所有派生结果）
  - **禁止**：不得使用 ++、--、+=、-=
  - **禁止**：不得存储 quota、used、remain、count 等直接次数值
  - **禁止**：不得使用常量 3 或任何表示"初始次数"的值
  - _Requirements: 1.1, 1.2, 1.4, 1.6, 9.1, 9.2, 9.3, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13, 9.14_

- [x] 1.1 编写试用状态管理的单元测试
  - 测试状态初始化生成随机 seed 和 entropy（不是固定值 3）
  - 测试状态演化的单调性（演化后 deriveAllowed 不会变好）
  - 测试派生函数的多步计算（至少 3 步哈希运算）
  - 测试授权判断的多因子折叠（至少 3 个因子）
  - 测试修改计算常量（如 0x9e3779b9）导致派生结果失效
  - 测试 UI 视图值（deriveRemaining）不影响授权判断（authorize）
  - 测试存储中不包含 quota/used/remain/count 等关键字
  - _Requirements: 9.1, 9.2, 9.3, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13, 9.14_

- [x] 1.2 编写状态演化独立性的属性测试
  - **Property 3: 试用次数独立递减**（改为：状态演化独立性）
  - 测试演化一个功能的状态不影响其他功能的状态
  - 测试状态演化的单调性（对于任意状态，演化后 allowed 不会从 false 变 true）
  - **Validates: Requirements 1.4, 3.8, 4.6, 7.9, 9.1, 9.3, 9.12**

- [x] 2. 验证状态派生安全性
  - 验证存储中不包含直接次数值（quota、used、remain）
  - 验证 key 和 value 都是无语义的（state、entropy、seed）
  - 验证所有可用性和剩余次数都是派生值
  - 验证修改计算常量导致派生结果失效或变小
  - 验证状态演化的单调性（只能不变或变差）
  - 验证 UI 视图值不参与授权判断
  - _Requirements: 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13, 9.14_

- [x] 2.1 编写状态派生安全性的单元测试
  - 测试存储数据无语义（不包含 quota/used/remain）
  - 测试派生计算的非线性特性
  - 测试单调性保护（状态只能变差）
  - 测试修改常量导致额度失效
  - 测试 UI 视图值与授权判断分离
  - _Requirements: 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13_

- [x] 2.2 编写试用状态派生安全性的属性测试
  - **Property 7: 试用状态派生安全性**
  - **Validates: Requirements 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13, 9.14**

- [x] 3. 实现行数限制逻辑
  - 在 Background 层实现 applyRowLimit 函数
  - Free 用户限制为 5 行
  - Pro 用户不限制
  - 在 handleTextExtract 中应用行数限制
  - 生成行数限制提示文案
  - _Requirements: 1.3, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 3.1 编写行数限制的单元测试
  - 测试 Free 用户被限制为 5 行
  - 测试 Pro 用户不受限制
  - 测试行数限制提示文案生成
  - _Requirements: 1.3, 2.2, 2.3, 2.4, 2.5_

- [x] 3.2 编写 Free 用户行数限制一致性的属性测试
  - **Property 1: Free 用户行数限制一致性**
  - **Validates: Requirements 1.3, 2.2, 2.3, 2.4**

- [ ]* 3.3 编写行数限制提示可见性的属性测试
  - **Property 9: 行数限制提示可见性**
  - **Validates: Requirements 2.5, 7.2**

- [-] 4. 完善 Pro 权限验证模块
  - 实现 isPro、verifyPro、updateProState 接口
  - 当前阶段：简化实现，通过本地标志判断
  - Pro 用户解除所有限制
  - _Requirements: 1.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]* 4.1 编写 Pro 权限验证的单元测试
  - 测试 Pro 用户标志判断
  - 测试 Pro 用户解除行数限制
  - 测试 Pro 用户不消耗试用次数
  - _Requirements: 1.5, 11.3, 11.4_

- [x] 4.2 编写 Pro 用户无限制访问的属性测试
  - **Property 2: Pro 用户无限制访问**
  - **Validates: Requirements 1.5, 2.6, 3.10, 4.8, 5.5, 9.6**

- [x] 5. Checkpoint - 确保核心限制逻辑测试通过
  - 确保所有测试通过，如有问题请询问用户

- [x] 6. 实现数据清洗模块
  - 创建 src/background/cleaner.ts
  - 实现 basicClean 函数（基础清洗）
  - 实现 advancedClean 函数（高级清洗）
  - 支持 6 种清洗规则：去空行、合并多行、自定义分隔符、合并为一行、去重
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 10.1, 10.2, 10.3_

- [x] 6.1 编写数据清洗的单元测试
  - 测试基础清洗功能
  - 测试每种高级清洗规则
  - 测试清洗规则组合
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ]* 6.2 编写清洗规则去空行正确性的属性测试
  - **Property 11: 清洗规则去空行正确性**
  - **Validates: Requirements 3.2, 3.7**

- [ ]* 6.3 编写清洗规则去重正确性的属性测试
  - **Property 12: 清洗规则去重正确性**
  - **Validates: Requirements 3.6, 3.7**

- [x] 6.4 编写清洗规则应用一致性的属性测试
  - **Property 4: 清洗规则应用一致性**
  - **Validates: Requirements 3.7, 7.8, 10.1, 10.2, 10.4**

- [x] 7. 实现数据导出模块
  - 创建 src/background/exporter.ts
  - 实现 exportData 函数（支持 CSV 和 Excel）
  - 实现 toCSV 函数（遵循 RFC 4180）
  - 实现 toExcel 函数（使用 SheetJS）
  - 支持应用清洗规则
  - _Requirements: 5.6, 5.7, 5.8, 10.2_

- [ ]* 7.1 编写数据导出的单元测试
  - 测试 CSV 导出格式
  - 测试 Excel 导出格式
  - 测试导出时应用清洗规则
  - _Requirements: 5.6, 5.7, 10.2_

- [x] 7.2 编写导出格式正确性的属性测试
  - **Property 6: 导出格式正确性（round-trip）**
  - **Validates: Requirements 5.6, 5.7**

- [x] 8. 实现表格识别模块
  - 创建 src/content/detector.ts
  - 实现 scanTables 函数（扫描页面所有表格）
  - 实现 detectHTMLTable 函数（识别 `<table>` 元素）
  - 实现 detectDivTable 函数（识别 div/span 实现的表格）
  - 实现表格识别算法（网格状布局、行列对齐、重复结构）
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 8.1 编写表格识别的单元测试
  - 测试识别标准 `<table>` 元素
  - 测试识别 div 实现的表格
  - 测试最小行列数过滤
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 8.2 编写表格识别完整性的属性测试
  - **Property 5: 表格识别完整性**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 9. 实现表格导出按钮注入
  - 在 detector.ts 中实现 injectExportButton 函数
  - 在表格左上角注入导出按钮（绝对定位）
  - 按钮样式：小图标，hover 显示提示
  - 实现 removeExportButtons 函数
  - 根据试用次数决定是否注入按钮
  - _Requirements: 4.4, 4.5, 4.6, 4.7_

- [ ]* 9.1 编写表格导出按钮注入的单元测试
  - 测试按钮注入位置正确
  - 测试按钮样式和交互
  - 测试试用次数用尽时不注入
  - _Requirements: 4.4, 4.5, 4.7_

- [ ]* 9.2 编写表格导出按钮注入正确性的属性测试
  - **Property 10: 表格导出按钮注入正确性**
  - **Validates: Requirements 4.4, 4.7**

- [x] 10. Checkpoint - 确保表格识别和导出测试通过
  - 确保所有测试通过，如有问题请询问用户

- [x] 11. 扩展预览窗口 UI
  - 在 src/content/panel.ts 中添加【导出】按钮
  - 添加【高级清洗（Pro）】按钮
  - 添加行数限制提示显示逻辑
  - 实现导出格式选择弹窗
  - 实现高级清洗规则选择弹窗
  - _Requirements: 7.2, 7.4, 7.5, 7.6, 7.7_

- [ ]* 11.1 编写预览窗口 UI 的单元测试
  - 测试导出按钮存在
  - 测试高级清洗按钮存在
  - 测试行数限制提示显示
  - 测试格式选择弹窗
  - 测试清洗规则选择弹窗
  - _Requirements: 7.2, 7.4, 7.5, 7.6, 7.7_

- [x] 12. 集成高级清洗到复制和导出操作
  - 在 Background 层处理 advanced-clean Action
  - 在复制操作中应用清洗规则
  - 在导出操作中应用清洗规则
  - 消耗试用次数
  - 生成相应的 uiAction 和 uiData
  - _Requirements: 3.7, 3.8, 3.9, 7.8, 7.9, 7.10, 7.11, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 12.1 编写高级清洗集成的单元测试
  - 测试复制操作应用清洗规则
  - 测试导出操作应用清洗规则
  - 测试消耗试用次数
  - 测试试用次数用尽后的行为
  - _Requirements: 3.7, 3.8, 3.9, 7.8, 7.9, 7.10_

- [x] 13. 集成表格导出功能
  - 在 Background 层处理 table-export Action
  - 提取表格完整数据
  - 应用清洗规则（如果选择）
  - 转换为选定格式（CSV 或 Excel）
  - 消耗试用次数
  - Free 用户有试用次数时不受 5 行限制
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 13.1 编写表格导出集成的单元测试
  - 测试表格数据提取
  - 测试格式转换
  - 测试 Free 用户有试用次数时不受 5 行限制
  - 测试试用次数用尽后的行为
  - _Requirements: 5.1, 5.3, 5.4_

- [x] 14. 重新设计 Popup 界面
  - 修改 src/popup/popup.html
  - 添加 Free 和 Pro 能力简述
  - 添加当前版本信息显示
  - 添加剩余试用次数显示
  - 添加升级 Pro 按钮
  - 修改 src/popup/popup.ts 以加载和显示试用次数
  - _Requirements: 6.4, 6.5, 6.6, 6.7, 9.5_

- [ ]* 14.1 编写 Popup 界面的单元测试
  - 测试能力简述显示
  - 测试版本信息显示
  - 测试试用次数显示
  - 测试升级按钮存在
  - _Requirements: 6.4, 6.5, 6.6, 6.7, 9.5_

- [x] 15. 实现升级提示触发逻辑
  - 在 Background 层实现升级提示决策
  - 仅在试用次数为 0 且尝试使用高级能力时触发
  - 不在打开插件时触发
  - 不在未点击高级能力时触发
  - 生成包含权益说明的提示文案
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 15.1 编写升级提示触发的单元测试
  - 测试试用次数为 0 时触发
  - 测试打开插件时不触发
  - 测试未点击高级能力时不触发
  - 测试提示包含权益说明
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 15.2 编写升级提示触发精确性的属性测试
  - **Property 8: 升级提示触发精确性**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [x] 16. Checkpoint - 确保所有 UI 和集成测试通过
  - 确保所有测试通过，如有问题请询问用户

- [x] 17. 扩展消息协议
  - 在 src/shared/types.ts 中添加新的 ActionType
  - 添加 'advanced-clean'、'table-export'、'check-trial'
  - 添加新的 UIAction
  - 添加 'SHOW_CLEANING_DIALOG'、'SHOW_EXPORT_DIALOG'、'SHOW_TRIAL_EXHAUSTED'
  - 扩展 UIData 接口
  - 添加 rowLimit、totalRows、isLimited、trialRemaining、cleaningRules、exportFormats 字段
  - _Requirements: 设计文档 - Data Models_

- [ ]* 17.1 编写消息协议的单元测试
  - 测试新增的 ActionType
  - 测试新增的 UIAction
  - 测试扩展的 UIData 字段
  - _Requirements: 设计文档 - Data Models_

- [x] 18. 更新 Background 消息处理
  - 在 src/background/index.ts 中添加新 Action 的处理
  - 处理 'advanced-clean' Action
  - 处理 'table-export' Action
  - 处理 'check-trial' Action
  - 集成试用次数检查和消耗
  - 集成行数限制逻辑
  - _Requirements: 设计文档 - Components and Interfaces_

- [ ]* 18.1 编写 Background 消息处理的单元测试
  - 测试新 Action 的处理逻辑
  - 测试试用次数检查和消耗
  - 测试行数限制应用
  - _Requirements: 设计文档 - Components and Interfaces_

- [x] 19. 更新 Content 消息发送和 UI 渲染
  - 在 src/content/index.ts 中发送新的 Action 请求
  - 根据新的 uiAction 渲染对应 UI
  - 调用 panel.ts 中的新方法
  - _Requirements: 设计文档 - Components and Interfaces_

- [ ]* 19.1 编写 Content 消息和 UI 的单元测试
  - 测试新 Action 请求发送
  - 测试新 uiAction 的 UI 渲染
  - _Requirements: 设计文档 - Components and Interfaces_

- [x] 20. 实现错误处理
  - 在各模块中添加 try-catch 错误捕获
  - 实现加密失败的降级策略
  - 实现表格识别失败的静默处理
  - 实现导出失败的降级方案
  - 实现 Pro 权限验证失败的默认处理
  - 实现清洗规则应用异常的降级
  - _Requirements: 设计文档 - Error Handling_

- [ ]* 20.1 编写错误处理的单元测试
  - 测试加密失败降级
  - 测试表格识别异常处理
  - 测试导出失败降级
  - 测试 Pro 权限验证失败
  - 测试清洗规则异常降级
  - _Requirements: 设计文档 - Error Handling_

- [x] 21. 编写架构守门测试
  - 测试 Content 层不 import Background 层文件
  - 测试 Content 层不直接访问 chrome.storage
  - 测试 Content 层不包含业务逻辑关键字
  - 测试 Background 层生成所有业务文案
  - 测试所有跨层类型定义在 Shared 层
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10_

- [x] 21.1 编写架构约束遵守的属性测试
  - **Property 13: 架构约束遵守**
  - **Validates: Requirements 12.1-12.10**

- [x] 22. 集成测试
  - 编写端到端用户流程测试
  - 测试 Free 用户完整流程
  - 测试 Free 用户试用高级清洗流程
  - 测试 Pro 用户完整流程
  - 测试表格识别流程
  - 测试权限切换流程
  - _Requirements: 设计文档 - Testing Strategy_

- [x] 23. 最终 Checkpoint - 运行所有测试
  - 运行架构守门测试
  - 运行所有单元测试
  - 运行所有属性测试（100+ 迭代）
  - 运行所有集成测试
  - 生成覆盖率报告
  - 确保覆盖率达标（Background ≥ 90%, Content ≥ 85%）
  - 确保所有测试通过，如有问题请询问用户

## Notes

- 任务标记 `*` 的为可选任务，可根据需要跳过以加快 MVP 开发
- **关键测试已设为必需**（不带 `*` 标记），包括：
  - 试用状态管理测试（1.1, 1.2）
  - 状态派生安全性测试（2.1, 2.2）
  - 行数限制测试（3.1, 3.2）
  - Pro 权限验证测试（4.2）
  - 数据清洗测试（6.1, 6.4）
  - 数据导出测试（7.2）
  - 表格识别测试（8.2）
  - 架构守门测试（21, 21.1）
- **强制安全约束（必须满足）：**
  1. 禁止使用线性计数（++、--、+=、-=）
  2. 禁止存储直接次数值（quota、used、remain）
  3. 只维护无语义状态（state、entropy、seed）
  4. 所有可用性和剩余次数必须通过非线性计算派生
  5. 修改计算常量或运算符必须导致额度失效或变小
  6. 状态演化必须具备单调性（只能不变或变差）
  7. UI 显示的次数仅为派生视图值，不参与授权判断
  8. 授权判断必须由多因子输入、多步骤计算后折叠得到
  9. 不使用标准加密算法（AES、RSA 等）
  10. 所有核心逻辑仅存在于 background 层
- 每个任务都引用了具体的需求编号，确保可追溯性
- Checkpoint 任务用于确保增量验证，及时发现问题
- 属性测试标注了对应的设计属性编号和验证的需求
- 单元测试和属性测试互补，共同确保代码质量
- 所有业务逻辑在 Background 层，Content 层只负责 UI 渲染
- 严格遵守现有架构约束，通过架构守门测试强制执行
