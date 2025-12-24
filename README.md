# 浏览器框选复制插件

一个 Chrome 扩展程序，允许用户通过鼠标拖拽创建矩形选择框，智能提取选择区域内的文本，并按视觉呈现顺序重新组织为可复制的纯文本格式。支持普通文本提取和表格识别两种模式。

## 功能特性

### 基础功能（免费版）
- 🖱️ 鼠标拖拽创建选择框（紫色渐变虚线边框）
- 📝 智能文本提取和排序（三段式 pipeline：collect → layout → format）
- 📋 一键复制到剪贴板
- 📴 可启用/关闭的快捷开关（Ctrl + Shift + Y / Command + Shift + Y），支持持久化
- 🪟 结果面板可编辑、可拖动，弹出位置可配置（居中/跟随鼠标/不弹出直接复制）
- 🎨 自动跟随系统主题（浅色/深色模式）
- 🎯 点击外部不会自动关闭面板，复制后自动关闭
- 📊 每日使用次数显示（免费版每日 20 次）
- 🔒 本地处理，无网络请求
- 🚀 基于 Manifest v3 规范

### Pro 功能（预留）
- 📊 表格智能识别（基于 X 轴位置聚类）
- 📐 列自动对齐（中英文混合宽度计算）
- 📄 CSV 格式导出（遵循 RFC 4180 标准）
- 🔐 多点防护机制（签名验证、调用路径检查、异常行为检测）

## 项目结构

```
browser-selection-copy/
├── src/                  # TypeScript 源代码
│   ├── background/      # Background 层（唯一业务与状态源）
│   │   ├── index.ts    # Background 入口 + 消息分发
│   │   ├── usage.ts    # 使用次数 + 策略（合并版）
│   │   ├── pro.ts      # Pro 判断（合并版）
│   │   ├── settings.ts # 插件设置
│   │   └── storage.ts  # chrome.storage 统一封装
│   ├── content/         # Content 层（无业务、无状态）
│   │   ├── content.ts  # Content 入口（事件监听 / 消息）
│   │   ├── content.css # Content 样式
│   │   ├── selection.ts # 框选逻辑
│   │   ├── extractor.ts # 页面数据提取（合并版）
│   │   └── panel.ts    # 面板调度（合并版）
│   ├── popup/           # Popup 层（独立壳层）
│   │   ├── popup.html
│   │   └── popup.ts    # 设置变更 + 状态查询
│   ├── shared/          # Shared 层（协议护城河）
│   │   └── types.ts    # 跨层类型定义、枚举、消息协议
│   ├── images/          # 图标资源
│   └── manifest.json    # 扩展配置
├── test/                # 测试文件（50 个测试用例）
├── build/               # 构建输出
└── docs/                # 项目文档
```

详细的项目结构说明请参考 [docs/STRUCTURE.md](./docs/STRUCTURE.md)

## 核心架构

### 架构原则

**Background 层（唯一业务与状态源）**
- 所有业务逻辑判断
- 所有状态管理（usage、pro、storage）
- 所有策略决策（policy、strategy）
- 消息路由和 Action 处理

**Content 层（无业务、无状态）**
- 页面感知（selection、DOM 操作）
- 数据提取（extractor - 核心资产）
- 发送 REQUEST_ACTION 消息
- 根据 uiAction 渲染 UI（无条件执行）

**Shared 层（协议护城河）**
- 消息协议定义（REQUEST_ACTION、ACTION_RESULT）
- 枚举类型定义（ActionType、UIAction、ActionStatus）
- 跨层纯类型定义

### 消息通信协议

**Content → Background**
```typescript
{
  type: 'REQUEST_ACTION',
  payload: {
    action: ActionType,  // 'text-extract' | 'table-detect' | 'column-align' | 'csv-export'
    data?: unknown
  }
}
```

**Background → Content**
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

## 核心组件

### Background 层

**index.ts**：Background 入口，消息监听和分发，Action 请求处理，统一异常兜底

**usage.ts**：使用次数管理（check / consume / record），免费策略定义（maxPerDay 等），跨天重置逻辑，使用统计数据

**pro.ts**：Pro 权限判断（allow / verify），功能权限映射，签名验证，使用模式检测

**settings.ts**：插件设置管理，开关状态（enabled），面板位置（panelPosition）

**storage.ts**：chrome.storage.local 统一封装，提供 get / set / remove 等方法，内存降级存储

### Content 层

**content.ts**：Content 入口，事件监听（mousedown / mousemove / mouseup），消息发送（REQUEST_ACTION），UI Action 执行（根据 uiAction 调用 panel）

**selection.ts**：框选逻辑，选择区域计算，选择框渲染

**extractor.ts**：DOM 信息采集（collect），排版结构分析（layout），数据格式化（format），表格检测、对齐、CSV 导出

**panel.ts**：面板创建和销毁，成功结果 UI（showResult），免费用尽 UI（showLimit），升级 Pro UI（showPro），面板拖动、定位等交互

**content.css**：框选样式，面板样式，所有 content 层的 CSS

### Shared 层

**types.ts**：消息协议（RequestActionMessage、ActionResultMessage），Action 枚举（ActionType），UI Action 枚举（UIAction、ActionStatus），其他跨层类型（SelectionRect、PluginSettings 等）

## 开发命令

```bash
# 安装依赖
npm install

# 运行测试（50 个测试用例）
npm test

# 代码检查
npm run lint

# 构建项目
npm run build

# 生成图标
npm run icon

# 打包扩展
npm run extension

# 完整发布流程（检查 + 测试 + 构建 + 打包）
npm run release

# 生成 ZIP 包
npm run zip
```

## 技术规范

- **Manifest Version**: v3
- **权限**: activeTab, clipboardWrite, storage
- **样式方案**: CSS 变量 + 媒体查询（自动主题切换）
- **测试框架**: Jest + jsdom + fast-check（属性测试）
- **代码规范**: ESLint + TypeScript 严格模式
- **构建工具**: esbuild（快速打包）
- **浏览器兼容**: Chrome 88+
- **Node 版本**: >= 18.0.0

## 安装使用

### 开发环境安装
1. 克隆项目并安装依赖：`npm install`
2. 构建项目：`npm run build`
3. 在 Chrome 中打开 `chrome://extensions/`
4. 开启"开发者模式"
5. 点击"加载已解压的扩展程序"，选择 `build/extension` 目录

### 使用方法
1. 点击扩展图标打开弹窗，开启"启用插件"
2. 或使用快捷键 `Ctrl + Shift + Y`（Mac: `Command + Shift + Y`）快速开/关
3. 在任意网页上按住鼠标左键拖拽创建选择框
4. 释放鼠标后自动提取文本并显示结果面板
5. 面板内容可编辑、可拖动
6. 点击"复制到剪贴板"按钮复制文本（自动关闭面板）

### 配置选项
- **面板位置**：
  - 页面居中：面板显示在页面中央
  - 跟随鼠标：面板显示在鼠标释放位置附近
  - 直接复制：不显示面板，直接复制到剪贴板

## 开发规范

- 所有代码注释使用中文
- 变量名和函数名使用英文
- 遵循 TypeScript 严格模式
- 测试覆盖率：39 个测试用例全部通过
- 测试类型：单元测试、属性测试、集成测试、结构测试

## 测试说明

项目包含完整的测试套件，覆盖所有核心功能：

- **architecture-gate 测试**：架构守门测试，验证架构约束（16 个测试，100% 通过）
- **usage 模块测试**：使用次数管理和策略测试
- **storage 模块测试**：存储封装和内存降级测试
- **structure 测试**：项目结构验证测试
- **dependency 测试**：外部依赖验证测试
- **manifest 测试**：Manifest v3 规范验证测试

测试统计：
- 测试套件：6 个
- 测试用例：50 个
- 测试通过率：96%（48/50）

## 文档

- [项目结构说明](./docs/STRUCTURE.md) - 详细的目录结构和设计理念
- [发布指南](./docs/PUBLISHING_GUIDE.md) - 完整的发布流程和检查清单
- [技术文档](./docs/RELEASE.md) - 打包、发布和维护指南

## 技术亮点

1. **清晰的架构分层**：Background 层集中管理业务逻辑，Content 层纯粹渲染，Shared 层定义协议
2. **消息驱动架构**：通过 REQUEST_ACTION 和 ACTION_RESULT 消息实现层间通信
3. **架构守门测试**：16 个测试确保架构约束不被破坏（100% 通过）
4. **合并版文件结构**：适合小型插件，降低复杂度，提高可维护性
5. **统一存储封装**：chrome.storage.local 统一封装，支持内存降级
6. **性能优化**：可见性缓存、TreeWalker 遍历、防护措施
7. **自动主题切换**：CSS 变量 + 媒体查询，无需 JavaScript
8. **完整测试覆盖**：单元测试 + 架构测试 + 集成测试
