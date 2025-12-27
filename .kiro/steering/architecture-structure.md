---
inclusion: always
---

# Chrome 插件架构规范

## 核心架构原则

### 三层分离架构

1. **Background 层**：唯一业务与状态源，负责所有业务逻辑、状态管理、策略决策
2. **Content 层**：无业务无状态，仅负责页面交互、数据提取、UI 渲染
3. **Shared 层**：协议护城河，仅包含类型定义、枚举、跨模块常量

### 依赖规则

```
background/ ──┐
              ├──> shared/ (允许)
content/   ───┘

background/ ✗ content/  (严格禁止)
content/    ✗ background/  (严格禁止)
```

### 通信方式

- 层间通信：仅通过消息协议（REQUEST_ACTION / ACTION_RESULT）
- 禁止直接函数调用或模块导入

## 目录结构

```
src/
├─ background/         # 业务逻辑层
│  ├─ index.ts         # 消息分发、异常兜底
│  ├─ usage.ts         # 使用次数管理、免费策略
│  ├─ pro.ts           # Pro 权限判断
│  ├─ settings.ts      # 插件设置管理
│  └─ storage.ts       # chrome.storage 封装
│
├─ content/            # UI 交互层
│  ├─ index.ts         # 事件监听、消息发送
│  ├─ selection.ts     # 框选逻辑
│  ├─ extractor.ts     # DOM 数据提取（核心）
│  ├─ panel.ts         # 面板渲染
│  └─ content.css      # 所有样式
│
├─ popup/              # 设置界面
│  ├─ popup.html
│  └─ popup.ts
│
├─ shared/             # 协议层
│  ├─ types.ts         # 消息协议、枚举、跨层类型
│  └─ constants.ts     # 跨模块常量（非业务常量）
│
├─ images/             # 图片资源
│  └─ icon.html        # 插件图标（SVG 格式）
│
└─ manifest.json       # Chrome 插件配置清单
```


## 层职责与约束

### Background 层（业务逻辑层）

**必须做**：
- 所有业务逻辑判断（usage 检查、pro 验证、策略决策）
- 所有状态管理（通过 storage.ts 统一访问 chrome.storage）
- 消息路由和 Action 处理
- 生成所有业务文案（如 "剩余 X 次"）
- 决定 UI 展示类型（通过 uiAction 枚举）

**严格禁止**：
- 将业务逻辑暴露给 content 层
- 让 content 层直接访问 storage

### Content 层（UI 交互层）

**必须做**：
- 页面交互（框选、拖动等）
- DOM 数据提取（extractor.ts 是核心资产）
- 发送 REQUEST_ACTION 消息
- 根据 uiAction 无条件渲染 UI

**严格禁止**：
- 包含任何业务逻辑判断
- 读取 usage、pro、policy、strategy
- 直接访问 chrome.storage.local
- 根据 status 自行决定展示哪种 UI
- 拼装业务文案（如 "剩余 X 次"）
- import background 下的任何文件
- 在架构重构完成后新增业务逻辑

### Shared 层（协议层）

**必须做**：
- 定义消息协议（RequestActionMessage、ActionResultMessage）
- 定义枚举（ActionType、UIAction、ActionStatus）
- 定义跨层类型（SelectionRect、PluginSettings 等）
- 定义真正跨模块的常量（UI 常量、配置默认值等）

**严格禁止**：
- 包含业务逻辑或状态管理
- 包含 usage、pro、policy、strategy 相关定义
- 暴露业务概念（freeCount、limit、planType）
- 在 constants.ts 中存储业务常量（业务常量应在对应模块中定义）

### Manifest 配置文件（manifest.json）

**职责**：
- Chrome 插件的配置清单
- 声明插件权限、脚本加载、图标等元信息

**必须做**：
- 使用 Manifest V3 规范
- 正确配置 background service worker
- 正确配置 content scripts 注入规则
- 声明必要的权限（storage、activeTab 等）
- 配置插件图标路径

**严格禁止**：
- 使用已废弃的 Manifest V2 语法
- 声明不必要的权限
- 硬编码业务逻辑相关的配置

**关键配置项**：
```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background/index.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/index.js"],
    "css": ["content/content.css"]
  }],
  "permissions": ["storage", "activeTab"],
  "icons": {
    "16": "images/icon.html",
    "48": "images/icon.html",
    "128": "images/icon.html"
  }
}
```

### 图标资源（images/icon.html）

**职责**：
- 提供插件图标的 SVG 实现
- 支持多种尺寸的图标显示

**必须做**：
- 使用 SVG 格式以支持任意缩放
- 保持图标简洁清晰
- 确保在不同背景下可见

**严格禁止**：
- 包含业务逻辑或脚本
- 使用外部资源引用
- 过度复杂的图形设计

**注意事项**：
- Chrome 插件可以使用 HTML 文件作为图标（内嵌 SVG）
- 图标应该在浅色和深色主题下都清晰可见

## 消息通信协议

### Content → Background

```typescript
{
  type: 'REQUEST_ACTION',
  payload: {
    action: ActionType,  // 'text-extract' | 'table-detect' | 'column-align' | 'csv-export'
    data?: unknown
  }
}
```

### Background → Content

```typescript
{
  type: 'ACTION_RESULT',
  payload: {
    status: ActionStatus,     // 'ok' | 'limited' | 'blocked'
    uiAction: UIAction,       // 'SHOW_RESULT_PANEL' | 'SHOW_LIMIT_PANEL' | 'SHOW_PRO_PANEL'
    data?: unknown,
    uiData?: {
      text?: string,
      table?: string[][],
      csv?: string,
      message?: string        // Background 生成的完整文案
    }
  }
}
```

### 消息流向

1. 用户交互 → Content 监听事件
2. Content 发送 REQUEST_ACTION → Background
3. Background 执行业务逻辑、状态检查、策略决策
4. Background 返回 ACTION_RESULT（含 status、uiAction、uiData）→ Content
5. Content 根据 uiAction 无条件渲染 UI

## 关键约束（AI 助手必读）

### 1. UI 决策权在 Background

- Content 不得根据 status 自行决定展示哪种 UI
- Content 只能无条件执行 Background 下发的 uiAction
- uiAction 是枚举值，不是布尔或文案

### 2. Usage 消耗时机

- usage 的 consume/record 只能在 action 成功后（status === 'ok'）
- status 为 'limited' 或 'blocked' 时，不得消耗 usage
- checkUsage 是前置判断，consumeUsage 是成功后的副作用

### 3. 异常处理

- 所有异常路径必须返回合法的 ACTION_RESULT
- 禁止返回 undefined 或非协议对象
- 兜底格式：`{ status: 'blocked', uiAction: 'SHOW_RESULT_PANEL', uiData: { message: '错误提示' } }`

### 4. Content 层冻结

- 架构重构完成后，content 层进入冻结状态
- 禁止在 content 层新增业务逻辑、判断或文案拼装
- 后续功能扩展只能通过 background 完成

### 5. 样式管理

- 所有 Content 层样式集中在 `content.css`
- 包括框选样式、面板样式等所有 UI 样式

### 6. 常量定义位置

- 业务常量定义在对应业务模块中（如 usage.ts 中的 maxPerDay）
- constants.ts 只存储真正跨模块的常量
- 如果常量只在一个模块使用，就定义在该模块内部

## 文件命名与组织

### 测试文件

- 位置：每个模块下的 `__test__/` 目录
- 命名：与源文件同名，后缀 `.test.ts`
- 示例：`src/background/__test__/usage.test.ts` 对应 `src/background/usage.ts`

### 测试覆盖率要求

- Background 层：90%+
- Content 层：85%+
- Shared 层：100%（纯类型定义）
- 属性测试：最少 100 次迭代
- 架构守门测试：强制执行，禁止跳过

### 代码规范

- 所有代码和注释使用中文
- TypeScript 严格模式
- 禁止使用 any 类型（除非必要且有注释说明）
- 所有导出的函数和类型必须有中文注释

## 被明确否定的设计（AI 助手必须避免）

### ❌ Content 层包含业务逻辑
- 违反职责分离，导致逻辑分散
- 正确做法：所有业务逻辑集中在 Background

### ❌ Content 层直接访问 storage
- 破坏状态管理的单一来源
- 正确做法：通过消息向 Background 请求数据

### ❌ Shared 层包含业务逻辑或状态
- 违反协议层纯粹性
- 正确做法：Shared 层只包含类型定义和协议

### ❌ Content 层根据 status 自行决定 UI
- 违反 UI 决策权在 Background 的原则
- 正确做法：Background 通过 uiAction 明确指定 UI

### ❌ 在多个文件中分散定义类型
- 导致类型定义混乱
- 正确做法：跨层类型集中在 `shared/types.ts`，模块内部类型可在模块内定义

### ❌ 滥用 constants.ts 存储业务常量
- 业务常量应与业务逻辑放在一起
- 正确做法：业务常量定义在对应模块中，constants.ts 只存储跨模块常量

## AI 助手工作检查清单

修改代码前，请确认：

1. ✅ 业务逻辑是否都在 Background 层？
2. ✅ Content 层是否没有业务判断？
3. ✅ Content 层是否没有直接访问 storage？
4. ✅ Content 层是否没有 import background 文件？
5. ✅ 是否通过消息协议通信？
6. ✅ UI 决策是否由 Background 的 uiAction 控制？
7. ✅ 业务文案是否由 Background 生成？
8. ✅ 类型定义是否在 shared/types.ts？
9. ✅ 业务常量是否在对应业务模块中？
10. ✅ 异常处理是否返回合法的 ACTION_RESULT？
