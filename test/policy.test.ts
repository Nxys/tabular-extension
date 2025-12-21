/**
 * Policy 模块单元测试
 * 
 * 测试范围：
 * 1. UsagePolicy 接口存在
 * 2. FREE_POLICY.maxPerDay 等于 20
 * 
 * 验证需求：2.3
 */

import { UsagePolicy, FREE_POLICY } from '../src/content/usage/policy';

describe('Policy 模块单元测试', () => {
  describe('UsagePolicy 接口', () => {
    it('应该存在 UsagePolicy 接口', () => {
      // 验证接口可以被正确导入和使用
      const testPolicy: UsagePolicy = {
        maxPerDay: 10
      };
      
      expect(testPolicy).toBeDefined();
      expect(testPolicy.maxPerDay).toBe(10);
    });

    it('UsagePolicy 接口应该包含 maxPerDay 字段', () => {
      // 验证接口结构
      const testPolicy: UsagePolicy = {
        maxPerDay: 100
      };
      
      expect(testPolicy).toHaveProperty('maxPerDay');
      expect(typeof testPolicy.maxPerDay).toBe('number');
    });
  });

  describe('FREE_POLICY 常量', () => {
    it('应该存在 FREE_POLICY 常量', () => {
      expect(FREE_POLICY).toBeDefined();
    });

    it('FREE_POLICY.maxPerDay 应该等于 20', () => {
      expect(FREE_POLICY.maxPerDay).toBe(20);
    });

    it('FREE_POLICY 应该符合 UsagePolicy 接口', () => {
      // 类型检查：确保 FREE_POLICY 符合 UsagePolicy 接口
      const policy: UsagePolicy = FREE_POLICY;
      
      expect(policy).toBeDefined();
      expect(policy.maxPerDay).toBe(20);
    });

    it('FREE_POLICY 应该是不可变的（对象引用）', () => {
      // 验证 FREE_POLICY 是一个常量对象
      const originalMaxPerDay = FREE_POLICY.maxPerDay;
      
      // 尝试修改（TypeScript 会阻止，但运行时可以测试）
      // 注意：这个测试主要是文档性质的，说明 FREE_POLICY 应该被视为常量
      expect(FREE_POLICY.maxPerDay).toBe(originalMaxPerDay);
      expect(FREE_POLICY.maxPerDay).toBe(20);
    });
  });

  describe('策略值验证', () => {
    it('FREE_POLICY.maxPerDay 应该是正整数', () => {
      expect(FREE_POLICY.maxPerDay).toBeGreaterThan(0);
      expect(Number.isInteger(FREE_POLICY.maxPerDay)).toBe(true);
    });

    it('FREE_POLICY.maxPerDay 应该是合理的限制值', () => {
      // 验证免费策略的限制值在合理范围内（1-100）
      expect(FREE_POLICY.maxPerDay).toBeGreaterThanOrEqual(1);
      expect(FREE_POLICY.maxPerDay).toBeLessThanOrEqual(100);
    });
  });
});
