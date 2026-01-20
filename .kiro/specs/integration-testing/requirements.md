# Requirements Document

## Introduction

本文档定义了 Chrome 浏览器插件集成测试重构的需求。该插件提供文本提取、表格检测、数据导出等功能，采用三层架构（Background/Content/Shared）。当前集成测试存在覆盖不全、辅助函数不完善、缺少关键场景等问题。本次重构旨在建立完整、可靠的集成测试体系，确保所有核心功能在真实浏览器环境中正确运行。

## Glossary

- **Integration_Test_Suite**: 集成测试套件，在真实浏览器环境中运行的端到端测试
- **Playwright**: 浏览器自动化测试框架，用于控制真实浏览器
- **Background**: 插件的业务逻辑层，负责状态管理和决策
- **Content**: 插件的 UI 交互层，负责页面交互和渲染
- **Shared**: 插件的协议层，定义消息协议和类型
- **REQUEST_ACTION**: Content 发送给 Background 的请求消息
- **ACTION_RESULT**: Background 返回给 Content 的响应消息
- **uiAction**: Background 在 ACTION_RESULT 中指定的 UI 操作指令
- **Test_Fixture**: 测试页面生成器，创建包含特定内容的测试页面
- **Test_Helper**: 测试辅助函数，封装常用的测试操作
- **Pro_User**: 付费用户，享有无限制功能
- **Free_User**: 免费用户，受功能限制（如 5 行限制）
- **Trial_Count**: 试用次数，Free 用户可试用高级功能的次数
- **Result_Panel**: 结果面板，显示提取结果的 UI 组件
- **Selection_Box**: 框选框，用户框选页面内容的可视化边框

## Requirements

### Requirement 1: 基础文本提取测试

**User Story:** 作为测试工程师，我希望测试文本提取功能，以确保插件能正确提取各种文本内容。

#### Acceptance Criteria

1. WHEN 用户框选简单文本 THEN THE Integration_Test_Suite SHALL 验证提取的文本与原始文本完全一致
2. WHEN 用户框选多行文本 THEN THE Integration_Test_Suite SHALL 验证提取的文本保留换行符和格式
3. WHEN 用户框选包含特殊字符的文本（如 HTML 实体、Unicode、emoji）THEN THE Integration_Test_Suite SHALL 验证特殊字符被正确解码和提取
4. WHEN 用户框选空白区域 THEN THE Integration_Test_Suite SHALL 验证系统返回空结果或提示消息
5. WHEN 用户框选包含嵌套 HTML 标签的文本 THEN THE Integration_Test_Suite SHALL 验证提取的纯文本去除了所有标签

### Requirement 2: 表格检测和提取测试

**User Story:** 作为测试工程师，我希望测试表格检测功能，以确保插件能识别和提取各种表格结构。

#### Acceptance Criteria

1. WHEN 用户框选简单表格（2x2）THEN THE Integration_Test_Suite SHALL 验证表格被正确识别且数据结构完整
2. WHEN 用户框选复杂表格（包含合并单元格）THEN THE Integration_Test_Suite SHALL 验证合并单元格被正确处理
3. WHEN 用户框选嵌套表格 THEN THE Integration_Test_Suite SHALL 验证内外层表格都被正确提取
4. WHEN 用户框选包含表头的表格 THEN THE Integration_Test_Suite SHALL 验证表头被正确识别和标记
5. WHEN 用户框选非表格内容 THEN THE Integration_Test_Suite SHALL 验证系统不会误判为表格

### Requirement 3: 数据导出功能测试

**User Story:** 作为测试工程师，我希望测试数据导出功能，以确保插件能正确导出 CSV 和 Excel 格式。

#### Acceptance Criteria

1. WHEN 用户点击 CSV 导出按钮 THEN THE Integration_Test_Suite SHALL 验证生成的 CSV 文件格式正确且内容完整
2. WHEN 用户点击 Excel 导出按钮 THEN THE Integration_Test_Suite SHALL 验证生成的 Excel 文件格式正确且内容完整
3. WHEN 导出的数据包含特殊字符（逗号、引号、换行）THEN THE Integration_Test_Suite SHALL 验证特殊字符被正确转义
4. WHEN 导出空数据 THEN THE Integration_Test_Suite SHALL 验证系统返回错误提示或空文件
5. WHEN 导出大量数据（超过 1000 行）THEN THE Integration_Test_Suite SHALL 验证导出过程不会超时或崩溃

### Requirement 4: Pro 功能和权限测试

**User Story:** 作为测试工程师，我希望测试 Pro 功能和权限控制，以确保免费用户和付费用户获得正确的功能访问。

#### Acceptance Criteria

1. WHEN Free_User 提取超过 5 行数据 THEN THE Integration_Test_Suite SHALL 验证系统只返回前 5 行并显示升级提示
2. WHEN Pro_User 提取超过 5 行数据 THEN THE Integration_Test_Suite SHALL 验证系统返回所有数据且无限制提示
3. WHEN Free_User 使用高级清洗功能 THEN THE Integration_Test_Suite SHALL 验证 Trial_Count 正确递减
4. WHEN Free_User 的 Trial_Count 为 0 时使用高级清洗 THEN THE Integration_Test_Suite SHALL 验证系统显示升级提示并阻止操作
5. WHEN Pro_User 使用高级清洗功能 THEN THE Integration_Test_Suite SHALL 验证 Trial_Count 不受影响且功能正常

### Requirement 5: 用户交互流程测试

**User Story:** 作为测试工程师，我希望测试用户交互流程，以确保插件的 UI 响应正确且流畅。

#### Acceptance Criteria

1. WHEN 用户按下鼠标左键并拖动 THEN THE Integration_Test_Suite SHALL 验证 Selection_Box 实时显示且跟随鼠标移动
2. WHEN 用户释放鼠标完成框选 THEN THE Integration_Test_Suite SHALL 验证 Result_Panel 自动显示且包含提取结果
3. WHEN 用户点击 Result_Panel 的关闭按钮 THEN THE Integration_Test_Suite SHALL 验证面板消失且 Selection_Box 清除
4. WHEN 用户按下快捷键（Ctrl+Shift+X）THEN THE Integration_Test_Suite SHALL 验证插件功能被触发
5. WHEN 用户连续进行多次框选操作 THEN THE Integration_Test_Suite SHALL 验证每次操作都正确处理且不会相互干扰

### Requirement 6: 消息通信协议测试

**User Story:** 作为测试工程师，我希望测试 Content 和 Background 的消息通信，以确保三层架构正确实现。

#### Acceptance Criteria

1. WHEN Content 发送 REQUEST_ACTION 消息 THEN THE Integration_Test_Suite SHALL 验证 Background 收到消息且 action 类型正确
2. WHEN Background 返回 ACTION_RESULT 消息 THEN THE Integration_Test_Suite SHALL 验证 Content 收到消息且包含 status 和 uiAction
3. WHEN ACTION_RESULT 的 status 为 'ok' THEN THE Integration_Test_Suite SHALL 验证 Content 执行对应的 uiAction 且 UI 正确更新
4. WHEN ACTION_RESULT 的 status 为 'limited' THEN THE Integration_Test_Suite SHALL 验证 Content 显示限制提示且不消耗 Trial_Count
5. WHEN Background 处理消息时发生异常 THEN THE Integration_Test_Suite SHALL 验证返回兜底格式的 ACTION_RESULT 且 Content 显示错误信息

### Requirement 7: 错误处理和边界情况测试

**User Story:** 作为测试工程师，我希望测试错误处理和边界情况，以确保插件在异常情况下稳定运行。

#### Acceptance Criteria

1. WHEN 测试页面包含格式错误的 HTML THEN THE Integration_Test_Suite SHALL 验证插件不会崩溃且返回合理结果
2. WHEN 用户框选超大区域（超过 10000 个元素）THEN THE Integration_Test_Suite SHALL 验证插件能处理或返回性能警告
3. WHEN 插件的 storage 数据损坏 THEN THE Integration_Test_Suite SHALL 验证插件使用默认值且不影响核心功能
4. WHEN 网络请求失败（如导出到云端）THEN THE Integration_Test_Suite SHALL 验证插件显示错误提示且允许重试
5. WHEN 用户在页面加载完成前尝试使用插件 THEN THE Integration_Test_Suite SHALL 验证插件等待页面就绪或显示提示

### Requirement 8: 测试辅助工具完善

**User Story:** 作为测试工程师，我希望有完善的测试辅助工具，以便快速编写和维护测试用例。

#### Acceptance Criteria

1. THE Test_Helper SHALL 提供模拟鼠标框选的函数（指定起点和终点坐标）
2. THE Test_Helper SHALL 提供等待 Result_Panel 显示的函数（支持超时配置）
3. THE Test_Helper SHALL 提供设置用户权限的函数（切换 Free_User 和 Pro_User）
4. THE Test_Helper SHALL 提供清空 storage 数据的函数（用于测试隔离）
5. THE Test_Helper SHALL 提供验证消息通信的函数（捕获和断言 REQUEST_ACTION 和 ACTION_RESULT）

### Requirement 9: 测试页面生成器完善

**User Story:** 作为测试工程师，我希望有灵活的测试页面生成器，以便创建各种测试场景。

#### Acceptance Criteria

1. THE Test_Fixture SHALL 提供生成简单文本页面的函数（支持自定义文本内容）
2. THE Test_Fixture SHALL 提供生成表格页面的函数（支持指定行列数和单元格内容）
3. THE Test_Fixture SHALL 提供生成复杂 HTML 页面的函数（包含嵌套标签、特殊字符、多种元素）
4. THE Test_Fixture SHALL 提供生成空白页面的函数（用于测试边界情况）
5. THE Test_Fixture SHALL 支持动态注入 CSS 和 JavaScript（用于模拟真实网页环境）

### Requirement 10: 测试执行和报告

**User Story:** 作为测试工程师，我希望测试执行流程清晰且报告详细，以便快速定位问题。

#### Acceptance Criteria

1. WHEN 运行 `npm run test:integration` THEN THE Integration_Test_Suite SHALL 自动构建插件并启动测试服务器
2. WHEN 测试失败 THEN THE Integration_Test_Suite SHALL 生成截图和追踪文件（保存在 tests/report/test-results 目录）
3. WHEN 测试完成 THEN THE Integration_Test_Suite SHALL 输出测试报告（包含通过率、失败原因、执行时间）
4. THE Integration_Test_Suite SHALL 支持无头模式（`npm run test:integration:headless`）以便快速验证
5. THE Integration_Test_Suite SHALL 支持调试模式（`npm run test:integration:debug`）以便逐步调试
6. THE Integration_Test_Suite SHALL 支持 UI 模式（`npm run test:integration:ui`）以便可视化查看测试过程

