/**
 * pro.ts 单元测试
 * 
 * 测试范围：
 * - allow() 默认状态（所有功能不可用）
 * - Pro 状态读取
 */

import { allow } from '../pro';
import { setToStorage } from '../storage';

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
});
