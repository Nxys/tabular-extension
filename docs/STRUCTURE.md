# 项目结构

## 🏗️ 整体架构（极简分类）

```
./
├─ src/                   # 📝 源码（开发）
├─ build/                 # 🔧 构建（编译打包）
├─ resources/             # 🎨 资源（图标工具）
├─ docs/                  # 📚 文档（说明指南）
├─ manifest.json          # 扩展清单
├─ content.js            # 内容脚本（最终产物）
├─ content.css           # 样式文件
├─ background.js         # 后台脚本
├─ popup.html           # 弹出窗口
├─ popup.js             # 弹出脚本
└─ extension.zip        # 发布包
```

## 📝 源码目录（src/）

```
src/
├─ main.ts              # 主控制器（原 MainController.ts）
├─ types.ts             # 类型定义（原 types/index.ts）
├─ components/          # 组件目录
│  ├─ selection.ts      # 选择框（原 SelectionBox.ts）
│  ├─ extractor.ts      # 文本提取器（原 VisualTextExtractor.ts）
│  └─ panel.ts          # 结果面板（原 ResultPanel.ts）
└─ test/               # 测试文件
   ├─ setup.ts
   ├─ project-structure.test.ts
   ├─ manifest-validation.test.ts
   ├─ dependency-validation.test.ts
   ├─ selection-box-ui.test.ts
   ├─ selection-box-mouse-events.test.ts
   ├─ selection-box-lifecycle.property.test.ts
   ├─ visual-text-extractor.test.ts
   ├─ visual-text-extractor.property.test.ts
   └─ result-panel-interaction.test.ts
```

## 🔧 构建目录（build/）

```
build/
├─ build-extension.js   # 合并脚本
├─ package-extension.js # 打包脚本
├─ dist/               # 编译输出
│  ├─ main.js/.d.ts
│  ├─ types.js/.d.ts
│  └─ components/
│     ├─ selection.js/.d.ts
│     ├─ extractor.js/.d.ts
│     └─ panel.js/.d.ts
└─ package/            # 打包输出
   ├─ manifest.json
   ├─ content.js
   ├─ content.css
   ├─ background.js
   ├─ popup.html
   ├─ popup.js
   └─ assets/
```

## 🎨 资源目录（resources/）

```
resources/
├─ assets/             # 图标资源
│  └─ icon.svg         # SVG 图标源文件
├─ create-icons.html   # 图标生成工具
└─ demo.html          # 功能演示页面
```

## 📚 文档目录（docs/）

```
docs/
├─ README.md           # 项目介绍
├─ RELEASE.md          # 发布指南
├─ PUBLISH_CHECKLIST.md # 发布检查清单
├─ PROJECT.md          # 项目说明
├─ STRUCTURE.md        # 本文件
└─ store-assets/       # 商店资源说明
   └─ README.md
```

## 🎯 极简命名原则

### 源码文件命名
- `main.ts` - 主控制器（核心逻辑）
- `types.ts` - 类型定义（接口声明）
- `selection.ts` - 选择框组件
- `extractor.ts` - 文本提取器
- `panel.ts` - 结果面板

### 目录分类原则
- **src/** - 所有开发源码
- **build/** - 所有构建相关
- **resources/** - 所有资源文件
- **docs/** - 所有文档说明

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
| 源码 | 5个 | TypeScript 开发文件 |
| 测试 | 10个 | 完整测试覆盖 |
| 构建 | 2个 | 自动化构建脚本 |
| 文档 | 6个 | 完整项目文档 |
| 资源 | 3个 | 图标和演示工具 |

**总计**: 清晰分类，各司其职，极简高效！