---
inclusion: always
---

# Chrome 插件架构规范

## 源码目录结构

```
src/
├─ manifest.json
│
├─ background/                      # ✅ 唯一业务与状态源
│  ├─ index.ts                      # Background 入口 + 消息分发
│  ├─ usage.ts                      # 使用次数 + 策略（合并版）
│  ├─ pro.ts                        # Pro 判断（合并版，未实现也可占位）
│  ├─ settings.ts                   # 插件设置（开关 / 面板位置）
│  └─ storage.ts                    # chrome.storage 统一封装
│
├─ content/                         # ❌ 无业务、无状态
│  ├─ content.ts                    # Content 入口（事件监听 / 消息）
│  ├─ content.css                   # Content 样式：框选样式、面板样式
│  ├─ selection.ts                  # 框选逻辑
│  ├─ extractor.ts                  # 页面数据提取（核心资产）
│  │                                # - DOM 信息采集
│  │                                # - 排版结构分析
│  │                                # - 数据格式化
│  └─ panel.ts                      # 面板调度（创建 / 销毁）
│                                   # - 成功结果 UI
│                                   # - 免费用尽 UI
│                                   # - 升级 Pro UI
│
├─ popup/                           # 🟨 独立壳层（只读状态）
│  ├─ popup.html
│  └─ popup.ts                      # 设置变更 + 状态查询
│
├─ shared/                          # 🛡️ 协议护城河
│  └─ types.ts                      # 跨层类型定义、枚举
│                                   # - 消息协议
│                                   # - Action 枚举
│                                   # - UI Action 枚举
│                                   # - 其他跨层类型
│
└─ images/                          # 🟦 插件图标
   └─ icon.html
```

## 架构原则

### Background 层（唯一业务与状态源）

**职责**：
- 所有业务逻辑判断
- 所有状态管理（usage、pro、storage）
- 所有策略决策（policy、strategy）
- 消息路由和 Action 处理

**禁止**：
- 不得将业务逻辑暴露给 content 层
- 不得让 content 层直接访问 storage

### Content 层（无业务、无状态）

**职责**：
- 页面感知（selection、DOM 操作）
- 数据提取（extractor - 核心资产）
- 发送 REQUEST_ACTION 消息
- 根据 uiAction 渲染 UI（无条件执行）

**禁止**：
- 不得包含任何业务逻辑判断
- 不得读取 usage、pro、policy、strategy
- 不得直接访问 chrome.storage.local 读取业务数据
- 不得根据 status 进行二次判断
- 不得拼装业务相关文案（如 "剩余 X 次"）
- 不得 import background 下的任何文件

### Shared 层（协议护城河）

**职责**：
- 消息协议定义（REQUEST_ACTION、ACTION_RESULT）
- 枚举类型定义（ActionType、UIAction、ActionStatus）
- 跨层纯类型定义
- 所有类型定义集中在 types.ts 中

**禁止**：
- 不得包含业务逻辑
- 不得包含状态管理
- 不得包含 usage、pro、policy、strategy 相关定义
- 不得暴露业务概念（freeCount、limit、planType）到 content 层

## 文件职责说明

### Background 层文件

**index.ts**：
- Background 入口
- 消息监听和分发
- Action 请求处理
- 统一异常兜底

**usage.ts**（合并版）：
- 使用次数管理（check / consume / record）
- 免费策略定义（maxPerDay 等）
- 跨天重置逻辑
- 使用统计数据

**pro.ts**（合并版）：
- Pro 权限判断（allow / verify）
- 功能权限映射
- 签名验证
- 使用模式检测

**settings.ts**：
- 插件设置管理
- 开关状态（enabled）
- 面板位置（panelPosition）

**storage.ts**：
- chrome.storage.local 统一封装
- 提供 get / set / remove 等方法
- 内存降级存储

### Content 层文件

**content.ts**：
- Content 入口
- 事件监听（mousedown / mousemove / mouseup）
- 消息发送（REQUEST_ACTION）
- UI Action 执行（根据 uiAction 调用 panel）

**selection.ts**：
- 框选逻辑
- 选择区域计算
- 选择框渲染

**extractor.ts**（合并版）：
- DOM 信息采集（collect）
- 排版结构分析（layout）
- 数据格式化（format）
- 表格检测、对齐、CSV 导出

**panel.ts**（合并版）：
- 面板创建和销毁
- 成功结果 UI（showResult）
- 免费用尽 UI（showLimit）
- 升级 Pro UI（showPro）
- 面板拖动、定位等交互

**content.css**：
- 框选样式
- 面板样式
- 所有 content 层的 CSS

### Shared 层文件

**types.ts**（合并版）：
- 消息协议（RequestActionMessage、ActionResultMessage）
- Action 枚举（ActionType）
- UI Action 枚举（UIAction、ActionStatus）
- 其他跨层类型（SelectionRect、PluginSettings 等）

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
    status: ActionStatus,  // 'ok' | 'limited' | 'blocked'
    uiAction: UIAction,    // 'SHOW_RESULT_PANEL' | 'SHOW_LIMIT_PANEL' | 'SHOW_PRO_PANEL'
    data?: unknown,
    uiData?: {
      text?: string,
      table?: string[][],
      csv?: string,
      message?: string  // 由 background 生成的完整文案
    }
  }
}
```

## 关键约束

### UI 决策权

- Content 不得根据 status 自行决定展示哪种 UI
- Content 只能无条件执行 background 下发的 uiAction
- uiAction 是枚举值，不是布尔或文案

### Usage 消耗时机

- usage 的 consume / record 只能在 action 成功执行后（status === 'ok'）
- 当 status 为 'limited' 或 'blocked' 时，不得消耗或记录 usage
- checkUsage 是前置判断，consumeUsage 是成功后的副作用

### 异常处理

- 所有异常路径必须返回合法的 ACTION_RESULT
- 禁止返回 undefined 或非协议对象
- 兜底格式：`{ status: 'blocked', uiAction: 'SHOW_RESULT_PANEL', uiData: { message: '通用错误提示' } }`

### Content 冻结点

- 架构重构完成后，content 层进入冻结状态
- 禁止在 content 层新增任何业务逻辑、判断或文案拼装
- 后续功能扩展只能通过 background 完成

## 文件命名规范

- 测试文件：与源文件同名，后缀 `.test.ts`，放在 `test/` 目录
- 类型定义：集中在 `shared/types.ts`
- 样式文件：`content.css`

## 依赖关系

```
background/ ──┐
              ├──> shared/types.ts
content/   ───┘

background/ ✗ content/  (禁止)
content/    ✗ background/  (禁止)
```

## 测试策略

- **Background 层**：单元测试覆盖率 90%+
- **Content 层**：单元测试覆盖率 85%+
- **Shared 层**：100%（纯类型定义）
- **属性测试**：最少 100 次迭代
- **架构守门测试**：强制执行，禁止跳过
