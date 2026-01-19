# 实现计划：Pro 功能修复

## 概述

本实现计划将修复 Pro 功能的三个核心问题，并添加加密存储功能。实现遵循三层分离架构，确保业务逻辑集中在 Background 层。

## 任务

- [x] 1. 创建加密模块
  - 创建 `src/background/crypto.ts` 文件
  - 实现 `encryptProState()` 函数，使用 AES-GCM 加密
  - 实现 `decryptProState()` 函数，使用 AES-GCM 解密
  - 实现 `deriveKey()` 函数，基于扩展 ID 派生密钥
  - 处理加密解密错误，解密失败返回 null
  - _需求: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 1.1 编写加密模块的属性测试
  - **属性 16: 加密解密往返一致性**
  - **验证：需求 5.2, 5.3**
  - 使用 fast-check 生成随机 ProState 对象
  - 验证 `decryptProState(await encryptProState(state))` 返回相同的 state
  - 运行 100 次迭代

- [x] 1.2 编写加密模块的单元测试
  - 测试加密输出格式（base64 编码）
  - 测试解密失败返回 null
  - 测试密钥派生一致性
  - _需求: 5.4, 5.5_

- [x] 2. 更新 Pro 模块
  - 修改 `src/background/pro.ts` 中的 `getProState()` 函数
  - 使用 `decryptProState()` 解密读取的数据
  - 添加 `setProState()` 函数，使用 `encryptProState()` 加密写入
  - 处理解密失败情况，返回默认 Free 状态
  - 添加向后兼容逻辑，检测并迁移明文数据
  - _需求: 4.1, 4.2, 5.1, 5.2, 5.3, 5.5_

- [ ]* 2.1 编写 Pro 模块的单元测试
  - 测试 `getProState()` 正确解密
  - 测试 `setProState()` 正确加密
  - 测试解密失败返回默认状态
  - 测试明文数据自动迁移
  - _需求: 4.1, 5.5_

- [x] 3. 更新 Popup 模块
  - 修改 `src/popup/popup.ts`
  - 添加 `loadProState()` 函数，读取并解密 Pro 状态
  - 添加 `updateProDisplay()` 函数，根据 isPro 更新 UI
  - 修改 `updateTrialDisplay()` 函数，Pro 用户显示"无限使用"
  - 修改升级按钮逻辑，Pro 用户禁用按钮或显示"已激活"
  - 修改升级按钮点击事件，使用 `setProState()` 加密存储
  - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 4.4, 4.5_

- [ ]* 3.1 编写 Popup 模块的属性测试
  - **属性 2: Popup UI 根据 Pro 状态正确渲染**
  - **验证：需求 1.2, 1.3, 1.4, 1.5**
  - 使用 fast-check 生成随机 ProState（isPro 为 true 或 false）
  - 验证 UI 显示符合预期
  - 运行 100 次迭代

- [ ]* 3.2 编写 Popup 模块的单元测试
  - 测试 `loadProState()` 正确读取
  - 测试 Pro 用户 UI 显示
  - 测试 Free 用户 UI 显示
  - 测试升级按钮点击事件
  - _需求: 1.1, 4.5_

- [x] 4. 检查点 - 确保加密和 Popup 功能正常
  - 确保所有测试通过，询问用户是否有问题

- [x] 5. 修复高级清洗功能
  - 检查 `src/content/content.ts` 中的消息发送逻辑
  - 确保高级清洗按钮点击时发送正确的 REQUEST_ACTION 消息
  - 消息格式：`{ type: 'REQUEST_ACTION', payload: { action: 'advanced-clean', data: { text, rules } } }`
  - 检查 `src/background/index.ts` 中的 `handleAdvancedClean()` 函数
  - 确保正确检查 Pro 权限和试用次数
  - 确保 Pro 用户不消耗试用次数
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ]* 5.1 编写高级清洗的属性测试
  - **属性 5: Pro 用户不消耗试用次数**
  - **验证：需求 2.3**
  - 模拟 Pro 用户使用清洗功能
  - 验证试用次数不变
  - **属性 6: Free 用户消耗试用次数**
  - **验证：需求 2.4**
  - 模拟 Free 用户使用清洗功能
  - 验证试用次数减少 1
  - 运行 100 次迭代

- [ ]* 5.2 编写高级清洗的单元测试
  - 测试消息发送格式正确
  - 测试 Background 权限检查
  - 测试清洗功能输出正确
  - 测试 Content 更新面板
  - _需求: 2.1, 2.2, 2.5, 2.6_

- [x] 6. 优化预览面板按钮文案
  - 修改 `src/content/panel.ts` 中的按钮创建函数
  - 更新 `createAdvancedCleanButton()` 文案为"🧹 清洗"
  - 更新 `createExportButton()` 文案为"📤 导出"
  - 更新 `createCopyButton()` 文案为"📄 复制"
  - 检查 `src/content/content.css` 中的按钮样式
  - 确保按钮容器使用 flexbox 布局，三个按钮在一行显示
  - _需求: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 6.1 编写按钮文案的单元测试
  - 测试高级清洗按钮文案为"🧹 清洗"
  - 测试导出按钮文案为"📤 导出"
  - 测试复制按钮文案为"📄 复制"
  - 测试按钮容器布局不换行
  - _需求: 3.2, 3.3, 3.4, 3.5_

- [x] 7. 检查点 - 确保所有功能正常
  - 确保所有测试通过，询问用户是否有问题

- [x] 8. 集成测试和验证
  - 手动测试 Popup 显示 Pro 状态
  - 手动测试升级按钮功能
  - 手动测试高级清洗功能
  - 手动测试按钮文案显示
  - 验证 storage 中的 Pro 状态是加密的
  - 验证刷新页面后状态保持
  - _需求: 所有需求_

## 注意事项

- 任务标记 `*` 的为可选测试任务，可以跳过以加快 MVP 开发
- 每个任务引用具体的需求编号，确保可追溯性
- 遵循三层分离架构，业务逻辑在 Background，UI 渲染在 Content
- 使用 TypeScript 严格模式，禁用 any 类型
- 所有导出函数必须有中文 JSDoc 注释
