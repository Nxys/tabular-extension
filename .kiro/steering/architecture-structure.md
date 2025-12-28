---
inclusion: always
---

# Chrome 插件架构规范

## 核心架构：三层分离

1. **Background**：唯一业务与状态源（业务逻辑、状态管理、策略决策）
2. **Content**：无业务无状态（页面交互、数据提取、UI 渲染）
3. **Shared**：协议层（类型定义、枚举、跨模块常量）

**依赖规则**：Background/Content → Shared ✓ | Background ↔ Content ✗

**通信方式**：仅通过消息协议（REQUEST_ACTION / ACTION_RESULT），禁止直接导入

## 目录结构

```
src/
├─ background/      # 业务逻辑层（usage/pro/settings/storage）
├─ content/         # UI 交互层（selection/extractor/panel + content.css）
├─ popup/           # 设置界面
├─ shared/          # 协议层（types/constants）
├─ images/          # 图标资源
└─ manifest.json    # 插件配置
```


## 层职责

### Background（业务逻辑层）
✓ 业务逻辑、状态管理、消息路由、生成文案、决定 uiAction
✗ 暴露业务逻辑给 Content

### Content（UI 交互层）
✓ 页面交互、DOM 提取、发送消息、根据 uiAction 渲染 UI
✗ 业务判断、访问 storage、import background、拼装文案、自行决定 UI

### Shared（协议层）
✓ 消息协议、枚举、跨层类型、跨模块常量
✗ 业务逻辑、状态管理、业务常量（应在对应模块中定义）

## 消息协议

**Content → Background**：`REQUEST_ACTION { action: ActionType, data? }`
**Background → Content**：`ACTION_RESULT { status, uiAction, data?, uiData? }`

**流程**：用户交互 → Content 发送请求 → Background 执行逻辑 → 返回结果（含 uiAction）→ Content 无条件渲染

## 关键约束

1. **UI 决策权在 Background**：Content 只能无条件执行 uiAction，不得根据 status 自行决定 UI
2. **Usage 消耗时机**：仅在 status === 'ok' 时消耗，limited/blocked 不消耗
3. **异常处理**：必须返回合法 ACTION_RESULT，兜底格式 `{ status: 'blocked', uiAction: 'SHOW_RESULT_PANEL', uiData: { message } }`
4. **Content 层冻结**：禁止新增业务逻辑、判断或文案拼装
5. **样式管理**：所有样式集中在 `content.css`
6. **常量定义**：业务常量在对应模块，constants.ts 仅存跨模块常量

## 检查清单

修改代码前确认：
✅ 业务逻辑在 Background | ✅ Content 无业务判断 | ✅ Content 不访问 storage | ✅ Content 不 import background | ✅ 通过消息协议通信 | ✅ uiAction 控制 UI | ✅ Background 生成文案 | ✅ 跨层类型在 shared/types.ts | ✅ 业务常量在对应模块 | ✅ 异常返回合法 ACTION_RESULT
