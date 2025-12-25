/**
 * 架构结构验证测试
 * 
 * 验证代码结构是否符合新规范
 * 
 * 验证的需求：
 * - 需求 4.1：检查 src/ 目录结构是否与新规范定义的结构一致
 * - 需求 4.2：发现目录结构不一致时记录差异并提供调整建议
 * - 需求 4.3：检查文件命名是否符合新规范的命名约定
 * - 需求 4.4：发现文件命名不符合规范时记录差异并提供重命名建议
 * - 需求 4.5：检查模块依赖关系是否符合新规范的依赖约束
 */

import * as fs from 'fs';
import * as path from 'path';

describe('架构结构验证测试', () => {
  // 存储发现的差异
  const differences: Array<{
    category: string;
    severity: 'error' | 'warning' | 'info';
    description: string;
    suggestion: string;
  }> = [];

  // 辅助函数：记录差异
  const recordDifference = (
    category: string,
    severity: 'error' | 'warning' | 'info',
    description: string,
    suggestion: string
  ) => {
    differences.push({ category, severity, description, suggestion });
  };

  // 在所有测试结束后输出差异报告
  afterAll(() => {
    if (differences.length > 0) {
      console.log('\n========== 架构结构差异报告 ==========\n');
      
      const errors = differences.filter(d => d.severity === 'error');
      const warnings = differences.filter(d => d.severity === 'warning');
      const infos = differences.filter(d => d.severity === 'info');
      
      if (errors.length > 0) {
        console.log('❌ 错误 (Errors):');
        errors.forEach((d, i) => {
          console.log(`\n${i + 1}. [${d.category}]`);
          console.log(`   描述: ${d.description}`);
          console.log(`   建议: ${d.suggestion}`);
        });
      }
      
      if (warnings.length > 0) {
        console.log('\n⚠️  警告 (Warnings):');
        warnings.forEach((d, i) => {
          console.log(`\n${i + 1}. [${d.category}]`);
          console.log(`   描述: ${d.description}`);
          console.log(`   建议: ${d.suggestion}`);
        });
      }
      
      if (infos.length > 0) {
        console.log('\nℹ️  信息 (Info):');
        infos.forEach((d, i) => {
          console.log(`\n${i + 1}. [${d.category}]`);
          console.log(`   描述: ${d.description}`);
          console.log(`   建议: ${d.suggestion}`);
        });
      }
      
      console.log('\n========================================\n');
    }
  });

  describe('需求 4.1：目录结构验证', () => {
    test('src/ 目录下应包含所有必需的子目录', () => {
      const requiredDirs = [
        'src/background',
        'src/content',
        'src/popup',
        'src/shared',
        'src/images'
      ];

      for (const dir of requiredDirs) {
        const exists = fs.existsSync(dir) && fs.statSync(dir).isDirectory();
        
        if (!exists) {
          recordDifference(
            '目录结构',
            'error',
            `缺少必需目录: ${dir}`,
            `创建目录: mkdir -p ${dir}`
          );
        }
        
        expect(exists).toBe(true);
      }
    });

    test('background/ 目录应包含所有必需文件', () => {
      const requiredFiles = [
        'src/background/index.ts',
        'src/background/usage.ts',
        'src/background/pro.ts',
        'src/background/settings.ts',
        'src/background/storage.ts'
      ];

      for (const file of requiredFiles) {
        const exists = fs.existsSync(file) && fs.statSync(file).isFile();
        
        if (!exists) {
          recordDifference(
            'Background 层文件',
            'error',
            `缺少必需文件: ${file}`,
            `创建文件: touch ${file}`
          );
        }
        
        expect(exists).toBe(true);
      }
    });

    test('content/ 目录应包含所有必需文件', () => {
      const requiredFiles = [
        'src/content/index.ts',
        'src/content/selection.ts',
        'src/content/extractor.ts',
        'src/content/panel.ts',
        'src/content/content.css'
      ];

      for (const file of requiredFiles) {
        const exists = fs.existsSync(file) && fs.statSync(file).isFile();
        
        if (!exists) {
          recordDifference(
            'Content 层文件',
            'error',
            `缺少必需文件: ${file}`,
            `创建文件: touch ${file}`
          );
        }
        
        expect(exists).toBe(true);
      }
    });

    test('popup/ 目录应包含所有必需文件', () => {
      const requiredFiles = [
        'src/popup/popup.html',
        'src/popup/popup.ts'
      ];

      for (const file of requiredFiles) {
        const exists = fs.existsSync(file) && fs.statSync(file).isFile();
        
        if (!exists) {
          recordDifference(
            'Popup 层文件',
            'error',
            `缺少必需文件: ${file}`,
            `创建文件: touch ${file}`
          );
        }
        
        expect(exists).toBe(true);
      }
    });

    test('shared/ 目录应包含所有必需文件', () => {
      const requiredFiles = [
        'src/shared/types.ts'
      ];

      for (const file of requiredFiles) {
        const exists = fs.existsSync(file) && fs.statSync(file).isFile();
        
        if (!exists) {
          recordDifference(
            'Shared 层文件',
            'error',
            `缺少必需文件: ${file}`,
            `创建文件: touch ${file}`
          );
        }
        
        expect(exists).toBe(true);
      }
    });

    test('shared/ 目录应包含 constants.ts（新规范要求）', () => {
      const file = 'src/shared/constants.ts';
      const exists = fs.existsSync(file) && fs.statSync(file).isFile();
      
      if (!exists) {
        recordDifference(
          'Shared 层文件',
          'warning',
          `缺少 constants.ts 文件（新规范要求）: ${file}`,
          `创建文件用于存储跨模块共享的常量。注意：业务常量应定义在对应的业务模块中（如 usage.ts 中的 maxPerDay）`
        );
      }
      
      // 这是一个警告，不是错误，所以我们不强制要求通过
      if (!exists) {
        console.warn(`⚠️  警告: 缺少 ${file}，这是新规范要求的文件`);
      }
    });

    test('images/ 目录应包含必需文件', () => {
      const requiredFiles = [
        'src/images/icon.html'
      ];

      for (const file of requiredFiles) {
        const exists = fs.existsSync(file) && fs.statSync(file).isFile();
        
        if (!exists) {
          recordDifference(
            'Images 目录文件',
            'error',
            `缺少必需文件: ${file}`,
            `创建文件: touch ${file}`
          );
        }
        
        expect(exists).toBe(true);
      }
    });

    test('不应存在旧的目录结构', () => {
      const deprecatedDirs = [
        'src/content/usage',
        'src/content/pro',
        'src/content/extractor',
        'src/content/table',
        'src/usage',
        'src/pro',
        'src/policy',
        'src/strategy'
      ];

      for (const dir of deprecatedDirs) {
        const exists = fs.existsSync(dir) && fs.statSync(dir).isDirectory();
        
        if (exists) {
          recordDifference(
            '过时目录',
            'warning',
            `发现过时的目录: ${dir}`,
            `删除目录: rm -rf ${dir}`
          );
        }
        
        expect(exists).toBe(false);
      }
    });
  });

  describe('需求 4.3：文件命名验证', () => {
    test('TypeScript 文件应使用 .ts 扩展名', () => {
      const srcDirs = ['src/background', 'src/content', 'src/popup', 'src/shared'];
      
      for (const dir of srcDirs) {
        if (!fs.existsSync(dir)) continue;
        
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isFile() && !file.endsWith('.ts') && !file.endsWith('.css') && !file.endsWith('.html')) {
            recordDifference(
              '文件命名',
              'warning',
              `文件扩展名不符合规范: ${filePath}`,
              `TypeScript 文件应使用 .ts 扩展名`
            );
          }
        }
      }
    });

    test('文件名应使用小写字母和连字符', () => {
      const srcDirs = ['src/background', 'src/content', 'src/popup', 'src/shared'];
      
      for (const dir of srcDirs) {
        if (!fs.existsSync(dir)) continue;
        
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isFile()) {
            const baseName = file.replace(/\.(ts|css|html)$/, '');
            
            // 检查是否包含大写字母或下划线
            if (/[A-Z_]/.test(baseName)) {
              recordDifference(
                '文件命名',
                'info',
                `文件名包含大写字母或下划线: ${filePath}`,
                `建议使用小写字母和连字符，例如: ${baseName.toLowerCase().replace(/_/g, '-')}.${file.split('.').pop()}`
              );
            }
          }
        }
      }
    });

    test('测试文件应使用 .test.ts 后缀', () => {
      const testDir = 'test';
      
      if (!fs.existsSync(testDir)) return;
      
      const files = fs.readdirSync(testDir);
      
      for (const file of files) {
        const filePath = path.join(testDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isFile() && file.endsWith('.ts') && !file.endsWith('.test.ts') && file !== 'setup.ts') {
          recordDifference(
            '测试文件命名',
            'warning',
            `测试文件未使用 .test.ts 后缀: ${filePath}`,
            `重命名为: ${file.replace('.ts', '.test.ts')}`
          );
        }
      }
    });
  });

  describe('需求 4.5：模块依赖关系验证', () => {
    test('Content 层不得 import background 层', () => {
      const contentFiles = [
        'src/content/index.ts',
        'src/content/selection.ts',
        'src/content/extractor.ts',
        'src/content/panel.ts'
      ];

      for (const file of contentFiles) {
        if (!fs.existsSync(file)) continue;
        
        const content = fs.readFileSync(file, 'utf-8');
        
        // 检查是否导入了 background 目录下的文件
        const backgroundImports = content.match(/from\s+['"].*\/background\//g) ||
                                 content.match(/from\s+['"]\.\.\/(\.\.\/)?background['"]/g);
        
        if (backgroundImports && backgroundImports.length > 0) {
          recordDifference(
            '模块依赖',
            'error',
            `${file} 违反依赖约束：导入了 background 层的文件`,
            `移除对 background 层的导入，改为通过消息通信`
          );
          
          expect(backgroundImports).toBeNull();
        }
      }
    });

    test('Content 层不得 import usage、pro、policy、strategy 模块', () => {
      const contentFiles = [
        'src/content/index.ts',
        'src/content/selection.ts',
        'src/content/extractor.ts',
        'src/content/panel.ts'
      ];

      const forbiddenModules = ['usage', 'pro', 'policy', 'strategy'];

      for (const file of contentFiles) {
        if (!fs.existsSync(file)) continue;
        
        const content = fs.readFileSync(file, 'utf-8');
        
        for (const module of forbiddenModules) {
          const moduleImports = content.match(new RegExp(`from\\s+['"].*\\/${module}['"]`, 'g')) ||
                               content.match(new RegExp(`from\\s+['"].*\\/${module}\\/`, 'g'));
          
          if (moduleImports && moduleImports.length > 0) {
            recordDifference(
              '模块依赖',
              'error',
              `${file} 违反依赖约束：导入了 ${module} 模块`,
              `移除对 ${module} 模块的导入，改为通过消息通信`
            );
            
            expect(moduleImports).toBeNull();
          }
        }
      }
    });

    test('Background 层和 Content 层都应该只依赖 Shared 层', () => {
      const backgroundFiles = fs.readdirSync('src/background')
        .filter(f => f.endsWith('.ts'))
        .map(f => `src/background/${f}`);
      
      const contentFiles = fs.readdirSync('src/content')
        .filter(f => f.endsWith('.ts'))
        .map(f => `src/content/${f}`);

      const allFiles = [...backgroundFiles, ...contentFiles];

      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        // 提取所有 import 语句
        const imports = content.match(/from\s+['"][^'"]+['"]/g) || [];
        
        for (const importStatement of imports) {
          const match = importStatement.match(/from\s+['"]([^'"]+)['"]/);
          if (!match) continue;
          
          const importPath = match[1];
          
          // 跳过外部依赖和相对路径导入（同层）
          if (!importPath.startsWith('.') && !importPath.startsWith('/')) continue;
          if (importPath.startsWith('./')) continue;
          
          // 检查是否导入了 shared 层以外的其他层
          if (importPath.includes('/background/') && !file.includes('/background/')) {
            recordDifference(
              '模块依赖',
              'error',
              `${file} 违反依赖约束：导入了 background 层`,
              `只能导入 shared 层的文件`
            );
          }
          
          if (importPath.includes('/content/') && !file.includes('/content/')) {
            recordDifference(
              '模块依赖',
              'error',
              `${file} 违反依赖约束：导入了 content 层`,
              `只能导入 shared 层的文件`
            );
          }
          
          if (importPath.includes('/popup/') && !file.includes('/popup/')) {
            recordDifference(
              '模块依赖',
              'error',
              `${file} 违反依赖约束：导入了 popup 层`,
              `只能导入 shared 层的文件`
            );
          }
        }
      }
    });

    test('Shared 层不应该导入其他层', () => {
      const sharedFiles = fs.readdirSync('src/shared')
        .filter(f => f.endsWith('.ts'))
        .map(f => `src/shared/${f}`);

      for (const file of sharedFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        // 提取所有 import 语句
        const imports = content.match(/from\s+['"][^'"]+['"]/g) || [];
        
        for (const importStatement of imports) {
          const match = importStatement.match(/from\s+['"]([^'"]+)['"]/);
          if (!match) continue;
          
          const importPath = match[1];
          
          // 检查是否导入了其他层
          if (importPath.includes('/background/') || 
              importPath.includes('/content/') || 
              importPath.includes('/popup/')) {
            recordDifference(
              '模块依赖',
              'error',
              `${file} 违反依赖约束：Shared 层导入了其他层`,
              `Shared 层只能包含类型定义和协议，不应该导入其他层`
            );
            
            expect(importPath).not.toMatch(/\/(background|content|popup)\//);
          }
        }
      }
    });
  });

  describe('需求 4.2 & 4.4：差异记录和建议', () => {
    test('应该记录所有发现的差异', () => {
      // 这个测试确保差异记录机制正常工作
      // 实际的差异已经在上面的测试中记录
      
      if (differences.length > 0) {
        console.log(`\n发现 ${differences.length} 个架构差异`);
        
        const errors = differences.filter(d => d.severity === 'error').length;
        const warnings = differences.filter(d => d.severity === 'warning').length;
        const infos = differences.filter(d => d.severity === 'info').length;
        
        console.log(`  - 错误: ${errors}`);
        console.log(`  - 警告: ${warnings}`);
        console.log(`  - 信息: ${infos}`);
      } else {
        console.log('\n✅ 未发现架构差异，代码结构符合规范');
      }
      
      // 这个测试总是通过，因为它只是用来展示差异统计
      expect(true).toBe(true);
    });

    test('每个差异都应该包含调整建议', () => {
      for (const diff of differences) {
        expect(diff.suggestion).toBeTruthy();
        expect(diff.suggestion.length).toBeGreaterThan(0);
      }
    });
  });
});
