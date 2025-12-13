# 项目结构

## 核心文件
```
./
├─ manifest.json      # 扩展清单
├─ content.js         # 内容脚本
├─ content.css        # 样式文件
├─ background.js      # 后台脚本
├─ popup.html         # 弹出窗口
├─ popup.js           # 弹出脚本
└─ assets/            # 资源文件
   ├─ icon16.png      # 16x16 图标
   ├─ icon32.png      # 32x32 图标
   ├─ icon48.png      # 48x48 图标
   └─ icon128.png     # 128x128 图标
```

## 开发文件
```
src/                  # 源代码
├─ components/        # 组件
├─ types/            # 类型定义
├─ test/             # 测试文件
└─ MainController.ts # 主控制器

dist/                # 编译输出
package/             # 打包输出
extension.zip        # 发布包
```

## 脚本命令
```bash
npm run build        # 编译 TypeScript
npm run test         # 运行测试
npm run lint         # 代码检查
npm run pack         # 打包扩展
npm run release      # 完整发布流程
```

## 极简设计原则
- 文件名简洁明了
- 目录结构扁平化
- 无多余的连字符
- 功能导向的命名