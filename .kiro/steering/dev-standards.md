---
inclusion: always
---

# 开发规范

## 代码风格
- **完美主义**：追求代码质量和细节，不容忍瑕疵
- **极简主义**：最小化代码量，删除冗余，保持简洁

## 语言
- AI 回复、注释、文档用中文
- 代码命名用英文驼峰
- 源码、测试使用TypeScript，不要使用JavaScript

## TypeScript
- 严格模式，禁用 `any`（特殊情况需注释）
- 导出项必须有中文 JSDoc
- 遵循 ESLint

## 测试
- 命令：`npm test`，无需`--run`参数
- 覆盖率：Background ≥90%，Content ≥85%
- 路径：`test/unit/模块/文件名.test.ts`
- 不自动添加测试（除非用户要求）

## 修改代码
同步更新：测试、文档

## 工具
- 用 `getDiagnostics` 检查错误
- 并行执行 `strReplace`

## AI 行为
- 简洁回复，完成后 1-2 句总结
- 并行执行独立操作
- 不创建总结文件
