/**
 * Pro 策略映射单元测试
 * 
 * 验证 resolvePipeline 函数的策略映射逻辑
 */

import { resolvePipeline, ContentMode, PipelineType } from '../src/content/pro/strategy';

describe('Pro Strategy - resolvePipeline', () => {
  /**
   * 需求 5.3: text 模式映射到 free pipeline
   */
  test('应该将 text 模式映射到 free pipeline', () => {
    const mode: ContentMode = 'text';
    const result: PipelineType = resolvePipeline(mode);
    
    expect(result).toBe('free');
  });

  /**
   * 需求 5.4: table 模式映射到 pro pipeline
   */
  test('应该将 table 模式映射到 pro pipeline', () => {
    const mode: ContentMode = 'table';
    const result: PipelineType = resolvePipeline(mode);
    
    expect(result).toBe('pro');
  });

  /**
   * 边界情况：默认行为
   */
  test('应该对未知模式返回 free pipeline（默认行为）', () => {
    // 使用类型断言测试默认行为
    const mode = 'unknown' as ContentMode;
    const result: PipelineType = resolvePipeline(mode);
    
    expect(result).toBe('free');
  });

  /**
   * 验证返回值类型
   */
  test('应该只返回 free 或 pro 两种类型', () => {
    const textResult = resolvePipeline('text');
    const tableResult = resolvePipeline('table');
    
    // 验证返回值是有效的 PipelineType
    expect(['free', 'pro']).toContain(textResult);
    expect(['free', 'pro']).toContain(tableResult);
  });

  /**
   * 验证函数的纯函数特性
   */
  test('应该是纯函数（相同输入产生相同输出）', () => {
    // 多次调用应该返回相同结果
    expect(resolvePipeline('text')).toBe('free');
    expect(resolvePipeline('text')).toBe('free');
    expect(resolvePipeline('table')).toBe('pro');
    expect(resolvePipeline('table')).toBe('pro');
  });

  /**
   * 验证函数不依赖外部状态
   */
  test('应该不依赖用户权限或其他外部状态', () => {
    // resolvePipeline 只负责策略映射，不判断权限
    // 无论调用多少次，结果都应该一致
    const results = Array(10).fill(null).map(() => resolvePipeline('table'));
    
    // 所有结果都应该是 'pro'
    expect(results.every(r => r === 'pro')).toBe(true);
  });
});
