# 实现计划：集成测试重构

## 概述

本实现计划将集成测试重构分解为增量步骤，每个步骤都构建在前一步的基础上。实现将按照以下顺序进行：测试辅助工具完善 → 测试固件扩展 → Pro 功能测试 → 消息协议测试 → 基础功能测试重构 → 用户交互测试重构 → 错误处理测试重构。

## 任务

- [x] 1. 完善测试辅助工具（Test Helpers）
  - 扩展 extension-helper.ts
  - 创建 message-spy.ts
  - 创建 storage-helper.ts
  - _需求：8.1-8.5_

- [x] 1.1 扩展 ExtensionHelper - 框选操作
  - 在 `test/integration/helpers/extension-helper.ts` 中添加 dragSelection() 函数
  - 实现鼠标按下、移动、释放的模拟
  - 支持指定起点和终点坐标
  - _需求：8.1_

- [x] 1.2 扩展 ExtensionHelper - 面板操作
  - 添加 waitForResultPanel() 函数（等待面板显示）
  - 添加 getPanelTableData() 函数（获取表格数据）
  - 添加 hasUpgradePrompt() 函数（检查升级提示）
  - 添加 getRowLimitInfo() 函数（获取行数限制信息）
  - _需求：8.2_

- [x] 1.3 创建 MessageSpy 类
  - 创建 `test/integration/helpers/message-spy.ts`
  - 实现 start() 方法（开始监听消息）
  - 实现 stop() 方法（停止监听）
  - 实现 getMessages() 方法（获取所有消息）
  - 实现 getLastRequest() 方法（获取最后的 REQUEST_ACTION）
  - 实现 getLastResult() 方法（获取最后的 ACTION_RESULT）
  - 实现 waitForMessage() 方法（等待特定消息）
  - 实现 clear() 方法（清空消息记录）
  - _需求：8.5_

- [x] 1.4 创建 StorageHelper 工具函数
  - 创建 `test/integration/helpers/storage-helper.ts`
  - 实现 setProUser() 函数（设置为 Pro 用户）
  - 实现 setFreeUser() 函数（设置为 Free 用户）
  - 实现 setTrialCount() 函数（设置试用次数）
  - 实现 getTrialCount() 函数（获取试用次数）
  - 实现 clearStorage() 函数（清空所有数据）
  - 实现 getStorageData() 函数（获取完整数据）
  - _需求：8.3, 8.4_

- [x] 2. 扩展测试固件（Test Fixtures）
  - 扩展 test-pages.ts
  - 创建 test-data.ts
  - _需求：9.1-9.5_

- [x] 2.1 扩展 TestPages - 特殊字符页面
  - 在 `test/integration/fixtures/test-pages.ts` 中添加 generateSpecialCharPage() 函数
  - 支持 HTML 实体、Unicode、Emoji
  - 支持可选参数控制包含哪些特殊字符
  - _需求：9.3_

- [x] 2.2 扩展 TestPages - 大型表格页面
  - 添加 generateLargeTablePage() 函数
  - 支持指定行数和列数
  - 生成包含测试数据的表格
  - _需求：9.2_

- [x] 2.3 扩展 TestPages - 边界情况页面
  - 添加 generateEmptyPage() 函数（空白页面）
  - 添加 generateDynamicPage() 函数（动态内容页面）
  - 添加 generateIframePage() 函数（包含 iframe）
  - 添加 generateShadowDOMPage() 函数（包含 Shadow DOM）
  - _需求：9.4_

- [x] 2.4 创建 TestData 数据生成器
  - 创建 `test/integration/fixtures/test-data.ts`
  - 实现 generateRandomTableData() 函数（随机表格数据）
  - 实现 generateSpecialCharTableData() 函数（特殊字符表格）
  - 实现 generateOverLimitTableData() 函数（超过限制的表格）
  - _需求：9.2_

- [x] 3. 实现 Pro 功能测试套件
  - 测试行数限制
  - 测试试用次数管理
  - 测试升级提示
  - _需求：4.1-4.5_

- [x] 3.1 创建 Pro 功能测试文件
  - 创建 `test/integration/pro-features.test.ts`
  - 配置测试环境（beforeEach 清空 storage）
  - _需求：4.1-4.5_

- [x] 3.2 测试 Free 用户行数限制
  - 测试提取超过 5 行应只返回前 5 行
  - 测试应显示升级提示
  - 使用 setFreeUser() 和 getRowLimitInfo()
  - _需求：4.1_

- [x] 3.3 测试 Pro 用户无限制
  - 测试提取超过 5 行应返回所有数据
  - 测试不显示升级提示
  - 使用 setProUser() 和 getRowLimitInfo()
  - _需求：4.2_

- [x] 3.4 测试 Free 用户试用次数消耗
  - 测试使用高级清洗功能应递减试用次数
  - 使用 setTrialCount() 和 getTrialCount()
  - _需求：4.3_

- [x] 3.5 测试试用次数为 0 的行为
  - 测试应显示升级提示
  - 测试应阻止操作
  - _需求：4.4_

- [x] 3.6 测试 Pro 用户试用次数不变
  - 测试使用高级功能不消耗试用次数
  - _需求：4.5_

- [x] 3.7 测试升级提示内容
  - 测试升级提示包含正确文案
  - 测试升级提示包含正确链接
  - 使用 hasUpgradePrompt()
  - _需求：4.1, 4.4_

- [x] 4. 实现消息通信协议测试套件
  - 测试 REQUEST_ACTION 消息
  - 测试 ACTION_RESULT 消息
  - 测试 UI 响应
  - _需求：6.1-6.5_

- [x] 4.1 创建消息协议测试文件
  - 创建 `test/integration/message-protocol.test.ts`
  - 配置 MessageSpy 监听
  - _需求：6.1-6.5_

- [x] 4.2 测试 REQUEST_ACTION 消息格式
  - 测试 Content 发送的消息包含正确的 action
  - 使用 MessageSpy.getLastRequest()
  - _需求：6.1_

- [x] 4.3 测试 ACTION_RESULT 消息格式
  - 测试 Background 返回的消息包含 status 和 uiAction
  - 使用 MessageSpy.getLastResult()
  - _需求：6.2_

- [x] 4.4 测试 status 为 ok 的 UI 响应
  - 测试 Content 执行对应的 uiAction
  - 测试 UI 正确更新
  - _需求：6.3_

- [x] 4.5 测试 status 为 limited 的 UI 响应
  - 测试显示限制提示
  - 测试不消耗试用次数
  - _需求：6.4_

- [x] 4.6 测试 status 为 blocked 的 UI 响应
  - 测试显示升级提示
  - 测试阻止操作
  - _需求：6.4_

- [x] 4.7 测试异常兜底机制
  - 测试 Background 异常时返回兜底 ACTION_RESULT
  - 测试 Content 显示错误信息
  - _需求：6.5_

- [x] 4.8 测试 uiData 由 Background 生成
  - 测试 message 字段由 Background 生成
  - 测试 Content 不自行拼装文案
  - _需求：6.3_

- [-] 5. 重构基础功能测试套件
  - 重构文本提取测试
  - 重构表格检测测试
  - 重构数据导出测试
  - _需求：1.1-1.5, 2.1-2.5, 3.1-3.5_
  - 注意：basic-functionality.test.ts 已存在，需要根据新的辅助函数和测试固件进行重构

- [-] 5.1 重构简单文本提取测试
  - 更新 `test/integration/basic-functionality.test.ts`
  - 使用新的 dragSelection() 和 waitForResultPanel()
  - 测试提取的文本与原始文本一致
  - _需求：1.1_

- [ ] 5.2 重构多行文本提取测试
  - 测试保留换行符和格式
  - _需求：1.2_

- [ ] 5.3 重构特殊字符提取测试
  - 使用 generateSpecialCharPage()
  - 测试 HTML 实体、Unicode、Emoji 正确解码
  - _需求：1.3_

- [ ] 5.4 重构空白区域测试
  - 使用 generateEmptyPage()
  - 测试返回空结果或提示
  - _需求：1.4_

- [ ] 5.5 重构嵌套标签提取测试
  - 测试去除所有 HTML 标签
  - _需求：1.5_

- [ ] 5.6 重构简单表格检测测试
  - 测试 2x2 表格正确识别
  - 使用 getPanelTableData() 验证数据
  - _需求：2.1_

- [ ] 5.7 重构复杂表格检测测试
  - 测试合并单元格处理
  - _需求：2.2_

- [ ] 5.8 重构嵌套表格检测测试
  - 测试内外层表格提取
  - _需求：2.3_

- [ ] 5.9 重构表头识别测试
  - 测试表头正确标记
  - _需求：2.4_

- [ ] 5.10 重构非表格内容测试
  - 测试不误判为表格
  - _需求：2.5_

- [ ] 5.11 重构 CSV 导出测试
  - 测试 CSV 格式正确
  - 测试特殊字符转义
  - _需求：3.1, 3.3_

- [ ] 5.12 重构 Excel 导出测试
  - 测试 Excel 格式正确
  - _需求：3.2_

- [ ] 5.13 重构空数据导出测试
  - 测试错误提示或空文件
  - _需求：3.4_

- [ ] 5.14 重构大量数据导出测试
  - 使用 generateLargeTablePage()
  - 测试不超时或崩溃
  - _需求：3.5_

- [ ] 6. 重构用户交互测试套件
  - 重构框选交互测试
  - 重构面板交互测试
  - 重构连续操作测试
  - _需求：5.1-5.5_
  - 注意：user-interactions.test.ts 已存在，需要根据新的辅助函数进行重构

- [ ] 6.1 重构 Selection_Box 跟随测试
  - 更新 `test/integration/user-interactions.test.ts`
  - 使用 dragSelection() 模拟拖动
  - 测试 Selection_Box 实时跟随
  - _需求：5.1_

- [ ] 6.2 重构 Result_Panel 显示测试
  - 测试释放鼠标后面板自动显示
  - 使用 waitForResultPanel()
  - _需求：5.2_

- [ ] 6.3 重构面板关闭测试
  - 测试点击关闭按钮
  - 测试面板消失且 Selection_Box 清除
  - _需求：5.3_

- [ ] 6.4 重构快捷键测试
  - 测试 Ctrl+Shift+X 触发功能
  - _需求：5.4_

- [ ] 6.5 重构连续操作测试
  - 测试多次框选操作不相互干扰
  - 使用 clearStorage() 确保隔离
  - _需求：5.5_

- [ ] 7. 重构错误处理测试套件
  - 重构边界情况测试
  - 重构容错测试
  - _需求：7.1-7.5_
  - 注意：error-handling.test.ts 已存在，需要根据新的辅助函数进行重构

- [ ] 7.1 重构格式错误 HTML 测试
  - 更新 `test/integration/error-handling.test.ts`
  - 测试插件不崩溃
  - 测试返回合理结果
  - _需求：7.1_

- [ ] 7.2 重构超大区域测试
  - 测试超过 10000 个元素
  - 测试能处理或返回警告
  - _需求：7.2_

- [ ] 7.3 重构 storage 损坏测试
  - 使用 getStorageData() 和 clearStorage()
  - 测试使用默认值
  - 测试核心功能不受影响
  - _需求：7.3_

- [ ] 7.4 重构网络请求失败测试
  - 测试显示错误提示
  - 测试允许重试
  - _需求：7.4_

- [ ] 7.5 重构页面未加载测试
  - 测试等待页面就绪或显示提示
  - _需求：7.5_

- [ ] 8. 编写属性测试（Property-Based Tests）
  - 实现 15 个属性测试
  - 使用 fast-check 生成随机数据
  - 每个属性至少 100 次迭代
  - _需求：所有需求_

- [ ] 8.1 编写属性测试 1：文本提取正确性
  - 创建 `test/integration/properties/text-extraction.property.test.ts`
  - 使用 fc.string() 生成随机文本
  - 验证提取的文本与原始文本一致
  - **验证：需求 1.1, 1.2, 1.5**

- [ ] 8.2 编写属性测试 2：特殊字符处理正确性
  - 创建 `test/integration/properties/special-chars.property.test.ts`
  - 使用 fc.unicodeString() 生成特殊字符
  - 验证特殊字符正确解码
  - **验证：需求 1.3, 3.3**

- [ ] 8.3 编写属性测试 3：表格结构识别正确性
  - 创建 `test/integration/properties/table-detection.property.test.ts`
  - 使用 fc.array() 生成随机表格数据
  - 验证表格结构正确识别
  - **验证：需求 2.1, 2.2, 2.4**

- [ ] 8.4 编写属性测试 4：非表格内容不误判
  - 创建 `test/integration/properties/non-table-detection.property.test.ts`
  - 生成非表格 HTML 结构
  - 验证不误判为表格
  - **验证：需求 2.5**

- [ ] 8.5 编写属性测试 5：导出格式正确性
  - 创建 `test/integration/properties/export-format.property.test.ts`
  - 使用 generateRandomTableData() 生成数据
  - 验证 CSV/Excel 格式正确
  - **验证：需求 3.1, 3.2, 3.3**

- [ ] 8.6 编写属性测试 6：行数限制策略正确性
  - 创建 `test/integration/properties/row-limit.property.test.ts`
  - 使用 fc.integer() 生成随机行数
  - 验证 Free 用户限制和 Pro 用户无限制
  - **验证：需求 4.1, 4.2**

- [ ] 8.7 编写属性测试 7：试用次数管理正确性
  - 创建 `test/integration/properties/trial-count.property.test.ts`
  - 使用 fc.integer() 生成初始试用次数
  - 验证 Free 用户递减和 Pro 用户不变
  - **验证：需求 4.3, 4.5**

- [ ] 8.8 编写属性测试 8：Selection_Box 跟随正确性
  - 创建 `test/integration/properties/selection-box.property.test.ts`
  - 使用 fc.tuple() 生成随机坐标
  - 验证 Selection_Box 准确跟随
  - **验证：需求 5.1**

- [ ] 8.9 编写属性测试 9：Result_Panel 显示正确性
  - 创建 `test/integration/properties/result-panel.property.test.ts`
  - 生成随机框选内容
  - 验证面板自动显示且结果正确
  - **验证：需求 5.2**

- [ ] 8.10 编写属性测试 10：连续操作隔离性
  - 创建 `test/integration/properties/continuous-operations.property.test.ts`
  - 使用 fc.array() 生成操作序列
  - 验证每次操作独立且正确
  - **验证：需求 5.5**

- [ ] 8.11 编写属性测试 11：消息通信往返正确性
  - 创建 `test/integration/properties/message-protocol.property.test.ts`
  - 生成随机用户操作
  - 验证消息格式正确
  - **验证：需求 6.1, 6.2**

- [ ] 8.12 编写属性测试 12：UI 响应正确性
  - 创建 `test/integration/properties/ui-response.property.test.ts`
  - 生成随机 ACTION_RESULT
  - 验证 Content 无条件执行 uiAction
  - **验证：需求 6.3, 6.4**

- [ ] 8.13 编写属性测试 13：异常兜底正确性
  - 创建 `test/integration/properties/error-fallback.property.test.ts`
  - 模拟 Background 异常
  - 验证返回兜底 ACTION_RESULT
  - **验证：需求 6.5**

- [ ] 8.14 编写属性测试 14：错误 HTML 容错性
  - 创建 `test/integration/properties/malformed-html.property.test.ts`
  - 生成格式错误的 HTML
  - 验证插件不崩溃
  - **验证：需求 7.1**

- [ ] 8.15 编写属性测试 15：Storage 损坏容错性
  - 创建 `test/integration/properties/storage-corruption.property.test.ts`
  - 生成损坏的 storage 数据
  - 验证使用默认值且功能正常
  - **验证：需求 7.3**

- [ ] 9. 最终检查点 - 确保所有集成测试通过
  - 运行 `npm run test:integration` 执行所有测试
  - 检查测试报告（HTML 报告）
  - 验证所有测试用例通过
  - 验证属性测试覆盖所有 15 个属性
  - 如有问题，询问用户

- [ ] 10. 生成测试文档和报告
  - 更新 README.md（如需要）
  - 生成测试覆盖报告
  - 记录测试执行结果
  - _需求：10.1-10.6_

## 注意事项

- 标记 `*` 的任务为可选任务，可以跳过以加快开发
- 每个任务都引用了具体的需求编号，便于追溯
- 检查点任务确保增量验证，及时发现问题
- 属性测试任务明确标注了属性编号和验证的需求
- 测试应该使用中文描述和注释
- 所有集成测试必须在真实浏览器中运行
- 使用 Playwright 进行端到端测试
- 测试前确保插件已构建（`npm run build`）
