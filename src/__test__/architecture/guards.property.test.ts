/**
 * 架构约束遵守的属性测试
 * 
 * Feature: v3-freemium-model, Property 13: 架构约束遵守
 * Validates: Requirements 12.1-12.10
 * 
 * 使用属性测试验证架构约束在各种代码变更场景下都能保持
 */

import * as fc from 'fast-check';
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
      
      if (entry.isDirectory()) {
        if (!['node_modules', 'build', '__test__', 'coverage'].includes(entry.name)) {
          files.push(...scanSourceFiles(fullPath, baseDir));
        }
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(path.relative(baseDir, fullPath));
      }
    }
  } catch (error) {
    return [];
  }
  
  return files;
}

/**
 * 从源代码中提取 import 语句
 */
function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

/**
 * 检查代码中是否包含指定的关键字（排除注释）
 */
function containsKeywords(content: string, keywords: string[]): string[] {
  const found: string[] = [];
  const codeWithoutComments = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');
  
  for (const keyword of keywords) {
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

describe('架构约束遵守的属性测试', () => {
  const srcDir = path.join(process.cwd(), 'src');
  
  /**
   * Property 13: 架构约束遵守
   * 
   * 对于任何代码文件，Content 层不应该包含业务逻辑判断，
   * 不应该直接访问 chrome.storage，不应该 import Background 层文件
   */
  it('Property 13: 对于所有 Content 层文件，都应该遵守架构约束', () => {
    // Arrange
    const contentDir = path.join(srcDir, 'content');
    const contentFiles = scanSourceFiles(contentDir, srcDir);
    
    // 确保有文件可以测试
    expect(contentFiles.length).toBeGreaterThan(0);
    
    // Act & Assert
    fc.assert(
      fc.property(
        fc.constantFrom(...contentFiles),
        (file) => {
          const content = readFileContent(file);
          
          // 约束 1: 不应该导入 Background 层
          const imports = extractImports(content);
          const hasBackgroundImport = imports.some(
            imp => imp.includes('../background') || imp.includes('background/')
          );
          expect(hasBackgroundImport).toBe(false);
          
          // 约束 2: 不应该包含业务逻辑关键字
          const businessKeywords = [
            'checkUsage', 'consumeUsage', 'checkTrial', 'evolveTrial',
            'isPro', 'verifyPro', 'getPolicy', 'applyPolicy'
          ];
          const foundKeywords = containsKeywords(content, businessKeywords);
          expect(foundKeywords).toEqual([]);
          
          // 约束 3: 不应该直接访问业务相关的 storage
          const lines = content.split('\n');
          const hasBusinessStorage = lines.some(line => {
            if (!line.includes('chrome.storage.local.get')) {
              return false;
            }
            const businessKeys = ['usage', 'pro', 'limit', 'count', 'date', 'stats', 'trial', 'state_'];
            return businessKeys.some(key => line.includes(`'${key}'`) || line.includes(`"${key}"`));
          });
          expect(hasBusinessStorage).toBe(false);
          
          return true;
        }
      ),
      { numRuns: contentFiles.length } // 对每个文件都运行一次
    );
  });
  
  it('Property 13: 对于所有 Background 层文件，都不应该导入 Content 层', () => {
    // Arrange
    const backgroundDir = path.join(srcDir, 'background');
    const backgroundFiles = scanSourceFiles(backgroundDir, srcDir);
    
    // 确保有文件可以测试
    expect(backgroundFiles.length).toBeGreaterThan(0);
    
    // Act & Assert
    fc.assert(
      fc.property(
        fc.constantFrom(...backgroundFiles),
        (file) => {
          const content = readFileContent(file);
          const imports = extractImports(content);
          
          // 不应该导入 Content 层
          const hasContentImport = imports.some(
            imp => imp.includes('../content') || imp.includes('content/')
          );
          expect(hasContentImport).toBe(false);
          
          return true;
        }
      ),
      { numRuns: backgroundFiles.length }
    );
  });
  
  it('Property 13: 对于所有 Shared 层文件，都不应该包含业务逻辑', () => {
    // Arrange
    const sharedDir = path.join(srcDir, 'shared');
    const sharedFiles = scanSourceFiles(sharedDir, srcDir);
    
    // 确保有文件可以测试
    expect(sharedFiles.length).toBeGreaterThan(0);
    
    // Act & Assert
    fc.assert(
      fc.property(
        fc.constantFrom(...sharedFiles),
        (file) => {
          const content = readFileContent(file);
          
          // 不应该包含业务逻辑关键字
          const businessKeywords = [
            'checkUsage', 'consumeUsage', 'isPro', 'getPolicy',
            'checkTrial', 'evolveTrial', 'verifyPro', 'applyPolicy'
          ];
          const foundKeywords = containsKeywords(content, businessKeywords);
          expect(foundKeywords).toEqual([]);
          
          return true;
        }
      ),
      { numRuns: sharedFiles.length }
    );
  });
  
  it('Property 13: 架构约束应该在代码库的任何子集中都保持一致', () => {
    // 这个测试验证架构约束的一致性
    // 即使只检查部分文件，约束也应该成立
    
    const contentDir = path.join(srcDir, 'content');
    const contentFiles = scanSourceFiles(contentDir, srcDir);
    
    if (contentFiles.length === 0) {
      return; // 如果没有文件，跳过测试
    }
    
    fc.assert(
      fc.property(
        // 生成随机的文件子集
        fc.array(fc.constantFrom(...contentFiles), { minLength: 1, maxLength: contentFiles.length }),
        (fileSubset) => {
          // 对于任何文件子集，架构约束都应该成立
          for (const file of fileSubset) {
            const content = readFileContent(file);
            const imports = extractImports(content);
            
            // 验证不导入 Background 层
            const hasBackgroundImport = imports.some(
              imp => imp.includes('../background') || imp.includes('background/')
            );
            
            if (hasBackgroundImport) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 50 } // 运行 50 次随机子集测试
    );
  });
});
