# 浏览器框选复制插件

一个 Chrome 扩展程序，允许用户通过鼠标拖拽创建矩形选择框，智能提取选择区域内的文本，并按视觉呈现顺序重新组织为可复制的纯文本格式。

## 功能特性

- 🖱️ 鼠标拖拽创建选择框
- 📝 智能文本提取和排序
- 📋 一键复制到剪贴板
- 🔒 本地处理，无网络请求
- 🚀 基于 Manifest v3 规范

## 项目结构

```
browser-selection-copy/
├── manifest.json              # Chrome 扩展配置文件
├── content-script.js          # 内容脚本入口
├── content-script.css         # 样式文件
├── service-worker.js          # 后台服务工作者
├── src/                       # TypeScript 源代码
│   ├── types/                 # 类型定义
│   │   └── index.ts
│   ├── components/            # 核心组件
│   │   ├── SelectionBox.ts    # 选择框组件
│   │   ├── VisualTextExtractor.ts # 文本提取器
│   │   └── ResultPanel.ts     # 结果面板
│   ├── MainController.ts      # 主控制器
│   └── test/                  # 测试文件
│       ├── setup.ts           # 测试环境设置
│       ├── project-structure.test.ts
│       ├── manifest-validation.test.ts
│       └── dependency-validation.test.ts
├── package.json               # 项目配置
├── tsconfig.json             # TypeScript 配置
└── .eslintrc.js              # ESLint 配置
```

## 核心组件

### SelectionBox
负责处理鼠标交互，创建和管理选择框UI。

### VisualTextExtractor  
负责从选择区域提取文本并按视觉顺序排列。

### ResultPanel
显示提取结果和提供复制功能的浮动面板。

### MainController
协调各组件交互，管理完整的用户操作流程。

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
4. 在任意网页上拖拽鼠标创建选择框
5. 点击复制按钮将文本复制到剪贴板

## 开发规范

- 所有代码注释使用中文
- 变量名和函数名使用英文
- 遵循 TypeScript 严格模式
- 100% 测试覆盖率目标