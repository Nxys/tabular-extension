# 实现计划：架构纠偏 - Content/Background 职责分离

## 概述

本实现计划将 Chrome 插件从"content 层混杂业务逻辑"重构为"background 层集中管理，content 层纯粹渲染"的清晰架构。重构将分阶段进行，确保每个步骤都可验证和回滚。

## 任务

- [ ] 1. 创建 Shared 消息协议模块
  - 创建 src/shared/messages.ts 文件
  - 定义 UIAction、ActionStatus、ActionType 枚举类型
  - 定义 RequestActionMessage 和 ActionResultMessage 接口
  - 定义 ExtensionMessage 联合类型
  - _需求: 3.1, 3.2, 3.3, 3.4, 3.5, 11.1, 11.2_

- [ ]* 1.1 编写 Shared 模块的类型测试
  - 验证消息类型定义的完整性
  - 验证枚举值的正确性
  - _需求: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 2. 迁移 Usage 模块到 Background
  - [ ] 2.1 创建 src/background/usage 目录
    - 复制 src/content/usage/storage.ts 到 src/background/usage/storage.ts
    - 复制 src/content/usage/policy.ts 到 src/background/usage/policy.ts
    - 复制 src/content/usage/usage.ts 到 src/background/usage/usage.ts
    - _需求: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 2.2 编写 Background Usage 模块的单元测试
    - 测试 getUsageCount、incrementUsage、resetIfNewDay
    - 测试 record、getRecentStats
    - 测试 checkUsage、consumeUsage
    - _需求: 4.2, 4.3, 4.4_

- [ ] 3. 迁移 Pro 模块到 Background
  - [ ] 3.1 创建 src/background/pro 目录
    - 复制 src/content/pro/gate.ts 到 src/background/pro/gate.ts
    - 复制 src/content/pro/strategy.ts 到 src/background/pro/strategy.ts
    - _需求: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 3.2 编写 Background Pro 模块的单元测试
    - 测试 allow 函数的所有分支
    - 测试 verifySignature、verifyCallPath、verifyUsagePattern
    - _需求: 5.2, 5.3, 5.4_

- [ ] 4. 实现 Background Action Handler
  - [ ] 4.1 创建 src/background/handlers/action-handler.ts
    - 实现 handleActionRequest 函数
    - 实现 handleTextExtract 函数
    - 实现 handleTableDetect 函数
    - 实现 handleColumnAlign 函数
    - 实现 handleCSVExport 函数
    - 确保 usage 只在 status='ok' 时消耗
    - _需求: 2.4, 2.5, 4.2, 4.3, 5.2, 5.3, 5.4_

  - [ ]* 4.2 编写 Action Handler 的单元测试
    - 测试免费次数限制逻辑
    - 测试 Pro 权限检查逻辑
    - 测试 usage 消耗时机（只在成功时）
    - 测试所有 action 类型的处理
    - _需求: 2.4, 2.5_

  - [ ]* 4.3 编写 Action Handler 的属性测试
    - **属性 6：消息响应完整性**
    - **验证：需求 2.5**
    - 生成随机的 REQUEST_ACTION 消息
    - 验证 background 总是返回完整的 ACTION_RESULT
    - _需求: 2.5_

  - [ ] 4.4 编写 Usage 消耗时机的属性测试（强制）
    - **属性 11：Usage 消耗时机正确性**
    - **验证：架构语义约束**
    - 生成各种 action 请求和状态组合
    - 验证 usage 只在 status='ok' 时消耗
    - **注意：此为架构守门测试，禁止跳过**
    - _需求: 架构语义约束_

  - [ ] 4.5 添加 ActionHandler 职责边界注释
    - 在 action-handler.ts 文件顶部添加注释说明
    - 明确 ActionHandler 当前允许生成 uiData.message
    - 声明这是阶段性集中实现，未来可迁移至专用文案模块
    - 明确禁止在 ActionHandler 中引入：UI 状态管理、A/B 测试逻辑、国际化逻辑
    - **注意：此为文档级约束，不要求重构代码**
    - _需求: 架构演进说明_

  - [ ] 4.6 实现统一异常兜底返回
    - 在所有 catch 块中返回合法的 ACTION_RESULT
    - 对于 unknown action，返回合法的 ACTION_RESULT
    - 对于 runtime error，返回合法的 ACTION_RESULT
    - 兜底返回格式：status='blocked', uiAction='SHOW_RESULT_PANEL', uiData.message='通用错误提示'
    - **注意：禁止返回 undefined 或非协议对象**
    - _需求: 9.2, 9.4_

- [ ] 5. 重构 Background Service
  - [ ] 5.1 更新 src/background.ts
    - 导入 handleActionRequest
    - 实现消息监听器处理 REQUEST_ACTION
    - 实现异步响应机制
    - 添加错误处理和日志记录
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 9.4_

  - [ ]* 5.2 编写 Background Service 的单元测试
    - 测试消息路由逻辑
    - 测试错误处理逻辑
    - 测试异步响应机制
    - _需求: 2.5, 9.4_

- [ ] 6. 检查点 - Background 层完成
  - 确保所有 Background 测试通过
  - 确认 usage 和 pro 模块已迁移
  - 确认 Action Handler 正确实现
  - 询问用户是否有问题

- [ ] 7. 重构 Content Script
  - [ ] 7.1 简化 src/content/content.ts
    - 删除对 usage/usage.ts 的导入
    - 删除对 usage/policy.ts 的导入
    - 删除对 pro/gate.ts 的导入
    - 删除对 pro/strategy.ts 的导入
    - 实现 requestAction 函数（发送 REQUEST_ACTION）
    - 实现 executeUIAction 函数（执行 uiAction 指令）
    - 更新 handleMouseUp 使用新的消息流程
    - 删除 handleProPipeline 函数（逻辑移到 background）
    - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1_

  - [ ]* 7.2 编写 Content Script 的单元测试
    - 测试 requestAction 函数的消息发送
    - 测试 executeUIAction 函数的 UI 渲染
    - 测试错误处理逻辑（通信失败、超时）
    - _需求: 1.1, 1.4, 1.5, 9.2, 9.5_

  - [ ]* 7.3 编写 Content Script 的属性测试
    - **属性 4：操作请求完整性**
    - **验证：需求 1.1, 7.1**
    - 模拟各种用户操作
    - 验证 content 总是发送消息而不是直接执行
    - _需求: 1.1, 7.1_

- [ ] 8. 重构 Panel UI
  - [ ] 8.1 简化 src/content/panel.ts
    - 删除对 usage/policy.ts 的导入
    - 删除 usageInfo 参数（改为接收 background 生成的文案）
    - 实现 showResult 函数（接收 uiData）
    - 实现 showLimit 函数（接收 uiData.message）
    - 实现 showPro 函数（接收 uiData.message）
    - 删除所有业务逻辑判断和文案拼装
    - _需求: 1.4, 1.5, 3.8, 6.6, 6.7_

  - [ ]* 8.2 编写 Panel UI 的单元测试
    - 测试 showResult 函数的渲染
    - 测试 showLimit 函数的渲染
    - 测试 showPro 函数的渲染
    - 验证不包含业务逻辑判断
    - _需求: 1.4, 1.5_

- [ ] 9. 删除 Content 层的 Usage 和 Pro 模块
  - 删除 src/content/usage 目录
  - 删除 src/content/pro 目录
  - _需求: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 10. 检查点 - Content 层完成
  - 确保所有 Content 测试通过
  - 确认 content 不再依赖 usage/pro 模块
  - 确认 content 只通过消息与 background 通信
  - 询问用户是否有问题

- [ ] 10.1 Content 冻结点（Freeze Gate）
  - **声明：冻结点之后，禁止在 content 层新增以下内容**
  - 禁止新增 usage / pro / policy / strategy 相关逻辑
  - 禁止新增业务判断（如 if (isPro)、if (count > limit)）
  - 禁止新增文案拼装（如 "剩余 X 次"）
  - **后续功能扩展只能通过 background 完成**
  - 记录冻结点时间戳和版本号
  - _需求: 架构约束_

- [ ] 11. 编写架构约束验证测试
  - [ ] 11.1 编写静态分析测试（强制）
    - **属性 1：架构约束完整性**
    - **验证：需求 1.2, 1.3, 3.6, 3.7, 3.8, 6.1-6.7**
    - 验证 content 不导入 usage、storage、policy、pro 模块
    - 验证 content 不包含 freeCount、limit、planType 等标识符
    - 验证 content 不根据 status 进行业务判断
    - 验证 content 不 import background 下的任何文件
    - **注意：此为架构守门测试，禁止跳过**
    - _需求: 1.2, 1.3, 3.6, 3.7, 3.8, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ] 11.2 编写 Shared 模块纯净性测试（强制）
    - **属性 8：Shared 模块纯净性**
    - **验证：需求 11.1-11.8**
    - 验证 shared 模块只包含类型定义和消息协议
    - 验证 shared 模块不包含 usage、pro、policy、strategy
    - **注意：此为架构守门测试，禁止跳过**
    - _需求: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [ ] 11.3 编写 Storage 访问隔离测试（强制）
    - **属性 7：Storage 访问隔离**
    - **验证：需求 4.5, 5.5**
    - 验证 content 不直接访问 chrome.storage.local 读取业务数据
    - **注意：此为架构守门测试，禁止跳过**
    - _需求: 4.5, 5.5_

- [ ] 12. 编写消息协议测试
  - [ ]* 12.1 编写消息协议完整性属性测试
    - **属性 2：消息协议完整性**
    - **验证：需求 3.1, 3.2, 3.3, 3.4, 3.5**
    - 生成随机的操作类型和数据
    - 验证所有消息都符合协议格式
    - _需求: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 12.2 编写 UI 执行无条件性属性测试（强制）
    - **属性 3：UI 执行无条件性**
    - **验证：需求 1.4, 1.5, 3.6, 3.7, 7.5**
    - 生成随机的 ACTION_RESULT 消息
    - 验证 content 只使用 uiAction，不使用 status
    - **注意：此为架构守门测试，禁止跳过**
    - _需求: 1.4, 1.5, 3.6, 3.7, 7.5_

- [ ] 13. 编写集成测试
  - [ ]* 13.1 编写完整流程集成测试
    - 模拟用户框选操作
    - 验证 content 发送 REQUEST_ACTION
    - 验证 background 返回 ACTION_RESULT
    - 验证 content 执行 uiAction 渲染 UI
    - _需求: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 13.2 编写兼容性集成测试
    - 设置旧版本的 storage 数据
    - 启动插件
    - 验证数据正确迁移
    - 验证功能正常工作
    - _需求: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 13.3 编写错误恢复集成测试
    - 模拟 storage 失败
    - 验证使用内存降级存储
    - 恢复 storage
    - 验证数据同步正确
    - _需求: 9.1_

- [ ] 14. 编写错误处理测试
  - [ ]* 14.1 编写错误处理健壮性属性测试
    - **属性 9：错误处理健壮性**
    - **验证：需求 9.2, 9.5**
    - 模拟各种错误场景（通信失败、超时、异常）
    - 验证 content 不崩溃且显示友好提示
    - _需求: 9.2, 9.5_

  - [ ]* 14.2 编写错误日志完整性属性测试
    - **属性 10：错误日志完整性**
    - **验证：需求 9.4**
    - 触发各种错误
    - 验证所有错误都被记录到 console
    - _需求: 9.4_

- [ ] 15. 最终检查点 - 完整验证
  - 运行所有单元测试
  - 运行所有属性测试
  - 运行所有集成测试
  - 验证测试覆盖率达标（Background 90%+, Content 85%+）
  - 手动测试所有功能
  - 询问用户是否有问题

- [ ] 16. 文档更新
  - 更新 README.md 说明新的架构
  - 更新代码注释
  - 创建架构迁移指南
  - _需求: 所有_

## 注意事项

- 任务标记 `*` 的为可选测试任务，可根据需要跳过以加快 MVP 开发
- **架构守门测试（4.4, 11.1, 11.2, 11.3, 12.2）为强制任务，禁止跳过，即使在 MVP 阶段**
- 每个检查点都应确保所有测试通过后再继续
- 重构过程中保持功能正常工作，避免破坏现有功能
- 所有属性测试最少运行 100 次迭代
- 静态分析测试只需运行 1 次验证
- Content 冻结点（任务 10.1）之后，禁止在 content 层新增任何业务逻辑
- 所有异常路径必须返回合法的 ACTION_RESULT，禁止返回 undefined 或非协议对象
