---
inclusion: always
---

# E2E 测试规范

## 测试策略
- **所有集成测试必须在真实浏览器中运行**
- 使用 Playwright 进行端到端测试，获取真实测试结果
- 测试真实的用户交互场景和插件行为

## 测试工具
- **Playwright MCP Server**：通过 MCP 协议控制浏览器
- **测试命令**：`npm run test:e2e`
- **调试模式**：`npm run test:e2e:debug`
- **UI 模式**：`npm run test:e2e:ui`

## 测试结构
```
src/__test__/e2e/
├── fixtures/          # 测试页面生成器
├── helpers/           # 测试辅助工具
└── *.test.ts         # E2E 测试文件
```

## 测试场景
1. **基础功能**：文本提取、表格检测、数据导出
2. **用户交互**：选择、复制、快捷键、多次操作
3. **错误处理**：空数据、格式错误、边界情况
4. **性能测试**：大数据量、并发操作

## 测试原则
- 测试真实浏览器环境，不使用 mock
- 验证完整的用户交互流程
- 检查 UI 渲染和用户反馈
- 确保插件在各种场景下稳定运行

## 注意事项
- E2E 测试需要先构建插件：`npm run build`
- 测试服务器自动启动（配置在 package.json 的 playwright 字段）
- 测试失败时会生成截图和追踪文件
- 配置已统一到 package.json，与 Jest 保持一致
