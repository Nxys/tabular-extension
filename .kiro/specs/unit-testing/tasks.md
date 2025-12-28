# 实现计划：单元测试套件

## 概述

本实现计划将测试套件的开发分解为增量步骤，每个步骤都构建在前一步的基础上。实现将按照以下顺序进行：测试基础设施 → Background 层测试 → Content 层测试 → Shared 层测试 → 架构守门测试。

## 任务

- [x] 1. 建立测试基础设施
  - 创建 Jest 配置和全局 setup
  - 实现 chrome API mock
  - 实现 DOM mock 增强
  - _需求：6.1, 6.2, 6.3_

- [x] 1.1 配置 Jest 测试环境
  - 更新 package.json 中的 Jest 配置
  - 设置 testMatch 为 `**/src/**/__test__/**/*.test.ts`
  - 设置 setupFilesAfterEnv 为 `<rootDir>/src/__test__/setup.ts`
  - 配置覆盖率目录为 `src/__test__/coverage`
  - 配置覆盖率阈值（Background 90%+, Content 85%+, Shared 100%）
  - _需求：6.1, 6.4, 6.5_

- [x] 1.2 创建全局测试配置文件
  - 创建 `src/__test__/setup.ts`
  - 实现 resetMocks() 工具函数
  - 实现 mockDate() 和 restoreDate() 时间控制函数
  - 配置全局 beforeEach 和 afterEach 钩子
  - _需求：6.3, 10.1, 10.2_

- [x] 1.3 实现 chrome API mock
  - 创建 `src/__test__/mocks/chrome.ts`
  - 实现 chrome.storage.local mock（get, set, remove, clear）
  - 实现 chrome.runtime mock（sendMessage, onMessage）
  - 实现 chrome.tabs mock（query, sendMessage）
  - 提供内存存储实现
  - 导出 resetChromeMock() 函数
  - _需求：6.3_

- [x] 1.4 实现 DOM mock 增强
  - 创建 `src/__test__/mocks/dom.ts`
  - 实现 mockGetClientRects() 函数
  - 实现 mockGetBoundingClientRect() 函数
  - 实现 mockComputedStyle() 函数
  - 实现 createMockTextNode() 函数
  - _需求：6.2_

- [x] 2. 实现 Background 层测试
  - 测试 storage.ts 模块
  - 测试 usage.ts 模块
  - 测试 pro.ts 模块
  - 测试 settings.ts 模块
  - 测试 index.ts 模块
  - _需求：1.1-1.7_

- [x] 2.1 实现 storage.ts 单元测试
  - 创建 `src/background/__test__/storage.test.ts`
  - 测试 getFromStorage() 正常读取
  - 测试 getFromStorage() 默认值处理
  - 测试 setToStorage() 正常写入
  - 测试 removeFromStorage() 删除操作
  - _需求：1.5_

- [x] 2.2 测试 storage.ts 错误处理
  - 测试 chrome.storage 失败时的内存降级
  - 测试内存存储的一致性
  - 验证错误日志输出
  - _需求：8.1_

- [x] 2.3 编写 storage.ts 属性测试
  - **属性 2：存储往返一致性**
  - 使用 fast-check 生成随机键值对
  - 验证 setToStorage 然后 getFromStorage 返回相同值
  - 配置 100 次迭代
  - **验证：需求 4.4**

- [x] 2.4 实现 usage.ts 单元测试
  - 创建 `src/background/__test__/usage.test.ts`
  - 测试 checkUsage() 初始状态
  - 测试 consumeUsage() 递增逻辑
  - 测试 record() 事件记录
  - 测试使用次数达到上限的行为
  - _需求：1.1, 9.1_

- [x] 2.5 测试 usage.ts 跨天重置
  - 使用 Jest fake timers 控制时间
  - 测试跨天边界的重置逻辑
  - 验证统计数据重置
  - _需求：1.2, 9.2_

- [x] 2.6 测试 usage.ts 错误处理
  - 测试 record() 失败时的优雅降级
  - 验证主流程不受影响
  - _需求：8.3_

- [x] 2.7 编写 usage.ts 属性测试
  - **属性 1：使用次数单调性**
  - 使用 fast-check 生成操作序列
  - 验证使用次数单调递增（不包含跨天重置）
  - 配置 100 次迭代
  - **验证：需求 4.3**

- [x] 2.8 实现 pro.ts 单元测试
  - 创建 `src/background/__test__/pro.test.ts`
  - 测试 allow() 默认状态（所有功能不可用）
  - 测试 Pro 状态读取
  - _需求：1.3_

- [x] 2.9 实现 settings.ts 单元测试
  - 创建 `src/background/__test__/settings.test.ts`
  - 测试 getSettings() 默认设置
  - 测试 updateSettings() 部分更新
  - 测试 updateSettings() 完整更新
  - _需求：1.4_

- [x] 2.10 实现 index.ts 单元测试
  - 创建 `src/background/__test__/index.test.ts`
  - 测试消息路由（REQUEST_ACTION）
  - 测试 text-extract action 处理
  - 测试 table-detect action 处理（含 Pro 检查）
  - 测试 column-align action 处理（含 Pro 检查）
  - 测试 csv-export action 处理（含 Pro 检查）
  - _需求：1.6_

- [x] 2.11 测试 index.ts 异常处理
  - 测试消息处理异常时的兜底返回
  - 测试未知 action 类型的处理
  - 验证兜底响应格式
  - _需求：1.7, 8.2_

- [x] 2.12 测试 index.ts 使用次数限制
  - 测试达到限制时返回 SHOW_LIMIT_PANEL
  - 验证限制提示文案
  - _需求：1.6_

- [x] 3. 检查点 - 确保 Background 层测试通过
  - 运行 `npm test -- src/background`
  - 检查覆盖率是否达到 90%+
  - 如有问题，询问用户

- [x] 4. 实现 Content 层测试
  - 测试 extractor.ts 模块
  - 测试 selection.ts 模块
  - 测试 panel.ts 模块
  - 测试 index.ts 模块
  - _需求：2.1-2.5_

- [x] 4.1 实现 extractor.ts 单元测试 - collect()
  - 创建 `src/content/__test__/extractor.test.ts`
  - 测试 collect() 空输入处理
  - 测试 collect() 单个文本元素
  - 测试 collect() 多个文本元素
  - 测试 collect() 过滤不可见元素
  - 使用 DOM mock 创建测试场景
  - _需求：2.1_

- [x] 4.2 实现 extractor.ts 单元测试 - layout()
  - 测试 layout() 空输入处理
  - 测试 layout() 单行文本
  - 测试 layout() 多行文本
  - 测试 layout() 行内排序
  - 测试 layout() 行间排序
  - _需求：2.1_

- [x] 4.3 实现 extractor.ts 单元测试 - format()
  - 测试 format() 空输入处理
  - 测试 format() 单行格式化
  - 测试 format() 多行格式化
  - 测试 format() 空格连接
  - _需求：2.1_

- [x] 4.4 编写 extractor.ts 属性测试
  - **属性 3：文本提取幂等性**
  - 使用 fast-check 生成选择区域
  - 验证多次提取返回相同结果
  - 配置 100 次迭代
  - **验证：需求 4.5**

- [x] 4.5 实现 extractor.ts 单元测试 - 表格功能
  - 测试 detectTable() 空输入处理
  - 测试 detectTable() 列聚类
  - 测试 alignTable() 列对齐计算
  - 测试 toCSV() CSV 转义
  - 测试 toCSV() 格式化
  - _需求：2.2_

- [x] 4.6 测试 extractor.ts 边界情况
  - 测试空选区处理
  - 测试极小选区处理
  - 测试超长文本处理
  - _需求：9.4_

- [x] 4.7 实现 selection.ts 单元测试
  - 创建 `src/content/__test__/selection.test.ts`
  - 测试 start() 创建选择框
  - 测试 update() 更新选择框
  - 测试 finish() 返回选择区域
  - 测试 isValid() 有效性验证
  - 测试 clear() 清理操作
  - _需求：2.3_

- [x] 4.8 实现 panel.ts 单元测试
  - 创建 `src/content/__test__/panel.test.ts`
  - 测试 showResult() 创建结果面板
  - 测试 showLimit() 创建限制提示
  - 测试 showPro() 创建 Pro 提示
  - 测试 hide() 隐藏面板
  - 测试 contains() 点击检测
  - _需求：2.4_

- [x] 4.9 测试 panel.ts 交互功能
  - 测试复制功能
  - 测试 CSV 导出功能
  - 测试拖动功能
  - 测试视口边界调整
  - _需求：2.4_

- [x] 4.10 实现 index.ts 单元测试
  - 创建 `src/content/__test__/index.test.ts`
  - 测试事件监听绑定
  - 测试 mousedown 事件处理
  - 测试 mousemove 事件处理
  - 测试 mouseup 事件处理
  - 测试消息发送
  - 测试 UI Action 执行
  - _需求：2.5_

- [x] 4.11 测试 index.ts 设置管理
  - 测试设置初始化
  - 测试设置更新
  - 测试快捷键切换
  - _需求：2.5_

- [x] 5. 检查点 - 确保 Content 层测试通过
  - 运行 `npm test -- src/content`
  - 检查覆盖率是否达到 85%+
  - 如有问题，询问用户

- [x] 6. 实现 Shared 层测试
  - 测试 types.ts 模块
  - 测试 constants.ts 模块
  - _需求：3.1, 3.2_

- [x] 6.1 实现 types.ts 类型测试
  - 创建 `src/shared/__test__/types.test.ts`
  - 验证 RequestActionMessage 类型存在
  - 验证 ActionResultMessage 类型存在
  - 验证 ActionType 枚举值
  - 验证 UIAction 枚举值
  - 验证 ActionStatus 枚举值
  - _需求：3.1_

- [x] 6.2 实现 constants.ts 常量测试
  - 创建 `src/shared/__test__/constants.test.ts`
  - 验证 CSS_CLASS_PREFIX 值
  - 验证 IGNORED_TAGS 数组
  - 验证 DEFAULT_LAYOUT_OPTIONS 对象
  - 验证 MIN_SELECTION_SIZE 值
  - _需求：3.2_

- [x] 7. 检查点 - 确保 Shared 层测试通过
  - 运行 `npm test -- src/shared`
  - 检查覆盖率是否达到 100%
  - 如有问题，询问用户

- [x] 8. 实现架构守门测试
  - 验证层间依赖规则
  - 验证业务逻辑隔离
  - _需求：5.1-5.4_

- [x] 8.1 实现架构守门测试基础
  - 创建 `src/__test__/architecture/guards.test.ts`
  - 实现源代码文件扫描功能
  - 实现 import 语句提取功能
  - 实现关键字检测功能
  - _需求：5.1-5.4_

- [x] 8.2 实现层间依赖检查
  - 测试 Content 层不导入 Background 层
  - 测试 Background 层不导入 Content 层
  - 提供清晰的违规错误信息
  - _需求：5.1, 5.2_

- [x] 8.3 实现业务逻辑隔离检查
  - 测试 Content 层不直接访问 chrome.storage
  - 测试 Shared 层不包含业务逻辑关键字
  - 提供清晰的违规错误信息
  - _需求：5.3, 5.4_

- [x] 9. 最终检查点 - 确保所有测试通过
  - 运行 `npm test` 执行所有测试
  - 运行 `npm test -- --coverage` 生成覆盖率报告
  - 验证整体覆盖率达到 80%+
  - 验证 Background 层覆盖率达到 90%+
  - 验证 Content 层覆盖率达到 85%+
  - 验证 Shared 层覆盖率达到 100%
  - 如有问题，询问用户

## 注意事项

- 标记 `*` 的任务为可选任务，可以跳过以加快 MVP 开发
- 每个任务都引用了具体的需求编号，便于追溯
- 检查点任务确保增量验证，及时发现问题
- 属性测试任务明确标注了属性编号和验证的需求
- 测试应该使用中文描述和注释
- 所有测试必须遵循 Arrange-Act-Assert 结构
