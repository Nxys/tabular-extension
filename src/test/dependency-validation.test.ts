// 外部依赖验证测试

import * as fs from 'fs';
import * as path from 'path';

describe('外部依赖验证', () => {
  test('运行时不应该依赖任何外部库', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // 验证没有运行时依赖
    expect(packageJson.dependencies).toBeUndefined();
  });

  test('源代码不应该包含外部库导入', () => {
    const srcDir = path.join(process.cwd(), 'src');
    const sourceFiles = getAllTsFiles(srcDir);

    sourceFiles.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 检查是否有外部库导入（不是相对路径的导入）
      const importLines = content.split('\n').filter(line => 
        line.trim().startsWith('import') && 
        !line.includes('./') && 
        !line.includes('../') &&
        !line.includes('types/') // 允许类型导入
      );

      // 过滤掉类型导入和测试相关导入
      const externalImports = importLines.filter(line => 
        !line.includes('@types/') &&
        !line.includes('jest') &&
        !line.includes('fast-check') &&
        !line.includes('fs') &&
        !line.includes('path')
      );

      expect(externalImports).toEqual([]);
    });
  });

  test('content script 和 service worker 不应该包含 Node.js 模块', () => {
    const contentScriptPath = path.join(process.cwd(), 'content-script.js');
    const serviceWorkerPath = path.join(process.cwd(), 'service-worker.js');

    if (fs.existsSync(contentScriptPath)) {
      const contentScript = fs.readFileSync(contentScriptPath, 'utf-8');
      expect(contentScript).not.toMatch(/require\s*\(/);
      expect(contentScript).not.toMatch(/import.*from\s+['"](?!\.)/);
    }

    if (fs.existsSync(serviceWorkerPath)) {
      const serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf-8');
      expect(serviceWorker).not.toMatch(/require\s*\(/);
      expect(serviceWorker).not.toMatch(/import.*from\s+['"](?!\.)/);
    }
  });
});

// 辅助函数：递归获取所有 TypeScript 文件
function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }

  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.endsWith('.ts') && !item.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}