# 需求文档

## 简介

本需求文档旨在修复 Pro 功能集成测试中发现的三个问题：
1. Pro 功能状态展示问题 - Popup 界面未正确显示 Pro 状态
2. Pro 功能清洗未生效 - 高级清洗功能没有正常工作
3. 预览面板按钮文案过长 - 按钮文本换行导致布局问题

## 术语表

- **Popup**: 浏览器扩展的弹出设置界面
- **Pro_State**: Pro 功能状态，包含 isPro 标志和功能权限
- **Advanced_Cleaning**: 高级清洗功能，Pro 功能之一
- **Preview_Panel**: 文本预览面板，显示提取结果的 UI 组件
- **Trial_State**: 试用状态，包含剩余次数和可用性
- **Background**: 后台服务脚本，处理业务逻辑
- **Content**: 内容脚本，处理页面交互和 UI 渲染

## 需求

### 需求 1：Popup Pro 状态展示

**用户故事：** 作为 Pro 用户，我想在打开 Popup 时看到 Pro 状态，以便了解我的会员权益。

#### 验收标准

1. WHEN Popup 初始化时，THE Popup SHALL 从 storage 读取 Pro_State
2. WHEN Pro_State.isPro 为 true 时，THE Popup SHALL 显示"已开启 Pro"状态
3. WHEN Pro_State.isPro 为 true 时，THE Upgrade_Button SHALL 变为不可点击状态或显示"已激活"文本
4. WHEN Pro_State.isPro 为 false 时，THE Popup SHALL 显示试用次数和"升级到 Pro 版"按钮
5. WHEN Pro_State.isPro 为 true 时，THE Trial_Display SHALL 显示"无限使用"而非剩余次数

### 需求 2：高级清洗功能修复

**用户故事：** 作为 Pro 用户，我想使用高级清洗功能，以便对提取的文本进行高级处理。

#### 验收标准

1. WHEN 用户点击"高级清洗"按钮时，THE Content SHALL 发送 REQUEST_ACTION 消息到 Background
2. WHEN Background 收到 advanced-clean 请求时，THE Background SHALL 检查 Pro 权限或试用次数
3. WHEN Pro 用户使用高级清洗时，THE Background SHALL 不消耗试用次数
4. WHEN Free 用户使用高级清洗时，THE Background SHALL 检查并消耗试用次数
5. WHEN 清洗成功时，THE Background SHALL 返回清洗后的文本数据
6. WHEN 清洗成功时，THE Content SHALL 更新 Preview_Panel 显示清洗后的文本

### 需求 3：预览面板按钮文案优化

**用户故事：** 作为用户，我想看到简洁明了的按钮文案，以便快速理解按钮功能。

#### 验收标准

1. THE Preview_Panel SHALL 使用简洁的按钮文案，确保不换行
2. WHEN 按钮文本为"高级清洗（Pro）"时，THE Button SHALL 精简为"🧹 清洗"
3. WHEN 按钮文本为"导出"时，THE Button SHALL 保持为"📤 导出"
4. WHEN 按钮文本为"复制到剪贴板"时，THE Button SHALL 精简为"📄 复制"
5. THE Button_Container SHALL 确保三个按钮在一行内显示，不换行

### 需求 4：Pro 状态一致性

**用户故事：** 作为开发者，我想确保 Pro 状态在整个系统中保持一致，以便避免状态不同步问题。

#### 验收标准

1. THE Pro_State SHALL 存储在 chrome.storage.local 的 'pro_state' 键中
2. WHEN Pro_State 更新时，THE System SHALL 确保所有模块读取到最新状态
3. THE Background SHALL 通过 allow() 函数统一检查 Pro 权限
4. THE Popup SHALL 通过读取 storage 获取 Pro 状态，不依赖 Background 消息
5. WHEN 用户点击升级按钮时，THE System SHALL 更新 Pro_State 并提示用户刷新页面

### 需求 5：Pro 状态加密存储

**用户故事：** 作为开发者，我想使用加密方式存储 Pro 状态，以便提高安全性和防止篡改。

#### 验收标准

1. THE System SHALL 使用加密算法存储 Pro_State 到 storage
2. WHEN 写入 Pro_State 时，THE System SHALL 先加密数据再存储
3. WHEN 读取 Pro_State 时，THE System SHALL 先解密数据再使用
4. THE Encryption_Key SHALL 使用固定的密钥或派生密钥
5. WHEN 解密失败时，THE System SHALL 返回默认的 Free 用户状态
