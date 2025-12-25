/**
 * 架构实现验证测试
 * 
 * 验证代码实现是否符合架构原则
 * 
 * 验证的需求：
 * - 需求 5.1：检查 Background 层是否只包含业务逻辑和状态管理
 * - 需求 5.2：检查 Content 层是否不包含业务逻辑判断
 * - 需求 5.3：检查 Shared 层是否只包含类型定义和协议
 * - 需求 5.4：发现代码违反架构原则时记录违规项并提供修复建议
 * - 需求 5.5：检查消息通信是否符合规范定义的协议格式
 */

import * as fs from 'fs';

describe('架构实现验证测试', () => {
  // 存储发现的违规项
  const violations: Array<{
    category: string;
    severity: 'error' | 'warning' | 'info';
    location: string;
    description: string;
    suggestion: string;
  }> = [];

  // 辅助函数：记录违规项
  const recordViolation = (
    category: string,
    severity: 'error' | 'warning' | 'info',
    location: string,
    description: string,
    suggestion: string
  ) => {
    violations.push({ category, severity, location, description, suggestion });
  };

  // 在所有测试结束后输出违规报告
  afterAll(() => {
    if (violations.length > 0) {
      console.log('\n========== 架构实现违规报告 ==========\n');
      
      const errors = violations.filter(v => v.severity === 'error');
      const warnings = violations.filter(v => v.severity === 'warning');
      const infos = violations.filter(v => v.severity === 'info');
      
      if (errors.length > 0) {
        console.log('❌ 错误 (Errors):');
        errors.forEach((v, i) => {
          console.log(`\n${i + 1}. [${v.category}] ${v.location}`);
          console.log(`   描述: ${v.description}`);
          console.log(`   建议: ${v.suggestion}`);
        });
      }
      
      if (warnings.length > 0) {
        console.log('\n⚠️  警告 (Warnings):');
        warnings.forEach((v, i) => {
          console.log(`\n${i + 1}. [${v.category}] ${v.location}`);
          console.log(`   描述: ${v.description}`);
          console.log(`   建议: ${v.suggestion}`);
        });
      }
      
      if (infos.length > 0) {
        console.log('\nℹ️  信息 (Info):');
        infos.forEach((v, i) => {
          console.log(`\n${i + 1}. [${v.category}] ${v.location}`);
          console.log(`   描述: ${v.description}`);
          console.log(`   建议: ${v.suggestion}`);
        });
      }
      
      console.log('\n========================================\n');
    }
  });

  describe('需求 5.1：Background 层只包含业务逻辑和状态管理', () => {
    const backgroundFiles = [
      'src/background/index.ts',
      'src/background/usage.ts',
      'src/background/pro.ts',
      'src/background/settings.ts',
      'src/background/storage.ts'
    ];

    test('Background 层不应包含 DOM 操作', () => {
      for (const file of backgroundFiles) {
        if (!fs.existsSync(file)) continue;
        
        const content = fs.readFileSync(file, 'utf-8');
        
        // 移除注释
        const codeOnly = content
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*/g, '');
        
        // 检查是否有 DOM 操作
        const domOperations = [
          /document\./,
          /window\./,
          /\.getElementById/,
          /\.querySelector/,
          /\.createElement/,
          /\.appendChild/,
          /\.removeChild/,
          /\.innerHTML/,
          /\.textContent/,
          /\.style\./
        ];
        
        for (const pattern of domOperations) {
          if (pattern.test(codeOnly)) {
            recordViolation(
              'Background 层职责',
              'error',
              file,
              'Background 层不应包含 DOM 操作',
              '将 DOM 操作移至 Content 层'
            );
            expect(codeOnly).not.toMatch(pattern);
          }
        }
      }
    });

    test('Background 层应包含业务逻辑函数', () => {
      const indexFile = 'src/background/index.ts';
      
      if (!fs.existsSync(indexFile)) {
        recordViolation(
          'Background 层职责',
          'error',
          indexFile,
          'Background 入口文件不存在',
          '创建 Background 入口文件'
        );
        return;
      }
      
      const content = fs.readFileSync(indexFile, 'utf-8');
      
      // 应该包含消息处理逻辑
      expect(content).toMatch(/chrome\.runtime\.onMessage/);
      
      // 应该包含 Action 处理函数
      expect(content).toMatch(/handleActionRequest|handleAction/);
    });

    test('Background 层应管理状态（usage、pro、settings）', () => {
      const requiredModules = [
        { file: 'src/background/usage.ts', pattern: /checkUsage|consumeUsage|record/ },
        { file: 'src/background/pro.ts', pattern: /allow|verify/ },
        { file: 'src/background/settings.ts', pattern: /getSettings|updateSettings/ }
      ];
      
      for (const { file, pattern } of requiredModules) {
        if (!fs.existsSync(file)) {
          recordViolation(
            'Background 层职责',
            'error',
            file,
            `缺少状态管理模块: ${file}`,
            `创建 ${file} 并实现状态管理功能`
          );
          continue;
        }
        
        const content = fs.readFileSync(file, 'utf-8');
        
        if (!pattern.test(content)) {
          recordViolation(
            'Background 层职责',
            'warning',
            file,
            `${file} 缺少预期的状态管理函数`,
            `实现状态管理函数（如 ${pattern.source}）`
          );
        }
      }
    });
  });

  describe('需求 5.2：Content 层不包含业务逻辑判断', () => {
    const contentFiles = [
      'src/content/index.ts',
      'src/content/selection.ts',
      'src/content/extractor.ts',
      'src/content/panel.ts'
    ];

    test('Content 层不应包含 usage 相关的业务判断', () => {
      for (const file of contentFiles) {
        if (!fs.existsSync(file)) continue;
        
        const content = fs.readFileSync(file, 'utf-8');
        
        // 移除注释
        const codeOnly = content
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*/g, '');
        
        // 检查是否有 usage 相关的判断
        const usagePatterns = [
          /checkUsage\s*\(/,
          /consumeUsage\s*\(/,
          /usage_count/,
          /maxPerDay/,
          /freeCount/,
          /\blimit\b.*\d+/
        ];
        
        for (const pattern of usagePatterns) {
          if (pattern.test(codeOnly)) {
            recordViolation(
              'Content 层职责',
              'error',
              file,
              'Content 层包含 usage 相关的业务判断',
              '将 usage 判断移至 Background 层，Content 层只负责 UI 渲染'
            );
            expect(codeOnly).not.toMatch(pattern);
          }
        }
      }
    });

    test('Content 层不应包含 pro 相关的业务判断', () => {
      for (const file of contentFiles) {
        if (!fs.existsSync(file)) continue;
        
        const content = fs.readFileSync(file, 'utf-8');
        
        // 移除注释
        const codeOnly = content
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*/g, '');
        
        // 检查是否有 pro 相关的判断
        const proPatterns = [
          /allow\s*\(/,
          /verify\s*\(/,
          /isPro/,
          /proState/,
          /planType/
        ];
        
        for (const pattern of proPatterns) {
          if (pattern.test(codeOnly)) {
            recordViolation(
              'Content 层职责',
              'error',
              file,
              'Content 层包含 pro 相关的业务判断',
              '将 pro 判断移至 Background 层，Content 层只负责 UI 渲染'
            );
            expect(codeOnly).not.toMatch(pattern);
          }
        }
      }
    });

    test('Content 层不应根据 status 进行业务判断', () => {
      const indexFile = 'src/content/index.ts';
      
      if (!fs.existsSync(indexFile)) return;
      
      const content = fs.readFileSync(indexFile, 'utf-8');
      
      // 移除注释
      const codeOnly = content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');
      
      // 检查是否有根据 status 的条件判断
      const statusJudgmentPatterns = [
        /if\s*\(\s*status\s*===/,
        /if\s*\(\s*result\.status\s*===/,
        /switch\s*\(\s*status\s*\)/,
        /switch\s*\(\s*result\.status\s*\)/,
        /status\s*===\s*['"]ok['"]/,
        /status\s*===\s*['"]limited['"]/,
        /status\s*===\s*['"]blocked['"]/
      ];
      
      for (const pattern of statusJudgmentPatterns) {
        if (pattern.test(codeOnly)) {
          recordViolation(
            'Content 层职责',
            'error',
            indexFile,
            'Content 层根据 status 进行业务判断',
            'Content 层应该只根据 uiAction 执行 UI 渲染，不应该根据 status 做判断'
          );
          expect(codeOnly).not.toMatch(pattern);
        }
      }
    });

    test('Content 层应该只根据 uiAction 执行 UI', () => {
      const indexFile = 'src/content/index.ts';
      
      if (!fs.existsSync(indexFile)) return;
      
      const content = fs.readFileSync(indexFile, 'utf-8');
      
      // 应该有 executeUIAction 或类似的函数
      expect(content).toMatch(/executeUIAction|handleUIAction/);
      
      // 应该有 switch (uiAction) 或类似的逻辑
      expect(content).toMatch(/switch\s*\(\s*uiAction\s*\)|uiAction\s*===/);
    });

    test('Content 层不应拼装业务相关文案', () => {
      for (const file of contentFiles) {
        if (!fs.existsSync(file)) continue;
        
        const content = fs.readFileSync(file, 'utf-8');
        
        // 移除注释
        const codeOnly = content
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*/g, '');
        
        // 检查是否有拼装文案的逻辑（如 "剩余 X 次"）
        const messagePatterns = [
          /剩余.*次/,
          /已用.*次/,
          /免费.*次/,
          /\$\{.*count.*\}/,
          /\$\{.*usage.*\}/,
          /\$\{.*limit.*\}/
        ];
        
        for (const pattern of messagePatterns) {
          if (pattern.test(codeOnly)) {
            recordViolation(
              'Content 层职责',
              'warning',
              file,
              'Content 层拼装业务相关文案',
              '文案应该由 Background 生成并通过 uiData.message 传递'
            );
          }
        }
      }
    });
  });

  describe('需求 5.3：Content 层不直接访问 chrome.storage 读取业务数据', () => {
    const contentFiles = [
      'src/content/index.ts',
      'src/content/selection.ts',
      'src/content/extractor.ts',
      'src/content/panel.ts'
    ];

    test('Content 层不应读取业务数据（usage_count、pro_state 等）', () => {
      for (const file of contentFiles) {
        if (!fs.existsSync(file)) continue;
        
        const content = fs.readFileSync(file, 'utf-8');
        
        // 检查是否有 chrome.storage.local.get 调用
        const storageGetMatches = content.match(/chrome\.storage\.local\.get\s*\(\s*\[([^\]]+)\]/g);
        
        if (storageGetMatches) {
          for (const match of storageGetMatches) {
            // 提取键名
            const keysMatch = match.match(/\[([^\]]+)\]/);
            if (keysMatch) {
              const keys = keysMatch[1];
              
              // 检查是否读取了业务相关的键
              const businessKeys = [
                'usage_count',
                'last_usage_date',
                'usage_stats',
                'pro_state',
                'pro_features',
                'plan_type'
              ];
              
              for (const key of businessKeys) {
                if (keys.includes(key)) {
                  recordViolation(
                    'Storage 访问隔离',
                    'error',
                    file,
                    `Content 层直接读取业务数据: ${key}`,
                    '通过消息向 Background 请求数据，不要直接访问 storage'
                  );
                  expect(keys).not.toContain(key);
                }
              }
            }
          }
        }
      }
    });

    test('Content 层可以读取插件设置（enabled、panelPosition）', () => {
      const indexFile = 'src/content/index.ts';
      
      if (!fs.existsSync(indexFile)) return;
      
      const content = fs.readFileSync(indexFile, 'utf-8');
      
      // 允许读取插件设置
      const settingsPattern = /chrome\.storage\.local\.get\s*\(\s*\[\s*['"]enabled['"]|['"]panelPosition['"]/;
      
      // 这是允许的，所以我们只是检查是否存在
      if (settingsPattern.test(content)) {
        console.log('✅ Content 层正确读取插件设置');
      }
    });
  });

  describe('需求 5.3：Shared 层只包含类型定义和协议', () => {
    const sharedFile = 'src/shared/types.ts';

    test('Shared 层不应包含函数实现', () => {
      if (!fs.existsSync(sharedFile)) {
        recordViolation(
          'Shared 层纯净性',
          'error',
          sharedFile,
          'Shared 类型文件不存在',
          '创建 src/shared/types.ts'
        );
        return;
      }
      
      const content = fs.readFileSync(sharedFile, 'utf-8');
      
      // 移除注释
      const codeOnly = content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');
      
      // 检查是否有函数实现
      const functionPatterns = [
        /function\s+\w+\s*\(/,
        /const\s+\w+\s*=\s*\(/,
        /const\s+\w+\s*=\s*async\s*\(/,
        /=>\s*{[^}]*return/
      ];
      
      for (const pattern of functionPatterns) {
        if (pattern.test(codeOnly)) {
          recordViolation(
            'Shared 层纯净性',
            'error',
            sharedFile,
            'Shared 层包含函数实现',
            'Shared 层只应包含类型定义，将函数实现移至对应的业务模块'
          );
          expect(codeOnly).not.toMatch(pattern);
        }
      }
    });

    test('Shared 层不应包含类定义', () => {
      if (!fs.existsSync(sharedFile)) return;
      
      const content = fs.readFileSync(sharedFile, 'utf-8');
      
      // 移除注释
      const codeOnly = content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');
      
      // 检查是否有类定义
      if (/class\s+\w+/.test(codeOnly)) {
        recordViolation(
          'Shared 层纯净性',
          'error',
          sharedFile,
          'Shared 层包含类定义',
          'Shared 层只应包含接口和类型，将类定义移至对应的业务模块'
        );
        expect(codeOnly).not.toMatch(/class\s+\w+/);
      }
    });

    test('Shared 层不应包含业务概念定义', () => {
      if (!fs.existsSync(sharedFile)) return;
      
      const content = fs.readFileSync(sharedFile, 'utf-8');
      
      // 移除注释
      const codeOnly = content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');
      
      // 检查是否有业务概念定义
      const businessConcepts = [
        'FREE_POLICY',
        'UsagePolicy',
        'ProState',
        'ProFeature',
        'freeCount',
        'planType'
      ];
      
      for (const concept of businessConcepts) {
        const pattern = new RegExp(`\\b${concept}\\b`);
        if (pattern.test(codeOnly)) {
          recordViolation(
            'Shared 层纯净性',
            'error',
            sharedFile,
            `Shared 层包含业务概念定义: ${concept}`,
            '将业务概念定义移至 Background 层的对应模块'
          );
          expect(codeOnly).not.toMatch(pattern);
        }
      }
    });

    test('Shared 层应包含消息协议定义', () => {
      if (!fs.existsSync(sharedFile)) return;
      
      const content = fs.readFileSync(sharedFile, 'utf-8');
      
      // 应该包含消息协议
      expect(content).toMatch(/RequestActionMessage|REQUEST_ACTION/);
      expect(content).toMatch(/ActionResultMessage|ACTION_RESULT/);
      
      // 应该包含枚举类型
      expect(content).toMatch(/ActionType|ActionStatus|UIAction/);
    });
  });

  describe('需求 5.5：消息通信符合规范定义的协议格式', () => {
    test('Content → Background 消息应符合 REQUEST_ACTION 格式', () => {
      const indexFile = 'src/content/index.ts';
      
      if (!fs.existsSync(indexFile)) return;
      
      const content = fs.readFileSync(indexFile, 'utf-8');
      
      // 应该发送 REQUEST_ACTION 消息
      expect(content).toMatch(/type:\s*['"]REQUEST_ACTION['"]/);
      
      // 应该包含 payload.action
      expect(content).toMatch(/payload:\s*{[\s\S]*?action/);
    });

    test('Background → Content 消息应符合 ACTION_RESULT 格式', () => {
      const indexFile = 'src/background/index.ts';
      
      if (!fs.existsSync(indexFile)) return;
      
      const content = fs.readFileSync(indexFile, 'utf-8');
      
      // 应该返回包含 status、uiAction 的结果
      expect(content).toMatch(/status:\s*['"]ok['"]|status:\s*['"]limited['"]|status:\s*['"]blocked['"]/);
      expect(content).toMatch(/uiAction:\s*['"]SHOW_/);
    });

    test('消息协议应包含必需字段', () => {
      const backgroundFile = 'src/background/index.ts';
      
      if (!fs.existsSync(backgroundFile)) return;
      
      const content = fs.readFileSync(backgroundFile, 'utf-8');
      
      // 检查返回的消息是否包含必需字段
      // status: 'ok' | 'limited' | 'blocked'
      expect(content).toMatch(/status:\s*['"](?:ok|limited|blocked)['"]/);
      
      // uiAction: 'SHOW_RESULT_PANEL' | 'SHOW_LIMIT_PANEL' | 'SHOW_PRO_PANEL'
      expect(content).toMatch(/uiAction:\s*['"]SHOW_(?:RESULT|LIMIT|PRO)_PANEL['"]/);
    });

    test('uiData.message 应由 Background 生成', () => {
      const backgroundFile = 'src/background/index.ts';
      
      if (!fs.existsSync(backgroundFile)) return;
      
      const content = fs.readFileSync(backgroundFile, 'utf-8');
      
      // 应该有生成 message 的逻辑
      expect(content).toMatch(/uiData:\s*{[\s\S]*?message:/);
    });
  });

  describe('需求 5.4：违规项记录和修复建议', () => {
    test('应该记录所有发现的违规项', () => {
      if (violations.length > 0) {
        console.log(`\n发现 ${violations.length} 个架构实现违规项`);
        
        const errors = violations.filter(v => v.severity === 'error').length;
        const warnings = violations.filter(v => v.severity === 'warning').length;
        const infos = violations.filter(v => v.severity === 'info').length;
        
        console.log(`  - 错误: ${errors}`);
        console.log(`  - 警告: ${warnings}`);
        console.log(`  - 信息: ${infos}`);
      } else {
        console.log('\n✅ 未发现架构实现违规项，代码实现符合架构原则');
      }
      
      // 这个测试总是通过，因为它只是用来展示违规统计
      expect(true).toBe(true);
    });

    test('每个违规项都应该包含修复建议', () => {
      for (const violation of violations) {
        expect(violation.suggestion).toBeTruthy();
        expect(violation.suggestion.length).toBeGreaterThan(0);
      }
    });

    test('每个违规项都应该包含位置信息', () => {
      for (const violation of violations) {
        expect(violation.location).toBeTruthy();
        expect(violation.location.length).toBeGreaterThan(0);
      }
    });
  });
});
