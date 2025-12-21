# 浏览器框选复制插件

一个 Chrome 扩展程序，允许用户通过鼠标拖拽创建矩形选择框，智能提取选择区域内的文本，并按视觉呈现顺序重新组织为可复制的纯文本格式。

## 功能特性

- 🖱️ 鼠标拖拽创建选择框（紫色渐变虚线边框）
- 📝 智能文本提取和排序
- 📋 一键复制到剪贴板
- 📴 可启用/关闭的快捷开关（Ctrl + Shift + Y），支持持久化
- 🪟 结果面板可编辑、可拖动，弹出位置可配置（居中/跟随鼠标/不弹出直接复制）
- 🎨 自动跟随系统主题（浅色/深色模式）
- 🎯 点击外部不会自动关闭面板，复制后自动关闭
- 🔒 本地处理，无网络请求
- 🚀 基于 Manifest v3 规范

## 项目结构

```
browser-selection-copy/
├── src/                  # TypeScript 源代码
│   ├── content/         # 内容脚本模块
│   ├── popup/           # 弹出窗口模块
│   └── images/          # 图标资源
├── test/                # 测试文件
├── build/               # 构建输出
└── docs/                # 项目文档
```

详细的项目结构说明请参考 [docs/STRUCTURE.md](./docs/STRUCTURE.md)

## 核心组件

### Selection（选择框）
负责处理鼠标交互，创建和管理选择框UI。

### Extractor（文本提取器模块）
负责从选择区域提取文本并按视觉顺序排列。采用三段式 pipeline 设计：

- **collect.ts**：数据采集，遍历 DOM 并收集文本元素和位置信息
- **layout.ts**：视觉行分组，将文本元素按视觉位置组织成二维结构（核心算法）
- **format.ts**：文本格式化，将视觉行结构转换为可复制的文本字符串
- **index.ts**：统一对外接口，按 collect → layout → format 顺序执行

### Panel（结果面板）
显示提取结果和提供复制功能的浮动面板。

### BrowserSelectionCopy（主类）
在 `content/content.ts` 中组合上述组件，管理完整的用户操作流程。

**设计理念**：源码拆分提升可维护性，构建脚本合并为单个文件，符合MVP设计，降低审核风险。

## 开发命令

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 监听测试
npm run test:watch

# 构建项目
npm run build

# 代码检查
npm run lint
```

## 技术规范

- **Manifest Version**: v3
- **权限**: activeTab, clipboardWrite, storage
- **样式方案**: CSS 变量 + 媒体查询（自动主题切换）
- **测试框架**: Jest + jsdom
- **代码规范**: ESLint + TypeScript
- **浏览器兼容**: Chrome 88+

## 安装使用

1. 克隆项目并安装依赖
2. 运行 `npm run build` 构建项目
3. 在 Chrome 中加载解压的扩展程序
4. 在弹窗中开启"启用框选复制"，或使用快捷键 `Ctrl + Shift + Y` 开/关
5. 在任意网页上拖拽鼠标创建选择框
6. 结果面板可在弹窗设置中选择弹出位置（居中/跟随鼠标/不弹出直接复制），面板内容可编辑、可拖动、可关闭
7. 点击复制按钮将文本复制到剪贴板

## 开发规范

- 所有代码注释使用中文
- 变量名和函数名使用英文
- 遵循 TypeScript 严格模式
- 100% 测试覆盖率目标

## 文档

- [项目结构说明](./docs/STRUCTURE.md) - 详细的目录结构和设计理念
- [发布指南](./docs/PUBLISHING_GUIDE.md) - 完整的发布流程和检查清单
- [技术文档](./docs/RELEASE.md) - 打包、发布和维护指南
