# 项目结构

## 🏗️ 整体架构（极简分类）

```
./
├─ src/                   # 📝 源码（开发，包含图标资源）
├─ tests/                  # 🧪 测试（单元测试）
├─ build/                 # 🔧 构建（编译打包）
└─ docs/                  # 📚 文档（说明指南）
```

## 📝 源码目录（src/）

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
│  ├─ index.ts                      # Content 入口（事件监听 / 消息）
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
│  ├─ types.ts                      # 跨层类型定义、枚举
│  │                                # - 消息协议
│  │                                # - Action 枚举
│  │                                # - UI Action 枚举
│  │                                # - 其他跨层类型
│  └─ constants.ts                  # 跨层常量定义
│                                   # - 跨模块共享的常量
│                                   # - 配置常量
│
└─ images/                          # 🟦 插件图标
   └─ icon.html
```

## 📋 文件职责说明

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

**index.ts**：
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

**types.ts**：
- 消息协议（RequestActionMessage、ActionResultMessage）
- Action 枚举（ActionType）
- UI Action 枚举（UIAction、ActionStatus）
- 其他跨层类型（SelectionRect、PluginSettings 等）

**constants.ts**：
- 跨模块共享的常量
- 配置常量（如默认值、限制值等）
- 注意：业务常量应定义在对应的业务模块中（如 usage.ts 中的 maxPerDay）

### Popup 层文件

**popup.html**：
- 弹出窗口 HTML 结构
- 设置界面布局

**popup.ts**：
- 弹出窗口脚本
- 设置变更处理
- 状态查询和显示

## 🧪 测试目录（tests/）

```
tests/
├─ setup.ts                      # 测试配置（Jest + jsdom）
├─ structure.test.ts             # 结构测试（文件组织验证）
├─ manifest.test.ts              # 清单测试（Manifest v3 验证）
├─ dependency.test.ts            # 依赖测试（无外部依赖验证）
├─ extension.test.ts             # 扩展功能测试（完整流程）
├─ content-integration.test.ts   # 内容脚本集成测试
├─ table-detect.test.ts          # 表格检测单元测试
├─ table-detect.property.test.ts # 表格检测属性测试（fast-check）
├─ table-align.test.ts           # 列对齐单元测试
├─ table-align.property.test.ts  # 列对齐属性测试
├─ table-csv.test.ts             # CSV 导出单元测试
├─ table-csv.property.test.ts    # CSV 导出属性测试
├─ table-integration.test.ts     # 表格模块集成测试
├─ usage.test.ts                 # 使用统计单元测试
├─ storage.test.ts               # 存储模块单元测试
├─ policy.test.ts                # 策略模块单元测试
├─ usage-upgrade.test.ts         # 使用升级测试
├─ pro-gate.test.ts              # Pro 门控单元测试
├─ pro-gate-usage.test.ts        # Pro 门控使用测试
├─ pro-strategy.test.ts          # Pro 策略单元测试
├─ panel.test.ts                 # 面板单元测试
├─ panel-pro.test.ts             # 面板 Pro 功能测试
├─ panel-usage-info.test.ts      # 面板使用信息测试
├─ e2e-property.test.ts          # 端到端属性测试
└─ coverage/                     # 测试覆盖率报告
```

**测试统计**：39 个测试用例，覆盖单元测试、属性测试、集成测试和端到端测试。

## 🔧 构建目录（build/）

```
build/
├─ extension.cjs       # 扩展构建脚本
├─ merge.cjs           # 合并脚本（将组件合并为单个content.js）
├─ icon.cjs            # 图标生成脚本
├─ zip.cjs             # 打包脚本
├─ dist/               # 编译输出（TypeScript编译后的模块）
│  ├─ types.js/.d.ts
│  ├─ background.js/.d.ts
│  ├─ content/
│  │  ├─ content.js/.d.ts
│  │  ├─ selection.js/.d.ts
│  │  ├─ extractor.js/.d.ts
│  │  └─ panel.js/.d.ts
│  └─ popup/
│     └─ popup.js/.d.ts
└─ extension/          # 打包输出（最终发布包）
   ├─ manifest.json
   ├─ background.js
   ├─ content/
   │  ├─ content.js    # 合并后的单个文件（MVP设计）
   │  └─ content.css
   ├─ popup/
   │  ├─ popup.js
   │  └─ popup.html
   └─ images/
      ├─ icon16.png
      ├─ icon32.png
      ├─ icon48.png
      └─ icon128.png
```

## 🎨 图标资源（src/images/）

```
src/images/
├─ icon.html          # 图标生成工具（包含SVG模板）
├─ icon16.png         # 16x16 图标
├─ icon32.png         # 32x32 图标
├─ icon48.png         # 48x48 图标
└─ icon128.png        # 128x128 图标
```

## 📚 文档目录（docs/）

```
docs/
├─ STRUCTURE.md        # 本文件（项目结构说明）
├─ PUBLISHING_GUIDE.md # 发布指南和检查清单
├─ RELEASE.md          # 技术发布文档
└─ report/             # 项目报告
   ├─ FINAL_ACCEPTANCE_REPORT.md
   ├─ PERFORMANCE_OPTIMIZATION_REPORT.md
   └─ VERIFICATION_REPORT.md
```

## 📦 核心文件（最终产物 - build/extension/）

```
build/extension/
├─ manifest.json      # 扩展清单
├─ background.js      # 后台脚本
├─ content/           # 内容脚本目录
│  ├─ content.js     # 合并后的单个文件（MVP设计）
│  └─ content.css    # 样式文件
├─ popup/             # 弹出窗口目录
│  ├─ popup.js       # 弹出脚本
│  └─ popup.html     # 弹出窗口
└─ images/            # 图标资源
   ├─ icon16.png      # 16x16 图标
   ├─ icon32.png      # 32x32 图标
   ├─ icon48.png      # 48x48 图标
   └─ icon128.png     # 128x128 图标
```

## 🎯 模块化设计原则

### 整体设计原则

1. **职责分离**：Background 层负责所有业务逻辑和状态管理，Content 层只负责页面交互和 UI 渲染，Shared 层只包含类型定义和协议
2. **单向依赖**：Background 和 Content 都依赖 Shared，但 Background 和 Content 之间禁止相互依赖
3. **消息驱动**：层与层之间通过消息通信，使用明确的协议格式，避免直接调用

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
- 跨模块共享的常量定义
- 类型定义集中在 types.ts 中
- 常量定义集中在 constants.ts 中

**禁止**：
- 不得包含业务逻辑
- 不得包含状态管理
- 不得包含 usage、pro、policy、strategy 相关定义
- 不得暴露业务概念（freeCount、limit、planType）到 content 层
- constants.ts 只存储真正跨模块的常量，业务常量应放在对应的业务模块中

### Popup 层（独立壳层）

**职责**：
- 提供快速配置入口
- 设置变更（enabled、panelPosition）
- 状态查询（只读）

**禁止**：
- 不得包含业务逻辑
- 不得直接修改 storage（通过 settings.ts）

### 依赖关系

```
background/ ──┐
              ├──> shared/types.ts
content/   ───┘

background/ ✗ content/  (禁止)
content/    ✗ background/  (禁止)
```

## 🔄 开发流程

```bash
# 1. 开发阶段 - 编辑 src/ 目录文件
npm run lint          # 代码检查

# 2. 测试阶段
npm run test          # 运行测试

# 3. 构建阶段
npm run build         # 编译到 build/dist/

# 4. 打包阶段  
npm run pack          # 生成 extension.zip

# 5. 发布阶段
npm run release       # 完整流程
```

## 📊 文件统计

| 分类 | 文件数 | 说明 |
|------|--------|------|
| 源码 | 20+ 个 | TypeScript 开发文件（按模块组织） |
| 图标 | 5 个 | 图标资源（模板 + PNG） |
| 测试 | 27 个 | 完整测试套件（39 个测试用例） |
| 构建 | 4 个 | 自动化构建脚本 |
| 文档 | 3 个 | 完整项目文档（排除 report） |

**设计理念**：
- **源码模块化组织**（提升可维护性）
  - Background 层：唯一业务与状态源
  - Content 层：无业务、无状态，只负责页面交互和 UI 渲染
  - Shared 层：协议护城河，只包含类型定义和协议
  - Popup 层：独立壳层，只读状态
- **职责分离**（清晰的架构边界）
  - Background 负责所有业务逻辑判断和状态管理
  - Content 根据 uiAction 无条件渲染 UI
  - Shared 定义跨层协议和类型
- **消息驱动**（层与层之间通过消息通信）
  - Content → Background：REQUEST_ACTION
  - Background → Content：ACTION_RESULT
- **样式提取到 CSS**（CSS 变量 + 媒体查询，自动主题切换）
- **图标资源集中管理**（src/images，紫色渐变风格）
- **测试独立管理**（单元测试 + 属性测试 + 集成测试）
- **最终产物按目录结构打包**（清晰的扩展结构）

## 🔒 关键约束

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

### 文件命名规范

- 测试文件：与源文件同名，后缀 `.test.ts`，放在 `tests/` 目录
- 类型定义：集中在 `shared/types.ts`
- 常量定义：跨模块常量集中在 `shared/constants.ts`，业务常量放在对应的业务模块中
- 样式文件：`content.css`

### 测试策略

- **Background 层**：单元测试覆盖率 90%+
- **Content 层**：单元测试覆盖率 85%+
- **Shared 层**：100%（纯类型定义）
- **属性测试**：最少 100 次迭代
- **架构守门测试**：强制执行，禁止跳过

## 🚫 被明确否定的设计方向

### 1. Content 层包含业务逻辑

**否定原因**：
- 违反职责分离原则
- 导致业务逻辑分散，难以维护
- 增加测试复杂度

**正确做法**：
- 所有业务逻辑集中在 Background 层
- Content 层只负责页面交互和 UI 渲染

### 2. Content 层直接访问 storage

**否定原因**：
- 破坏状态管理的单一来源
- 导致状态不一致
- 增加调试难度

**正确做法**：
- Content 层通过消息向 Background 请求数据
- Background 层统一管理 storage 访问

### 3. Shared 层包含业务逻辑或状态

**否定原因**：
- 违反协议层的纯粹性
- 导致跨层耦合
- 增加维护成本

**正确做法**：
- Shared 层只包含类型定义和协议
- 业务逻辑和状态管理都在 Background 层

### 4. Content 层根据 status 自行决定 UI

**否定原因**：
- 违反 UI 决策权在 Background 的原则
- 导致 UI 逻辑分散
- 增加测试复杂度

**正确做法**：
- Background 通过 uiAction 明确指定要展示的 UI
- Content 层无条件执行 uiAction

### 5. 在多个文件中定义类型

**否定原因**：
- 导致类型定义分散
- 增加维护成本
- 容易出现类型不一致

**正确做法**：
- 所有跨层类型定义集中在 `shared/types.ts`
- 模块内部类型可以在模块内定义

### 6. 滥用 constants.ts 存储业务常量

**否定原因**：
- 业务常量应该与业务逻辑放在一起
- 避免创建"垃圾桶"文件
- 提高代码可读性

**正确做法**：
- 业务常量定义在对应的业务模块中（如 usage.ts 中的 maxPerDay）
- constants.ts 只存储真正跨模块共享的常量（如配置默认值、UI 常量等）
- 如果常量只在一个模块中使用，就应该定义在该模块内部

**总计**: 模块化设计，职责清晰，技术扎实！