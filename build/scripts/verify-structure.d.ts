/**
 * 结构验证脚本
 *
 * 验证代码结构是否符合架构规范，包括：
 * 1. 目录结构验证
 * 2. 文件命名验证
 * 3. 模块依赖验证
 */
/**
 * 验证结果接口
 */
interface ValidationIssue {
    severity: 'error' | 'warning' | 'info';
    location: string;
    description: string;
    expected: string;
    actual: string;
}
interface ValidationResult {
    category: 'structure' | 'naming' | 'dependency';
    passed: boolean;
    issues: ValidationIssue[];
    suggestions: string[];
}
/**
 * 验证目录结构
 */
declare function verifyDirectoryStructure(): ValidationResult;
/**
 * 验证文件命名
 */
declare function verifyFileNaming(): ValidationResult;
/**
 * 验证模块依赖
 */
declare function verifyModuleDependencies(): ValidationResult;
/**
 * 生成验证报告
 */
declare function generateReport(results: ValidationResult[]): string;
export { verifyDirectoryStructure, verifyFileNaming, verifyModuleDependencies, generateReport, ValidationResult, ValidationIssue };
//# sourceMappingURL=verify-structure.d.ts.map