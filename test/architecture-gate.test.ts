/**
 * 架构守门测试（强制）
 * 
 * 这些测试验证架构约束，禁止跳过
 * 
 * 验证的属性：
 * - 属性 1：架构约束完整性
 * - 属性 7：Storage 访问隔离
 * - 属性 8：Shared 模块纯净性
 */

import * as fs from 'fs';

describe('架构守门测试', () => {
  describe('属性 1：架构约束完整性', () => {
    const contentFiles = [
      'src/content/content.ts',
      'src/content/panel.ts',
      'src/content/extractor.ts',
      'src/content/selection.ts'
    ];

    test('Content 层不得导入 usage 模块', () => {
      for (const file of contentFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        // 检查是否导入了 usage 相关模块
        expect(content).not.toMatch(/from ['"].*\/usage['"]/);
        expect(content).not.toMatch(/from ['"].*\/usage\//);
        expect(content).not.toMatch(/import.*usage/i);
      }
    });

    test('Content 层不得导入 pro 模块', () => {
      for (const file of contentFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        // 检查是否导入了 pro 相关模块
        expect(content).not.toMatch(/from ['"].*\/pro['"]/);
        expect(content).not.toMatch(/from ['"].*\/pro\//);
      }
    });

    test('Content 层不得导入 policy 模块', () => {
      for (const file of contentFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        // 检查是否导入了 policy 相关模块
        expect(content).not.toMatch(/from ['"].*\/policy['"]/);
        expect(content).not.toMatch(/from ['"].*\/policy\//);
      }
    });

    test('Content 层不得导入 strategy 模块', () => {
      for (const file of contentFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        // 检查是否导入了 strategy 相关模块
        expect(content).not.toMatch(/from ['"].*\/strategy['"]/);
        expect(content).not.toMatch(/from ['"].*\/strategy\//);
      }
    });

    test('Content 层不得导入 background 下的任何文件', () => {
      for (const file of contentFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        // 检查是否导入了 background 目录下的文件
        expect(content).not.toMatch(/from ['"].*\/background\//);
        expect(content).not.toMatch(/from ['"]\.\.\/background['"]/);
      }
    });

    test('Content 层不得包含业务概念标识符', () => {
      for (const file of contentFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        // 检查是否包含业务概念标识符
        // 注意：这里只检查变量名，不检查注释
        const codeOnly = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
        
        // 允许在类型定义中使用这些词，但不允许在业务逻辑中使用
        // 排除 import 语句和类型定义
        const withoutImportsAndTypes = codeOnly
          .replace(/import\s+.*?;/g, '')
          .replace(/type\s+\w+\s*=.*?;/g, '')
          .replace(/interface\s+\w+\s*{[\s\S]*?}/g, '');
        
        // 不应该有 FREE_POLICY 的引用
        expect(withoutImportsAndTypes).not.toMatch(/FREE_POLICY/);
        
        // 不应该有 checkUsage、consumeUsage 的调用
        expect(withoutImportsAndTypes).not.toMatch(/checkUsage\s*\(/);
        expect(withoutImportsAndTypes).not.toMatch(/consumeUsage\s*\(/);
        
        // 不应该有 allow 函数的调用（Pro 权限检查）
        expect(withoutImportsAndTypes).not.toMatch(/allow\s*\(/);
      }
    });

    test('Content 层不得根据 status 进行二次判断', () => {
      const contentFile = 'src/content/content.ts';
      const content = fs.readFileSync(contentFile, 'utf-8');
      
      // 检查是否有根据 status 的条件判断
      // 允许解构 status，但不允许基于 status 做业务判断
      const codeOnly = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
      
      // 不应该有 if (status === 'ok') 或类似的判断
      expect(codeOnly).not.toMatch(/if\s*\(\s*status\s*===/);
      expect(codeOnly).not.toMatch(/if\s*\(\s*result\.status\s*===/);
      expect(codeOnly).not.toMatch(/switch\s*\(\s*status\s*\)/);
      expect(codeOnly).not.toMatch(/switch\s*\(\s*result\.status\s*\)/);
    });
  });

  describe('属性 7：Storage 访问隔离', () => {
    const contentFiles = [
      'src/content/content.ts',
      'src/content/panel.ts',
      'src/content/extractor.ts',
      'src/content/selection.ts'
    ];

    test('Content 层不得直接访问 chrome.storage.local 读取业务数据', () => {
      for (const file of contentFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        // 允许读取插件设置（enabled、panelPosition）
        // 但不允许读取业务数据（usage_count、pro_state 等）
        
        // 检查是否有 chrome.storage.local.get 调用
        const storageGetMatches = content.match(/chrome\.storage\.local\.get\s*\(\s*\[([^\]]+)\]/g);
        
        if (storageGetMatches) {
          for (const match of storageGetMatches) {
            // 提取键名
            const keysMatch = match.match(/\[([^\]]+)\]/);
            if (keysMatch) {
              const keys = keysMatch[1];
              
              // 不允许读取业务相关的键
              expect(keys).not.toMatch(/usage_count/);
              expect(keys).not.toMatch(/last_usage_date/);
              expect(keys).not.toMatch(/usage_stats/);
              expect(keys).not.toMatch(/pro_state/);
            }
          }
        }
      }
    });
  });

  describe('属性 8：Shared 模块纯净性', () => {
    const sharedFile = 'src/shared/types.ts';

    test('Shared 模块只包含类型定义和消息协议', () => {
      const content = fs.readFileSync(sharedFile, 'utf-8');
      
      // 移除注释
      const codeOnly = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
      
      // 不应该有函数实现（只允许类型定义）
      expect(codeOnly).not.toMatch(/function\s+\w+\s*\(/);
      expect(codeOnly).not.toMatch(/const\s+\w+\s*=\s*\(/);
      expect(codeOnly).not.toMatch(/=>\s*{/);
      
      // 不应该有类定义（只允许接口和类型）
      expect(codeOnly).not.toMatch(/class\s+\w+/);
    });

    test('Shared 模块不包含 usage、pro、policy、strategy 相关定义', () => {
      const content = fs.readFileSync(sharedFile, 'utf-8');
      
      // 移除注释
      const codeOnly = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
      
      // 不应该有 FREE_POLICY、UsagePolicy 等定义
      expect(codeOnly).not.toMatch(/FREE_POLICY/);
      expect(codeOnly).not.toMatch(/UsagePolicy/);
      expect(codeOnly).not.toMatch(/ProState/);
      expect(codeOnly).not.toMatch(/ProFeature/);
      
      // 不应该有 maxPerDay、isPro 等业务字段
      // 注意：这里只检查作为独立标识符的情况，不检查作为对象属性的情况
      expect(codeOnly).not.toMatch(/\bmaxPerDay\b/);
      expect(codeOnly).not.toMatch(/\bisPro\b/);
    });

    test('Shared 模块不暴露业务概念到 content 层', () => {
      const content = fs.readFileSync(sharedFile, 'utf-8');
      
      // 移除注释
      const codeOnly = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
      
      // 不应该有 freeCount、limit、planType 等字段
      expect(codeOnly).not.toMatch(/freeCount/);
      expect(codeOnly).not.toMatch(/\blimit\b/);
      expect(codeOnly).not.toMatch(/planType/);
    });
  });

  describe('架构文件结构验证', () => {
    test('Background 目录结构正确', () => {
      const requiredFiles = [
        'src/background/index.ts',
        'src/background/usage.ts',
        'src/background/pro.ts',
        'src/background/storage.ts',
        'src/background/settings.ts'
      ];

      for (const file of requiredFiles) {
        expect(fs.existsSync(file)).toBe(true);
      }
    });

    test('Content 目录结构正确', () => {
      const requiredFiles = [
        'src/content/content.ts',
        'src/content/panel.ts',
        'src/content/extractor.ts',
        'src/content/selection.ts',
        'src/content/content.css'
      ];

      for (const file of requiredFiles) {
        expect(fs.existsSync(file)).toBe(true);
      }
    });

    test('Shared 目录结构正确', () => {
      expect(fs.existsSync('src/shared/types.ts')).toBe(true);
    });

    test('旧的 usage 和 pro 目录已删除', () => {
      expect(fs.existsSync('src/content/usage')).toBe(false);
      expect(fs.existsSync('src/content/pro')).toBe(false);
    });

    test('旧的 extractor 和 table 目录已删除', () => {
      expect(fs.existsSync('src/content/extractor')).toBe(false);
      expect(fs.existsSync('src/content/table')).toBe(false);
    });
  });
});
