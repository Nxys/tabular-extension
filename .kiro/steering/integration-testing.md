---
inclusion: always
---

# 集成测试规范

## 核心原则
- **真实浏览器测试**：使用 Playwright，不用 mock
- **完整用户流程**：测试真实交互场景和插件行为

## 测试命令
- `npm run test:integration` - 测试
- `npm run test:integration:debug` - 调试模式
- `npm run test:integration:ui` - UI 模式

## 测试路径
`tests/integration/` - 所有集成测试文件

## 注意事项
- 测试前需构建：`npm run build`
- 测试服务器自动启动（package.json 配置）
