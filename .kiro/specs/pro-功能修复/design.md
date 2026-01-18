# 设计文档

## 概述

本设计文档针对 Pro 功能的三个核心问题提供解决方案：
1. Popup 界面 Pro 状态展示
2. 高级清洗功能修复
3. 预览面板按钮文案优化
4. Pro 状态加密存储

设计遵循三层分离架构原则，确保业务逻辑集中在 Background 层，Content 层仅负责 UI 渲染。

## 架构

### 三层分离原则

```
┌─────────────────────────────────────────────────────────┐
│                        Popup                            │
│  - 读取 Pro 状态（直接访问 storage）                      │
│  - 显示 Pro 状态 UI                                      │
│  - 升级按钮状态控制                                       │
└─────────────────────────────────────────────────────────┘
                            │
                            │ chrome.storage.local
                            ↓
┌─────────────────────────────────────────────────────────┐
│                      Background                         │
│  - Pro 状态加密/解密                                      │
│  - 高级清洗业务逻辑                                       │
│  - 消息路由和处理                                         │
│  - 生成 UI 文案                                          │
└─────────────────────────────────────────────────────────┘
                            │
                            │ 消息协议
                            ↓
┌─────────────────────────────────────────────────────────┐
│                       Content                           │
│  - 接收用户交互                                          │
│  - 发送 REQUEST_ACTION                                  │
│  - 根据 uiAction 渲染 UI                                │
│  - 按钮文案精简                                          │
└─────────────────────────────────────────────────────────┘
```

### 数据流

1. **Popup 初始化流程**：
   ```
   Popup 启动 → 读取加密的 Pro_State → 解密 → 更新 UI
   ```

2. **高级清洗流程**：
   ```
   用户点击按钮 → Content 发送 REQUEST_ACTION
   → Background 检查权限 → 执行清洗 → 返回 ACTION_RESULT
   → Content 渲染结果
   ```

3. **升级 Pro 流程**：
   ```
   用户点击升级 → 加密 Pro_State → 写入 storage → 提示刷新
   ```

## 组件和接口

### 1. Pro 状态加密模块（Background）

**位置**：`src/background/crypto.ts`（新建）

**职责**：
- 提供 Pro 状态的加密和解密功能
- 使用 AES-GCM 算法
- 密钥派生和管理

**接口**：

```typescript
/**
 * 加密 Pro 状态
 * @param state Pro 状态对象
 * @returns 加密后的字符串
 */
export async function encryptProState(state: ProState): Promise<string>

/**
 * 解密 Pro 状态
 * @param encrypted 加密的字符串
 * @returns Pro 状态对象，解密失败返回 null
 */
export async function decryptProState(encrypted: string): Promise<ProState | null>

/**
 * 派生加密密钥
 * @returns 密钥
 */
async function deriveKey(): Promise<CryptoKey>
```

**实现细节**：
- 使用 Web Crypto API 的 AES-GCM 算法
- 密钥通过固定盐值派生（使用扩展 ID 作为盐）
- 每次加密生成新的 IV（初始化向量）
- 加密格式：`base64(iv + encrypted_data)`

### 2. Pro 模块更新（Background）

**位置**：`src/background/pro.ts`

**修改**：
- 更新 `getProState()` 函数，使用解密读取
- 添加 `setProState()` 函数，使用加密写入
- 保持 `allow()` 函数接口不变

**新增接口**：

```typescript
/**
 * 设置 Pro 状态（加密存储）
 * @param state Pro 状态
 */
export async function setProState(state: ProState): Promise<void>
```

### 3. Popup 模块更新

**位置**：`src/popup/popup.ts`

**修改**：
- 添加 `loadProState()` 函数，读取并解密 Pro 状态
- 更新 `updateTrialDisplay()` 函数，根据 Pro 状态显示不同内容
- 更新升级按钮逻辑，使用加密存储

**新增函数**：

```typescript
/**
 * 加载 Pro 状态
 * @returns Pro 状态
 */
async function loadProState(): Promise<ProState>

/**
 * 更新 Pro 状态显示
 * @param isPro 是否为 Pro 用户
 */
function updateProDisplay(isPro: boolean): void
```

### 4. Content Panel 模块更新

**位置**：`src/content/panel.ts`

**修改**：
- 更新按钮创建函数，使用精简文案
- 确保按钮容器样式支持一行显示

**按钮文案映射**：
- "高级清洗（Pro）" → "🧹 清洗"
- "导出" → "📤 导出"
- "复制到剪贴板" → "📄 复制"

### 5. Content 消息处理更新

**位置**：`src/content/content.ts`

**修改**：
- 确保高级清洗按钮点击时正确发送 `REQUEST_ACTION` 消息
- 消息格式：`{ type: 'REQUEST_ACTION', payload: { action: 'advanced-clean', data: { text, rules } } }`

## 数据模型

### Pro 状态（ProState）

```typescript
interface ProState {
  isPro: boolean;           // 是否为 Pro 用户
  signature: string;        // 签名（用于验证）
  features: Record<ProFeature, boolean>;  // 功能权限映射
}
```

### 加密存储格式

```typescript
interface EncryptedStorage {
  pro_state: string;  // 加密后的 Pro 状态（base64 编码）
}
```

### 清洗请求数据

```typescript
interface AdvancedCleanRequest {
  text: string;              // 原始文本
  rules: CleaningRules;      // 清洗规则
}
```

## 正确性属性

*属性是一种特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*


### 属性 1：Popup 正确读取 Pro 状态

*对于任意* Pro 状态（isPro 为 true 或 false），当 Popup 初始化时，应该从 storage 中正确读取并解密该状态。

**验证：需求 1.1**

### 属性 2：Popup UI 根据 Pro 状态正确渲染

*对于任意* Pro 状态，Popup 的 UI 应该根据 isPro 标志正确显示：
- 当 isPro 为 true 时，显示"已开启 Pro"，升级按钮禁用或显示"已激活"，试用次数显示"无限使用"
- 当 isPro 为 false 时，显示试用次数和"升级到 Pro 版"按钮

**验证：需求 1.2, 1.3, 1.4, 1.5**

### 属性 3：高级清洗消息正确发送

*对于任意* 清洗请求（包含文本和规则），当用户点击高级清洗按钮时，Content 应该发送包含正确 action 和 data 的 REQUEST_ACTION 消息。

**验证：需求 2.1**

### 属性 4：Background 正确检查权限

*对于任意* advanced-clean 请求，Background 应该检查 Pro 权限或试用次数，并根据结果决定是否执行清洗。

**验证：需求 2.2**

### 属性 5：Pro 用户不消耗试用次数

*对于任意* Pro 用户（isPro 为 true），使用高级清洗功能时，试用次数应该保持不变。

**验证：需求 2.3**

### 属性 6：Free 用户消耗试用次数

*对于任意* Free 用户（isPro 为 false）且有剩余试用次数，使用高级清洗功能时，试用次数应该减少 1。

**验证：需求 2.4**

### 属性 7：清洗功能正确处理文本

*对于任意* 输入文本和清洗规则，清洗功能应该返回符合规则的处理后文本。

**验证：需求 2.5**

### 属性 8：Content 正确更新面板

*对于任意* 清洗结果，Content 应该更新 Preview_Panel 显示清洗后的文本。

**验证：需求 2.6**

### 属性 9：按钮文案精简且不换行

*对于所有* 预览面板按钮，文案应该精简为：
- 高级清洗按钮："🧹 清洗"
- 导出按钮："📤 导出"
- 复制按钮："📄 复制"

且三个按钮应该在一行内显示，不换行。

**验证：需求 3.1, 3.2, 3.3, 3.4, 3.5**

### 属性 10：Pro 状态存储位置正确

*对于任意* Pro 状态，应该存储在 chrome.storage.local 的 'pro_state' 键中。

**验证：需求 4.1**

### 属性 11：Pro 状态更新后所有模块读取一致

*对于任意* Pro 状态更新，所有模块（Popup、Background）读取到的状态应该一致。

**验证：需求 4.2**

### 属性 12：权限检查统一使用 allow() 函数

*对于所有* Pro 功能权限检查，Background 应该统一调用 allow() 函数。

**验证：需求 4.3**

### 属性 13：Popup 直接访问 storage

Popup 应该直接读取 storage 获取 Pro 状态，而不是通过 Background 消息。

**验证：需求 4.4**

### 属性 14：升级按钮正确更新状态

*对于任意* 用户点击升级按钮，系统应该更新 Pro_State 并提示用户刷新页面。

**验证：需求 4.5**

### 属性 15：Pro 状态加密存储

*对于任意* Pro 状态，存储在 storage 中的值应该是加密的，而不是明文。

**验证：需求 5.1**

### 属性 16：加密解密往返一致性

*对于任意* Pro 状态，加密后再解密应该得到相同的状态对象（round-trip property）。

**验证：需求 5.2, 5.3**

### 属性 17：加密密钥派生一致性

加密密钥应该使用固定的派生方式（基于扩展 ID），确保每次派生的密钥相同。

**验证：需求 5.4**

### 属性 18：解密失败返回默认状态

*对于任意* 无效的加密数据，解密失败时应该返回默认的 Free 用户状态（isPro: false）。

**验证：需求 5.5**

## 错误处理

### 1. 加密解密错误

**场景**：加密或解密过程中发生错误

**处理策略**：
- 加密失败：记录错误日志，抛出异常
- 解密失败：记录错误日志，返回默认 Free 用户状态
- 确保系统降级运行，不阻塞用户操作

### 2. Storage 访问错误

**场景**：读取或写入 storage 失败

**处理策略**：
- 读取失败：返回默认状态
- 写入失败：记录错误日志，提示用户重试
- 使用 try-catch 包裹所有 storage 操作

### 3. 消息通信错误

**场景**：Content 和 Background 消息传递失败

**处理策略**：
- 发送失败：显示错误提示
- 接收失败：返回兜底的 ACTION_RESULT
- 确保返回合法的消息格式

### 4. UI 渲染错误

**场景**：Popup 或 Panel 渲染失败

**处理策略**：
- 捕获渲染错误，显示友好提示
- 确保部分失败不影响其他功能
- 记录错误日志用于调试

## 测试策略

### 单元测试

**覆盖范围**：
- 加密解密函数（crypto.ts）
- Pro 状态读写函数（pro.ts）
- 消息处理函数（background/index.ts）
- UI 渲染函数（popup.ts, panel.ts）

**测试重点**：
- 边界条件：空字符串、特殊字符、超长文本
- 错误情况：无效数据、解密失败、storage 错误
- 状态转换：Free → Pro、Pro → Free

### 属性测试

**配置**：
- 使用 fast-check 库（TypeScript）
- 每个属性测试运行 100 次迭代
- 标签格式：`Feature: pro-功能修复, Property N: [属性描述]`

**测试属性**：
1. 属性 16（加密解密往返）- 高优先级
2. 属性 2（Popup UI 渲染）
3. 属性 5 和 6（试用次数消耗）
4. 属性 11（状态一致性）

### 集成测试

**测试场景**：
1. 完整的升级流程：点击升级 → 状态更新 → UI 刷新
2. 完整的清洗流程：点击按钮 → 发送消息 → 执行清洗 → 更新 UI
3. Pro 状态持久化：写入 → 关闭 → 重新打开 → 验证状态

### 手动测试

**测试清单**：
- [ ] Popup 显示 Pro 状态正确
- [ ] 升级按钮在 Pro 状态下禁用
- [ ] 高级清洗功能正常工作
- [ ] 按钮文案精简且不换行
- [ ] Pro 状态加密存储（检查 storage 内容）
- [ ] 刷新页面后状态保持

## 实现注意事项

### 1. 遵循架构规范

- **Background**：所有业务逻辑、状态管理、加密解密
- **Content**：仅 UI 渲染，不做业务判断
- **Popup**：直接访问 storage，不通过 Background 消息
- **消息协议**：Content ↔ Background 仅通过 REQUEST_ACTION / ACTION_RESULT

### 2. 加密实现

- 使用 Web Crypto API（浏览器原生支持）
- 算法：AES-GCM（认证加密）
- 密钥派生：PBKDF2 + 扩展 ID 作为盐
- IV：每次加密生成新的随机 IV
- 格式：base64(iv + encrypted_data)

### 3. 向后兼容

- 检测旧版本的明文 Pro_State
- 自动迁移到加密格式
- 迁移失败时使用默认状态

### 4. 性能考虑

- 加密解密操作异步执行
- 缓存解密后的状态（内存中）
- 避免频繁读写 storage

### 5. 安全考虑

- 密钥不硬编码在代码中
- 使用扩展 ID 派生密钥（每个安装唯一）
- 加密数据包含认证标签（防篡改）
- 解密失败时降级到 Free 状态（安全默认）
