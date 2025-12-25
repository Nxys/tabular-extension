"use strict";
/**
 * 结构验证脚本
 *
 * 验证代码结构是否符合架构规范，包括：
 * 1. 目录结构验证
 * 2. 文件命名验证
 * 3. 模块依赖验证
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReport = exports.verifyModuleDependencies = exports.verifyFileNaming = exports.verifyDirectoryStructure = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * 规范定义的目录结构
 */
const EXPECTED_STRUCTURE = {
    'src': {
        type: 'directory',
        required: true,
        children: {
            'manifest.json': { type: 'file', required: true },
            'background': {
                type: 'directory',
                required: true,
                children: {
                    'index.ts': { type: 'file', required: true },
                    'usage.ts': { type: 'file', required: true },
                    'pro.ts': { type: 'file', required: true },
                    'storage.ts': { type: 'file', required: true },
                    'settings.ts': { type: 'file', required: true }
                }
            },
            'content': {
                type: 'directory',
                required: true,
                children: {
                    'index.ts': { type: 'file', required: true },
                    'panel.ts': { type: 'file', required: true },
                    'extractor.ts': { type: 'file', required: true },
                    'selection.ts': { type: 'file', required: true },
                    'content.css': { type: 'file', required: true }
                }
            },
            'popup': {
                type: 'directory',
                required: true,
                children: {
                    'popup.html': { type: 'file', required: true },
                    'popup.ts': { type: 'file', required: true }
                }
            },
            'shared': {
                type: 'directory',
                required: true,
                children: {
                    'types.ts': { type: 'file', required: true }
                }
            },
            'images': {
                type: 'directory',
                required: true,
                children: {
                    'icon.html': { type: 'file', required: true }
                }
            }
        }
    }
};
/**
 * 禁止存在的目录和文件
 */
const FORBIDDEN_PATHS = [
    'src/content/usage',
    'src/content/pro',
    'src/content/extractor',
    'src/content/table',
    'src/content/policy',
    'src/content/strategy'
];
/**
 * 文件命名规范
 */
const NAMING_RULES = {
    typescript: /^[a-z][a-z0-9-]*\.ts$/,
    css: /^[a-z][a-z0-9-]*\.css$/,
    html: /^[a-z][a-z0-9-]*\.html$/,
    json: /^[a-z][a-z0-9-]*\.json$/
};
/**
 * 依赖规则
 */
const DEPENDENCY_RULES = {
    // Content 层禁止导入的模块
    contentForbidden: [
        /from ['"].*\/background\//,
        /from ['"]\.\.\/background['"]/,
        /from ['"].*\/usage['"]/,
        /from ['"].*\/pro['"]/,
        /from ['"].*\/policy['"]/,
        /from ['"].*\/strategy['"]/
    ],
    // Content 层禁止的业务概念
    contentBusinessConcepts: [
        /FREE_POLICY/,
        /checkUsage\s*\(/,
        /consumeUsage\s*\(/,
        /allow\s*\(/
    ],
    // Content 层禁止的 status 判断
    contentStatusChecks: [
        /if\s*\(\s*status\s*===/,
        /if\s*\(\s*result\.status\s*===/,
        /switch\s*\(\s*status\s*\)/,
        /switch\s*\(\s*result\.status\s*\)/
    ],
    // Shared 层禁止的内容
    sharedForbidden: [
        /function\s+\w+\s*\(/,
        /const\s+\w+\s*=\s*\(/,
        /class\s+\w+/,
        /FREE_POLICY/,
        /UsagePolicy/,
        /ProState/,
        /ProFeature/
    ]
};
/**
 * 验证目录结构
 */
function verifyDirectoryStructure() {
    const issues = [];
    const suggestions = [];
    function checkStructure(basePath, structure, currentPath = '') {
        for (const [name, spec] of Object.entries(structure)) {
            const fullPath = path.join(basePath, currentPath, name);
            const relativePath = path.join(currentPath, name);
            if (typeof spec === 'object' && spec !== null) {
                const { type, required, children } = spec;
                // 检查文件或目录是否存在
                const exists = fs.existsSync(fullPath);
                if (required && !exists) {
                    issues.push({
                        severity: 'error',
                        location: relativePath,
                        description: `缺少必需的${type === 'directory' ? '目录' : '文件'}`,
                        expected: `${type === 'directory' ? '目录' : '文件'} ${relativePath} 应该存在`,
                        actual: '不存在'
                    });
                    suggestions.push(`创建${type === 'directory' ? '目录' : '文件'}: ${relativePath}`);
                }
                else if (exists) {
                    // 检查类型是否正确
                    const stats = fs.statSync(fullPath);
                    const actualType = stats.isDirectory() ? 'directory' : 'file';
                    if (actualType !== type) {
                        issues.push({
                            severity: 'error',
                            location: relativePath,
                            description: '类型不匹配',
                            expected: type,
                            actual: actualType
                        });
                        suggestions.push(`将 ${relativePath} 改为${type === 'directory' ? '目录' : '文件'}`);
                    }
                    // 递归检查子项
                    if (type === 'directory' && children) {
                        checkStructure(basePath, children, relativePath);
                    }
                }
            }
        }
    }
    // 检查预期结构
    checkStructure('.', EXPECTED_STRUCTURE);
    // 检查禁止的路径
    for (const forbiddenPath of FORBIDDEN_PATHS) {
        if (fs.existsSync(forbiddenPath)) {
            issues.push({
                severity: 'error',
                location: forbiddenPath,
                description: '存在禁止的目录或文件',
                expected: '不应该存在',
                actual: '存在'
            });
            suggestions.push(`删除: ${forbiddenPath}`);
        }
    }
    return {
        category: 'structure',
        passed: issues.length === 0,
        issues,
        suggestions
    };
}
exports.verifyDirectoryStructure = verifyDirectoryStructure;
/**
 * 验证文件命名
 */
function verifyFileNaming() {
    const issues = [];
    const suggestions = [];
    function checkNaming(dirPath, relativePath = '') {
        if (!fs.existsSync(dirPath)) {
            return;
        }
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relPath = path.join(relativePath, entry.name);
            if (entry.isDirectory()) {
                // 递归检查子目录
                checkNaming(fullPath, relPath);
            }
            else if (entry.isFile()) {
                // 检查文件命名
                const ext = path.extname(entry.name);
                let rule;
                switch (ext) {
                    case '.ts':
                        rule = NAMING_RULES.typescript;
                        break;
                    case '.css':
                        rule = NAMING_RULES.css;
                        break;
                    case '.html':
                        rule = NAMING_RULES.html;
                        break;
                    case '.json':
                        rule = NAMING_RULES.json;
                        break;
                }
                if (rule && !rule.test(entry.name)) {
                    issues.push({
                        severity: 'warning',
                        location: relPath,
                        description: '文件命名不符合规范',
                        expected: '小写字母、数字、连字符',
                        actual: entry.name
                    });
                    suggestions.push(`重命名文件: ${relPath} (使用小写字母和连字符)`);
                }
            }
        }
    }
    // 检查 src 目录
    checkNaming('src', 'src');
    return {
        category: 'naming',
        passed: issues.length === 0,
        issues,
        suggestions
    };
}
exports.verifyFileNaming = verifyFileNaming;
/**
 * 验证模块依赖
 */
function verifyModuleDependencies() {
    const issues = [];
    const suggestions = [];
    // 验证 Content 层文件
    const contentFiles = [
        'src/content/index.ts',
        'src/content/panel.ts',
        'src/content/extractor.ts',
        'src/content/selection.ts'
    ];
    for (const file of contentFiles) {
        if (!fs.existsSync(file)) {
            continue;
        }
        const content = fs.readFileSync(file, 'utf-8');
        const codeOnly = content
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*/g, '');
        // 检查禁止的导入
        for (const pattern of DEPENDENCY_RULES.contentForbidden) {
            if (pattern.test(content)) {
                issues.push({
                    severity: 'error',
                    location: file,
                    description: 'Content 层不得导入 Background 层模块',
                    expected: '不应该导入 background、usage、pro、policy、strategy 模块',
                    actual: '存在禁止的导入'
                });
                suggestions.push(`移除 ${file} 中对 Background 层的导入`);
                break;
            }
        }
        // 检查业务概念
        const withoutImportsAndTypes = codeOnly
            .replace(/import\s+.*?;/g, '')
            .replace(/type\s+\w+\s*=.*?;/g, '')
            .replace(/interface\s+\w+\s*{[\s\S]*?}/g, '');
        for (const pattern of DEPENDENCY_RULES.contentBusinessConcepts) {
            if (pattern.test(withoutImportsAndTypes)) {
                issues.push({
                    severity: 'error',
                    location: file,
                    description: 'Content 层不得包含业务概念',
                    expected: '不应该有 FREE_POLICY、checkUsage、consumeUsage、allow 等业务概念',
                    actual: '存在业务概念'
                });
                suggestions.push(`移除 ${file} 中的业务逻辑，将其移至 Background 层`);
                break;
            }
        }
        // 检查 status 判断
        for (const pattern of DEPENDENCY_RULES.contentStatusChecks) {
            if (pattern.test(codeOnly)) {
                issues.push({
                    severity: 'error',
                    location: file,
                    description: 'Content 层不得根据 status 进行二次判断',
                    expected: '不应该有基于 status 的条件判断',
                    actual: '存在 status 判断'
                });
                suggestions.push(`移除 ${file} 中基于 status 的判断，使用 uiAction 代替`);
                break;
            }
        }
    }
    // 验证 Shared 层文件
    const sharedFile = 'src/shared/types.ts';
    if (fs.existsSync(sharedFile)) {
        const content = fs.readFileSync(sharedFile, 'utf-8');
        const codeOnly = content
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*/g, '');
        for (const pattern of DEPENDENCY_RULES.sharedForbidden) {
            if (pattern.test(codeOnly)) {
                issues.push({
                    severity: 'error',
                    location: sharedFile,
                    description: 'Shared 层只能包含类型定义',
                    expected: '只应该有 interface、type、enum 定义',
                    actual: '存在函数实现、类定义或业务概念'
                });
                suggestions.push(`移除 ${sharedFile} 中的函数实现和业务概念`);
                break;
            }
        }
    }
    return {
        category: 'dependency',
        passed: issues.length === 0,
        issues,
        suggestions
    };
}
exports.verifyModuleDependencies = verifyModuleDependencies;
/**
 * 生成验证报告
 */
function generateReport(results) {
    const lines = [];
    lines.push('# 代码结构验证报告');
    lines.push('');
    lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
    lines.push('');
    // 统计
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const errors = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'error').length, 0);
    const warnings = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'warning').length, 0);
    lines.push('## 执行摘要');
    lines.push('');
    lines.push(`- 总问题数: ${totalIssues}`);
    lines.push(`- 错误: ${errors}`);
    lines.push(`- 警告: ${warnings}`);
    lines.push(`- 验证通过: ${totalIssues === 0 ? '✅ 是' : '❌ 否'}`);
    lines.push('');
    // 详细结果
    for (const result of results) {
        const categoryName = {
            structure: '目录结构验证',
            naming: '文件命名验证',
            dependency: '模块依赖验证'
        }[result.category];
        lines.push(`## ${categoryName}`);
        lines.push('');
        lines.push(`状态: ${result.passed ? '✅ 通过' : '❌ 失败'}`);
        lines.push('');
        if (result.issues.length > 0) {
            lines.push('### 发现的问题');
            lines.push('');
            for (const issue of result.issues) {
                const icon = issue.severity === 'error' ? '❌' : '⚠️';
                lines.push(`${icon} **${issue.location}**`);
                lines.push('');
                lines.push(`- 描述: ${issue.description}`);
                lines.push(`- 期望: ${issue.expected}`);
                lines.push(`- 实际: ${issue.actual}`);
                lines.push('');
            }
        }
        if (result.suggestions.length > 0) {
            lines.push('### 调整建议');
            lines.push('');
            for (const suggestion of result.suggestions) {
                lines.push(`- ${suggestion}`);
            }
            lines.push('');
        }
    }
    return lines.join('\n');
}
exports.generateReport = generateReport;
/**
 * 主函数
 */
function main() {
    console.log('开始验证代码结构...\n');
    // 执行验证
    const results = [
        verifyDirectoryStructure(),
        verifyFileNaming(),
        verifyModuleDependencies()
    ];
    // 输出结果
    for (const result of results) {
        const categoryName = {
            structure: '目录结构验证',
            naming: '文件命名验证',
            dependency: '模块依赖验证'
        }[result.category];
        console.log(`${categoryName}: ${result.passed ? '✅ 通过' : '❌ 失败'}`);
        console.log(`  问题数: ${result.issues.length}`);
        console.log('');
    }
    // 生成报告
    const report = generateReport(results);
    const reportPath = 'docs/report/structure-verification-report.md';
    // 确保目录存在
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    // 写入报告
    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`报告已生成: ${reportPath}`);
    // 返回退出码
    const hasErrors = results.some(r => !r.passed);
    process.exit(hasErrors ? 1 : 0);
}
// 执行
if (require.main === module) {
    main();
}
//# sourceMappingURL=verify-structure.js.map