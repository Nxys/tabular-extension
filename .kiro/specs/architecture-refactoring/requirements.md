# 需求文档：架构纠偏 - Content/Background 职责分离

## 简介

本需求旨在重构 Chrome 插件的架构，将所有状态管理、策略判断、权限控制从 content 层迁移到 background 层，实现清晰的职责分离。

## 术语表

- **Content_Script**: 运行在网页上下文中的脚本，负责页面感知和 UI 渲染
- **Background_Service**: 运行在扩展后台的服务脚本，负责状态管理和业务逻辑
- **Usage_System**: 使用次数统计和限制系统
- **Pro_System**: Pro 功能权限管理系统
- **Action_Request**: content 向 background 发起的操作请求
- **Action_Result**: background 返回给 content 的操作结果

## 需求

### 需求 1：Content 层职责限制

**用户故事：** 作为系统架构师，我希望 content 层只负责页面感知和 UI 渲染，以便实现清晰的职责分离。

#### 验收标准

1. WHEN Content_Script 需要执行操作时，THE Content_Script SHALL 发送 Action_Request 消息到 Background_Service
2. THE Content_Script SHALL NOT 直接读取任何 usage、storage、policy、pro 状态
3. THE Content_Script SHALL NOT 判断是否可用、是否 Pro、是否超限
4. THE Content_Script SHALL NOT 决定是否展示限制或付费 UI
5. THE Content_Script SHALL 只根据 Background_Service 返回的指令渲染 UI

### 需求 2：Background 层职责集中

**用户故事：** 作为系统架构师，我希望所有业务逻辑集中在 background 层，以便统一管理和维护。

#### 验收标准

1. THE Background_Service SHALL 管理所有免费次数和使用配额
2. THE Background_Service SHALL 管理所有 Pro 和订阅状态
3. THE Background_Service SHALL 执行所有使用策略判断
4. THE Background_Service SHALL 决定是否允许执行某次操作
5. WHEN Background_Service 收到 Action_Request 时，THE Background_Service SHALL 返回包含状态和 UI 指令的 Action_Result

### 需求 3：统一消息通信协议

**用户故事：** 作为开发者，我希望有清晰的消息通信协议，以便 content 和 background 之间正确交互。

#### 验收标准

1. THE Content_Script SHALL 使用 REQUEST_ACTION 消息类型发送请求
2. THE Background_Service SHALL 使用 ACTION_RESULT 消息类型返回结果
3. THE Action_Result SHALL 包含 status 字段，值为 'ok'、'limited' 或 'blocked'
4. THE Action_Result SHALL 包含 uiAction 字段，值为枚举类型 UIAction
5. THE UIAction SHALL 是枚举值：'SHOW_RESULT_PANEL'、'SHOW_LIMIT_PANEL' 或 'SHOW_PRO_PANEL'
6. THE Content_Script SHALL 无条件执行 uiAction，不得根据 status 二次判断
7. THE Content_Script SHALL NOT 根据 status 分支判断 UI 类型
8. THE Content_Script SHALL NOT 拼装任何与计费、次数相关的文案

### 需求 4：Usage 模块迁移

**用户故事：** 作为系统架构师，我希望将 usage 模块从 content 迁移到 background，以便统一管理使用状态。

#### 验收标准

1. THE Background_Service SHALL 包含完整的 usage 模块功能
2. THE Background_Service SHALL 负责记录使用事件
3. THE Background_Service SHALL 负责检查使用限制
4. THE Background_Service SHALL 负责跨天重置逻辑
5. THE Content_Script SHALL NOT 直接访问 chrome.storage.local 读取 usage 数据

### 需求 5：Pro 模块迁移

**用户故事：** 作为系统架构师，我希望将 pro 模块从 content 迁移到 background，以便统一管理权限控制。

#### 验收标准

1. THE Background_Service SHALL 包含完整的 pro 模块功能
2. THE Background_Service SHALL 负责验证 Pro 状态
3. THE Background_Service SHALL 负责验证签名
4. THE Background_Service SHALL 负责检查功能权限
5. THE Content_Script SHALL NOT 直接调用 pro/gate.ts 的 allow() 函数

### 需求 6：Content 层简化

**用户故事：** 作为开发者，我希望 content 层代码简洁清晰，只包含页面交互逻辑。

#### 验收标准

1. THE Content_Script SHALL 删除对 usage/usage.ts 的导入
2. THE Content_Script SHALL 删除对 usage/policy.ts 的导入
3. THE Content_Script SHALL 删除对 usage/storage.ts 的导入
4. THE Content_Script SHALL 删除对 pro/gate.ts 的导入
5. THE Content_Script SHALL 删除对 pro/strategy.ts 的导入
6. THE Content_Script SHALL NOT 知道 freeCount、limit、planType 等业务概念
7. THE Content_Script SHALL NOT 解释 status 的业务含义

### 需求 7：消息流程完整性

**用户故事：** 作为用户，我希望所有功能正常工作，不因架构重构而出现功能缺失。

#### 验收标准

1. WHEN 用户进行框选操作时，THE Content_Script SHALL 发送 REQUEST_ACTION 消息
2. WHEN Background_Service 判断允许操作时，THE Background_Service SHALL 返回 status='ok' 的结果
3. WHEN Background_Service 判断超出限制时，THE Background_Service SHALL 返回 status='limited' 的结果
4. WHEN Background_Service 判断需要 Pro 权限时，THE Background_Service SHALL 返回 status='blocked' 的结果
5. THE Content_Script SHALL 根据返回的 status 渲染对应的 UI

### 需求 8：向后兼容性

**用户故事：** 作为用户，我希望重构后的系统与现有数据兼容，不丢失已有的使用记录。

#### 验收标准

1. THE Background_Service SHALL 读取现有的 chrome.storage.local 中的 usage 数据
2. THE Background_Service SHALL 读取现有的 chrome.storage.local 中的 pro_state 数据
3. WHEN 数据格式不变时，THE Background_Service SHALL 正常解析和使用
4. WHEN 用户升级插件时，THE Background_Service SHALL 自动迁移旧数据格式
5. THE Background_Service SHALL 保持与现有 storage 键名的兼容性

### 需求 9：错误处理

**用户故事：** 作为用户，我希望系统在出错时能优雅降级，不影响基本功能。

#### 验收标准

1. WHEN Background_Service 无法访问 storage 时，THE Background_Service SHALL 使用内存降级存储
2. WHEN 消息通信失败时，THE Content_Script SHALL 显示友好的错误提示
3. WHEN Background_Service 处理超时时，THE Content_Script SHALL 在 5 秒后显示超时提示
4. THE Background_Service SHALL 记录所有错误到 console
5. THE Content_Script SHALL NOT 因为 background 错误而崩溃

### 需求 10：测试覆盖

**用户故事：** 作为开发者，我希望有完整的测试覆盖，确保重构后的代码质量。

#### 验收标准

1. THE Background_Service SHALL 有单元测试覆盖所有 usage 逻辑
2. THE Background_Service SHALL 有单元测试覆盖所有 pro 逻辑
3. THE Background_Service SHALL 有单元测试覆盖消息处理逻辑
4. THE Content_Script SHALL 有集成测试验证消息通信流程
5. THE Background_Service SHALL 有集成测试验证完整的 action 处理流程


### 需求 11：Shared 模块职责限制

**用户故事：** 作为系统架构师，我希望 shared 模块只包含纯粹的类型定义和协议，不包含任何业务逻辑。

#### 验收标准

1. THE Shared_Module SHALL 只包含 type 定义
2. THE Shared_Module SHALL 只包含 message 协议定义
3. THE Shared_Module SHALL 只包含纯工具函数（无状态）
4. THE Shared_Module SHALL NOT 包含 usage 相关的状态结构
5. THE Shared_Module SHALL NOT 包含 pro 相关的状态结构
6. THE Shared_Module SHALL NOT 包含 policy 相关的定义
7. THE Shared_Module SHALL NOT 包含 strategy 相关的逻辑
8. THE Shared_Module SHALL NOT 暴露 freeCount、limit、planType 等业务概念到 content 层
