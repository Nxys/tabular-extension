/**
 * 架构守门测试
 * 
 * 验证层间依赖规则和业务逻辑隔离
 * 确保架构约束不被违反
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 递归扫描目录，获取所有 TypeScript 文件
 */
function scanSourceFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // 跳过 node_modules、build、__test__ 等目录
      if (entry.isDirectory()) {
        if (!['node_modules', 'build', '__test__', 'coverage'].includes(entry.name)) {
          files.push(...scanSourceFiles(fullPath, baseDir));
        }
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        // 返回相对于 baseDir 的路径
        files.push(path.relative(baseDir, fullPath));
      }
    }
  } catch (error) {
    // 目录不存在或无法访问时返回空数组
    return [];
  }
  
  return files;
}

/**
 * 从源代码中提取 import 语句
 */
function extractImports(content: string): string[] {
  const imports: string[] = [];
  
  // 匹配 import 语句的正则表达式
  // 支持：import ... from '...'、import '...'、import type ... from '...'
  const importRegex = /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

/**
 * 检查代码中是否包含指定的关键字
 * 排除注释中的关键字
 */
function containsKeywords(content: string, keywords: string[]): string[] {
  const found: string[] = [];
  
  // 移除单行注释和多行注释
  const codeWithoutComments = content
    .replace(/\/\*[\s\S]*?\*\//g, '') // 移除多行注释
    .replace(/\/\/.*/g, '');           // 移除单行注释
  
  for (const keyword of keywords) {
    // 使用词边界匹配，避免误匹配（如 usage 不应匹配 usageData）
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    if (regex.test(codeWithoutComments)) {
      found.push(keyword);
    }
  }
  
  return found;
}

/**
 * 读取文件内容
 */
function readFileContent(filePath: string): string {
  const fullPath = path.join(process.cwd(), 'src', filePath);
  try {
    return fs.readFileSync(fullPath, 'utf-8');
  } catch (error) {
    return '';
  }
}

describe('架构守门测试', () => {
  const srcDir = path.join(process.cwd(), 'src');
  
  describe('基础功能测试', () => {
    it('应该能够扫描源代码文件', () => {
      const files = scanSourceFiles(srcDir);
      
      // 验证能够找到文件
      expect(files.length).toBeGreaterThan(0);
      
      // 验证文件路径格式正确
      expect(files.every(f => f.endsWith('.ts'))).toBe(true);
      expect(files.every(f => !f.includes('__test__'))).toBe(true);
    });
    
    it('应该能够读取文件内容', () => {
      const files = scanSourceFiles(srcDir);
      
      // 找到一个存在的文件
      const testFile = files.find(f => f.includes('shared/types.ts'));
      expect(testFile).toBeDefined();
      
      if (testFile) {
        const content = readFileContent(testFile);
        expect(content.length).toBeGreaterThan(0);
      }
    });
    
    it('应该能够提取 import 语句', () => {
      const testCode = `
        import { something } from './module';
        import * as utils from '../utils';
        import './styles.css';
        import type { Type } from './types';
      `;
      
      const imports = extractImports(testCode);
      
      expect(imports).toContain('./module');
      expect(imports).toContain('../utils');
      expect(imports).toContain('./styles.css');
      expect(imports).toContain('./types');
    });
    
    it('应该能够检测关键字', () => {
      const testCode = `
        const usage = checkUsage();
        const pro = isPro();
        const policy = getPolicy();
      `;
      
      const keywords = containsKeywords(testCode, ['usage', 'pro', 'policy', 'strategy']);
      
      expect(keywords).toContain('usage');
      expect(keywords).toContain('pro');
      expect(keywords).toContain('policy');
      expect(keywords).not.toContain('strategy');
    });
  });
  
  describe('层间依赖检查', () => {
    it('Content 层不应该导入 Background 层模块', () => {
      // Arrange
      const contentDir = path.join(srcDir, 'content');
      const contentFiles = scanSourceFiles(contentDir, srcDir);
      const violations: Array<{ file: string; import: string }> = [];
      
      // Act
      for (const file of contentFiles) {
        const content = readFileContent(file);
        const imports = extractImports(content);
        
        for (const imp of imports) {
          // 检查是否导入了 background 层
          if (imp.includes('../background') || imp.includes('background/')) {
            violations.push({ file, import: imp });
          }
        }
      }
      
      // Assert
      if (violations.length > 0) {
        const errorMessage = violations
          .map(v => `  文件：${v.file}\n  违规导入：${v.import}`)
          .join('\n\n');
        
        throw new Error(`Content 层不应该导入 Background 层模块\n\n${errorMessage}`);
      }
      
      expect(violations).toEqual([]);
    });
    
    it('Background 层不应该导入 Content 层模块', () => {
      // Arrange
      const backgroundDir = path.join(srcDir, 'background');
      const backgroundFiles = scanSourceFiles(backgroundDir, srcDir);
      const violations: Array<{ file: string; import: string }> = [];
      
      // Act
      for (const file of backgroundFiles) {
        const content = readFileContent(file);
        const imports = extractImports(content);
        
        for (const imp of imports) {
          // 检查是否导入了 content 层
          if (imp.includes('../content') || imp.includes('content/')) {
            violations.push({ file, import: imp });
          }
        }
      }
      
      // Assert
      if (violations.length > 0) {
        const errorMessage = violations
          .map(v => `  文件：${v.file}\n  违规导入：${v.import}`)
          .join('\n\n');
        
        throw new Error(`Background 层不应该导入 Content 层模块\n\n${errorMessage}`);
      }
      
      expect(violations).toEqual([]);
    });
  });
  
  describe('业务逻辑隔离检查', () => {
    it('Content 层不应该直接访问 chrome.storage 读取业务数据', () => {
      // Arrange
      const contentDir = path.join(srcDir, 'content');
      const contentFiles = scanSourceFiles(contentDir, srcDir);
      const violations: Array<{ file: string; line: number; code: string }> = [];
      
      // Act
      for (const file of contentFiles) {
        const content = readFileContent(file);
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // 检查是否直接访问 chrome.storage.local 读取业务数据
          // 允许读取 UI 设置（enabled、panelPosition）
          if (line.includes('chrome.storage.local.get')) {
            // 检查是否读取业务相关的键
            const businessKeys = ['usage', 'pro', 'limit', 'count', 'date', 'stats'];
            const hasBusinessKey = businessKeys.some(key => line.includes(`'${key}'`) || line.includes(`"${key}"`));
            
            if (hasBusinessKey) {
              violations.push({
                file,
                line: index + 1,
                code: line.trim()
              });
            }
          }
        });
      }
      
      // Assert
      if (violations.length > 0) {
        const errorMessage = violations
          .map(v => `  文件：${v.file}\n  行号：${v.line}\n  代码：${v.code}`)
          .join('\n\n');
        
        throw new Error(`Content 层不应该直接访问 chrome.storage 读取业务数据\n\n${errorMessage}\n\n提示：应该通过消息协议向 Background 层请求业务数据`);
      }
      
      expect(violations).toEqual([]);
    });
    
    it('Shared 层不应该包含业务逻辑关键字', () => {
      // Arrange
      const sharedDir = path.join(srcDir, 'shared');
      const sharedFiles = scanSourceFiles(sharedDir, srcDir);
      const businessKeywords = ['checkUsage', 'consumeUsage', 'isPro', 'getPolicy'];
      const violations: Array<{ file: string; keywords: string[] }> = [];
      
      // Act
      for (const file of sharedFiles) {
        const content = readFileContent(file);
        const foundKeywords = containsKeywords(content, businessKeywords);
        
        if (foundKeywords.length > 0) {
          violations.push({ file, keywords: foundKeywords });
        }
      }
      
      // Assert
      if (violations.length > 0) {
        const errorMessage = violations
          .map(v => `  文件：${v.file}\n  业务关键字：${v.keywords.join(', ')}`)
          .join('\n\n');
        
        throw new Error(`Shared 层不应该包含业务逻辑\n\n${errorMessage}\n\n提示：Shared 层应该只包含类型定义、枚举和跨模块常量`);
      }
      
      expect(violations).toEqual([]);
    });
  });
});
