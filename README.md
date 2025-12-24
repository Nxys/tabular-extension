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
│   ├── content/         # 内容脚本模块
│   │   ├── extractor/  # 文本提取器（三段式 pipeline）
│   │   ├── table/      # 表格处理模块（Pro 功能）
│   │   ├── usage/      # 使用统计和限制
│   │   ├── pro/        # Pro 功能门控
│   │   ├── content.ts  # 主入口
│   │   ├── selection.ts # 选择框组件
│   │   └── panel.ts    # 结果面板组件
│   ├── popup/           # 弹出窗口模块
│   ├── images/          # 图标资源
│   ├── background.ts    # 后台服务脚本
│   ├── types.ts         # 类型定义
│   └── manifest.json    # 扩展配置
├── test/                # 测试文件（39 个测试用例）
├── build/               # 构建输出
└── docs/                # 项目文档
```

详细的项目结构说明请参考 [docs/STRUCTURE.md](./docs/STRUCTURE.md)

## 核心组件

### Selection（选择框）
负责处理鼠标交互，创建和管理选择框 UI。支持鼠标拖拽、实时更新和边界检测。

### Extractor（文本提取器模块）
负责从选择区域提取文本并按视觉顺序排列。采用三段式 pipeline 设计：

- **collect.ts**：数据采集，使用 TreeWalker 遍历 DOM 并收集文本元素和位置信息，包含可见性缓存优化
- **layout.ts**：视觉行分组，将文本元素按视觉位置组织成二维结构（核心算法，技术护城河）
- **format.ts**：文本格式化，将视觉行结构转换为可复制的文本字符串，包含防护措施
- **index.ts**：统一对外接口，按 collect → layout → format 顺序执行

### Table（表格处理模块 - Pro 功能）
负责表格识别、对齐和导出：

- **detect.ts**：基于 X 轴位置聚类识别表格结构，不依赖 DOM 元素类型
- **align.ts**：列自动对齐，支持中英文混合宽度计算（中文按 2 字符宽度）
- **csv.ts**：CSV 格式导出，遵循 RFC 4180 标准，自动处理引号、逗号和换行符

### Usage（使用统计模块）
负责记录用户行为和使用限制：

- **usage.ts**：行为信号记录器，记录选择、表格检测、列对齐、CSV 导出等事件
- **storage.ts**：状态持久化层，支持自动跨天重置和内存降级
- **policy.ts**：策略定义层，定义免费版和 Pro 版的使用策略

### Pro（Pro 功能门控）
负责 Pro 功能的权限控制：

- **gate.ts**：多点防护机制（签名验证、调用路径检查、异常行为检测）
- **strategy.ts**：策略映射，根据内容类型决定使用哪条 pipeline

### Panel（结果面板）
显示提取结果和提供复制功能的浮动面板。支持文本预览、表格显示、CSV 导出、使用次数显示、拖动和边界检测。

### BrowserSelectionCopy（主类）
在 `content/content.ts` 中组合上述组件，管理完整的用户操作流程。支持免费版和 Pro 版两条 pipeline。

**设计理念**：源码模块化提升可维护性，构建脚本合并为单个文件，符合 MVP 设计，降低审核风险。

## 开发命令

```bash
# 安装依赖
npm install

# 运行测试（39 个测试用例）
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

- **extractor 模块测试**：collect、layout、format 三段式 pipeline
- **table 模块测试**：detect、align、csv 表格处理
- **usage 模块测试**：usage、storage、policy 使用统计
- **pro 模块测试**：gate、strategy Pro 功能门控
- **panel 模块测试**：文本预览、表格显示、使用限制提示
- **属性测试**：使用 fast-check 进行随机输入测试
- **集成测试**：完整的用户操作流程测试

## 文档

- [项目结构说明](./docs/STRUCTURE.md) - 详细的目录结构和设计理念
- [发布指南](./docs/PUBLISHING_GUIDE.md) - 完整的发布流程和检查清单
- [技术文档](./docs/RELEASE.md) - 打包、发布和维护指南

## 技术亮点

1. **三段式 Pipeline 设计**：collect → layout → format，职责单一，易于维护和演进
2. **视觉行分组算法**：核心技术护城河，基于视觉位置的智能文本排序
3. **表格智能识别**：基于 X 轴位置聚类，不依赖 DOM 元素类型
4. **多点防护机制**：签名验证、调用路径检查、异常行为检测
5. **性能优化**：可见性缓存、TreeWalker 遍历、防护措施
6. **自动主题切换**：CSS 变量 + 媒体查询，无需 JavaScript
7. **完整测试覆盖**：单元测试 + 属性测试 + 集成测试
