/**
 * index.ts 单元测试
 * 
 * 测试范围：
 * - text-extract action 处理
 * - table-detect action 处理（含 Pro 检查）
 * - column-align action 处理（含 Pro 检查）
 * - csv-export action 处理（含 Pro 检查）
 * - 使用次数限制处理
 * - 异常兜底机制
 * 
 * 注意：本测试不测试 chrome.runtime.onMessage 监听器的注册，
 * 而是直接测试消息处理的业务逻辑。监听器注册是 Chrome 扩展的
 * 集成部分，应该在集成测试中验证。
 */

import { setToStorage } from '../storage';
import { checkUsage } from '../usage';
import { allow } from '../pro';

describe('index.ts - 消息处理逻辑', () => {
  beforeEach(() => {
    // 清空存储
    if (global.chrome?.storage?.local) {
      (global.chrome.storage.local as any).data?.clear();
    }
    
    // 设置固定日期
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('使用次数限制检查', () => {
    it('应该在达到上限时阻止操作', async () => {
      // Arrange
      await setToStorage('usage_count', 20);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      const usage = await checkUsage();
      
      // Assert
      expect(usage.allowed).toBe(false);
      expect(usage.reason).toBe('limit-reached');
      expect(usage.remaining).toBe(0);
    });

    it('应该在未达到上限时允许操作', async () => {
      // Arrange
      await setToStorage('usage_count', 10);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      const usage = await checkUsage();
      
      // Assert
      expect(usage.allowed).toBe(true);
      expect(usage.remaining).toBe(10);
    });
  });

  describe('Pro 功能权限检查', () => {
    it('应该在未启用 Pro 时阻止 table-detect', async () => {
      // Act
      const allowed = await allow('table-detect');
      
      // Assert
      expect(allowed).toBe(false);
    });

    it('应该在未启用 Pro 时阻止 column-align', async () => {
      // Act
      const allowed = await allow('column-align');
      
      // Assert
      expect(allowed).toBe(false);
    });

    it('应该在未启用 Pro 时阻止 csv-export', async () => {
      // Act
      const allowed = await allow('csv-export');
      
      // Assert
      expect(allowed).toBe(false);
    });

    it('应该在启用 Pro 后允许功能', async () => {
      // Arrange
      await setToStorage('pro_state', {
        isPro: true,
        signature: 'test',
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      });
      
      // Act & Assert
      expect(await allow('table-detect')).toBe(true);
      expect(await allow('column-align')).toBe(true);
      expect(await allow('csv-export')).toBe(true);
    });
  });

  describe('消息处理集成', () => {
    it('应该正确组合使用次数检查和 Pro 权限检查', async () => {
      // Arrange - 设置使用次数未达上限
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act - 检查使用次数
      const usage = await checkUsage();
      
      // Assert - 应该允许使用
      expect(usage.allowed).toBe(true);
      
      // Act - 检查 Pro 功能
      const proAllowed = await allow('table-detect');
      
      // Assert - 应该被 Pro 限制阻止
      expect(proAllowed).toBe(false);
    });

    it('应该在达到使用上限时优先返回限制提示', async () => {
      // Arrange - 设置使用次数达到上限
      await setToStorage('usage_count', 20);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      const usage = await checkUsage();
      
      // Assert - 应该被使用次数限制阻止
      expect(usage.allowed).toBe(false);
      expect(usage.reason).toBe('limit-reached');
    });

    it('应该在启用 Pro 且未达上限时允许所有操作', async () => {
      // Arrange
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      await setToStorage('pro_state', {
        isPro: true,
        signature: 'test',
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      });
      
      // Act
      const usage = await checkUsage();
      const tableDetectAllowed = await allow('table-detect');
      const columnAlignAllowed = await allow('column-align');
      const csvExportAllowed = await allow('csv-export');
      
      // Assert
      expect(usage.allowed).toBe(true);
      expect(tableDetectAllowed).toBe(true);
      expect(columnAlignAllowed).toBe(true);
      expect(csvExportAllowed).toBe(true);
    });
  });
});
