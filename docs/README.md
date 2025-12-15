# 浏览器框选复制插件

一个 Chrome 扩展程序，允许用户通过鼠标拖拽创建矩形选择框，智能提取选择区域内的文本，并按视觉呈现顺序重新组织为可复制的纯文本格式。

## 功能特性

- 🖱️ 鼠标拖拽创建选择框
- 📝 智能文本提取和排序
- 📋 一键复制到剪贴板
- 📴 可启用/关闭的快捷开关（Ctrl + Alt + Shift + C），支持持久化
- 🪟 结果面板可编辑、可拖动、可关闭，弹出位置可配置（居中/跟随鼠标/不弹出直接复制）
- 🔒 本地处理，无网络请求
- 🚀 基于 Manifest v3 规范

## 项目结构

```
browser-selection-copy/
├── src/                       # TypeScript 源代码
│   ├── content.ts            # 内容脚本入口（组合组件）
│   ├── types.ts              # 类型定义
│   ├── components/           # 核心组件
│   │   ├── selection.ts     # 选择框组件
│   │   ├── extractor.ts     # 文本提取器
│   │   └── panel.ts         # 结果面板
│   ├── background.ts         # 后台脚本
│   ├── popup.ts              # 弹出窗口脚本
│   ├── popup.html            # 弹出窗口HTML
│   ├── content.css           # 样式文件
│   ├── manifest.json         # 扩展配置
│   └── test/                 # 测试文件
├── build/                     # 构建输出
│   ├── dist/                 # TypeScript编译后的模块
│   └── package/              # 打包输出（最终发布包）
│       └── content.js        # 合并后的单个文件（MVP设计）
├── package.json              # 项目配置
└── tsconfig.json            # TypeScript 配置
```

## 核心组件

### Selection（选择框）
负责处理鼠标交互，创建和管理选择框UI。

### Extractor（文本提取器）
负责从选择区域提取文本并按视觉顺序排列。

### Panel（结果面板）
显示提取结果和提供复制功能的浮动面板。

### BrowserSelectionCopy（主类）
在 `content.ts` 中组合上述组件，管理完整的用户操作流程。

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
- **权限**: activeTab, clipboardWrite
- **测试框架**: Jest + jsdom + fast-check
- **代码规范**: ESLint + TypeScript
- **浏览器兼容**: Chrome 88+

## 安装使用

1. 克隆项目并安装依赖
2. 运行 `npm run build` 构建项目
3. 在 Chrome 中加载解压的扩展程序
4. 在弹窗中开启“启用框选复制”，或使用快捷键 `Ctrl + Shift + S` 开/关
5. 在任意网页上拖拽鼠标创建选择框
6. 结果面板可在弹窗设置中选择弹出位置（居中/跟随鼠标/不弹出直接复制），面板内容可编辑、可拖动、可关闭
7. 点击复制按钮将文本复制到剪贴板

## 开发规范

- 所有代码注释使用中文
- 变量名和函数名使用英文
- 遵循 TypeScript 严格模式
- 100% 测试覆盖率目标