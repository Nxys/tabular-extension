/**
 * pro.ts 单元测试
 * 
 * 测试范围：
 * - allow() 默认状态（所有功能不可用）
 * - Pro 状态读取
 */

import { allow } from '../../../src/background/pro';
import { setToStorage } from '../../../src/background/storage';

describe('pro.ts', () => {
  beforeEach(() => {
    // 清空存储
    if (global.chrome?.storage?.local) {
      (global.chrome.storage.local as any).data?.clear();
    }
  });

  describe('allow', () => {
    it('应该返回 false 对于 table-detect 功能（默认状态）', async () => {
      // Act
      const result = await allow('table-detect');
      
      // Assert
      expect(result).toBe(false);
    });

    it('应该返回 false 对于 column-align 功能（默认状态）', async () => {
      // Act
      const result = await allow('column-align');
      
      // Assert
      expect(result).toBe(false);
    });

    it('应该返回 false 对于 csv-export 功能（默认状态）', async () => {
      // Act
      const result = await allow('csv-export');
      
      // Assert
      expect(result).toBe(false);
    });

    it('应该返回 false 当 Pro 状态为 false 时', async () => {
      // Arrange
      await setToStorage('pro_state', {
        isPro: false,
        signature: '',
        features: {
          'table-detect': false,
          'column-align': false,
          'csv-export': false
        }
      });
      
      // Act
      const result = await allow('table-detect');
      
      // Assert
      expect(result).toBe(false);
    });

    it('应该返回 false 当 Pro 状态为 true 但功能未启用时', async () => {
      // Arrange
      await setToStorage('pro_state', {
        isPro: true,
        signature: 'test-signature',
        features: {
          'table-detect': false,
          'column-align': false,
          'csv-export': false
        }
      });
      
      // Act
      const result = await allow('table-detect');
      
      // Assert
      expect(result).toBe(false);
    });

    it('应该返回 true 当 Pro 状态为 true 且功能已启用时', async () => {
      // Arrange
      await setToStorage('pro_state', {
        isPro: true,
        signature: 'test-signature',
        features: {
          'table-detect': true,
          'column-align': false,
          'csv-export': false
        }
      });
      
      // Act
      const result = await allow('table-detect');
      
      // Assert
      expect(result).toBe(true);
    });

    it('应该为不同功能返回不同的结果', async () => {
      // Arrange
      await setToStorage('pro_state', {
        isPro: true,
        signature: 'test-signature',
        features: {
          'table-detect': true,
          'column-align': false,
          'csv-export': true
        }
      });
      
      // Act & Assert
      expect(await allow('table-detect')).toBe(true);
      expect(await allow('column-align')).toBe(false);
      expect(await allow('csv-export')).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该在读取 Pro 状态失败时返回 false', async () => {
      // Arrange - 设置一个无效的 Pro 状态
      await setToStorage('pro_state', 'invalid');
      
      // Act
      const result = await allow('table-detect');
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('应该在检查权限时处理异常', async () => {
      // Arrange - 设置一个会导致错误的状态
      await setToStorage('pro_state', null);
      
      // Act
      const result = await allow('table-detect');
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('应该处理缺少 features 字段的 Pro 状态', async () => {
      // Arrange
      await setToStorage('pro_state', {
        isPro: true,
        signature: 'test'
        // 缺少 features 字段
      });
      
      // Act
      const result = await allow('table-detect');
      
      // Assert
      expect(result).toBe(false);
    });
  });
});
