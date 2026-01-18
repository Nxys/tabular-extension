/**
 * crypto.ts 单元测试
 * 
 * 测试范围：
 * - 加密输出格式（base64 编码）
 * - 解密失败返回 null
 * - 密钥派生一致性
 * 
 * 需求：5.4, 5.5
 */

import { encryptProState, decryptProState } from '../crypto';
import type { ProState } from '../pro';

describe('crypto.ts', () => {
  const validProState: ProState = {
    isPro: true,
    signature: 'test-signature-123',
    features: {
      'table-detect': true,
      'column-align': true,
      'csv-export': true
    }
  };

  beforeEach(() => {
    // Mock chrome.runtime.id（加密模块需要）
    if (!chrome.runtime.id) {
      Object.defineProperty(chrome.runtime, 'id', {
        value: 'test-extension-id-12345',
        writable: true,
        configurable: true
      });
    }
  });

  describe('encryptProState', () => {
    it('应该返回 base64 编码的字符串', async () => {
      // Act
      const encrypted = await encryptProState(validProState);
      
      // Assert
      // base64 字符串只包含 A-Z, a-z, 0-9, +, /, =
      expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('应该返回不同的加密结果（每次生成新 IV）', async () => {
      // Act
      const encrypted1 = await encryptProState(validProState);
      const encrypted2 = await encryptProState(validProState);
      
      // Assert
      // 由于每次加密使用新的随机 IV，结果应该不同
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('应该能够加密不同的 Pro 状态', async () => {
      // Arrange
      const freeState: ProState = {
        isPro: false,
        signature: '',
        features: {
          'table-detect': false,
          'column-align': false,
          'csv-export': false
        }
      };
      
      // Act
      const encrypted1 = await encryptProState(validProState);
      const encrypted2 = await encryptProState(freeState);
      
      // Assert
      expect(encrypted1).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(encrypted2).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decryptProState', () => {
    it('应该在解密无效数据时返回 null', async () => {
      // Arrange
      const invalidData = 'invalid-base64-data';
      
      // Act
      const result = await decryptProState(invalidData);
      
      // Assert
      expect(result).toBeNull();
    });

    it('应该在解密空字符串时返回 null', async () => {
      // Act
      const result = await decryptProState('');
      
      // Assert
      expect(result).toBeNull();
    });

    it('应该在解密被篡改的数据时返回 null', async () => {
      // Arrange
      const encrypted = await encryptProState(validProState);
      // 篡改加密数据（修改最后一个字符）
      const tampered = encrypted.slice(0, -1) + 'X';
      
      // Act
      const result = await decryptProState(tampered);
      
      // Assert
      expect(result).toBeNull();
    });

    it('应该在解密格式错误的 base64 时返回 null', async () => {
      // Arrange
      const invalidBase64 = 'not@valid#base64!';
      
      // Act
      const result = await decryptProState(invalidBase64);
      
      // Assert
      expect(result).toBeNull();
    });

    it('应该在解密过短的数据时返回 null', async () => {
      // Arrange
      // 创建一个有效的 base64 字符串，但数据太短（少于 IV 长度）
      const shortData = btoa('short');
      
      // Act
      const result = await decryptProState(shortData);
      
      // Assert
      expect(result).toBeNull();
    });
  });

  describe('密钥派生一致性', () => {
    it('应该使用相同的密钥加密和解密（往返测试）', async () => {
      // Act
      const encrypted = await encryptProState(validProState);
      const decrypted = await decryptProState(encrypted);
      
      // Assert
      expect(decrypted).not.toBeNull();
      expect(decrypted).toEqual(validProState);
    });

    it('应该多次加密解密保持一致性', async () => {
      // Act & Assert
      for (let i = 0; i < 5; i++) {
        const encrypted = await encryptProState(validProState);
        const decrypted = await decryptProState(encrypted);
        
        expect(decrypted).toEqual(validProState);
      }
    });

    it('应该正确处理不同的 Pro 状态', async () => {
      // Arrange
      const states: ProState[] = [
        {
          isPro: true,
          signature: 'sig-1',
          features: {
            'table-detect': true,
            'column-align': false,
            'csv-export': true
          }
        },
        {
          isPro: false,
          signature: '',
          features: {
            'table-detect': false,
            'column-align': false,
            'csv-export': false
          }
        },
        {
          isPro: true,
          signature: 'very-long-signature-string-with-special-chars-!@#$%',
          features: {
            'table-detect': true,
            'column-align': true,
            'csv-export': true
          }
        }
      ];
      
      // Act & Assert
      for (const state of states) {
        const encrypted = await encryptProState(state);
        const decrypted = await decryptProState(encrypted);
        
        expect(decrypted).toEqual(state);
      }
    });
  });

  describe('错误处理', () => {
    it('应该在加密时处理异常情况', async () => {
      // Arrange
      // 创建一个会导致 JSON.stringify 失败的对象（循环引用）
      const circularState: any = { isPro: true, signature: 'test', features: {} };
      circularState.self = circularState; // 循环引用
      
      // Act & Assert
      await expect(encryptProState(circularState)).rejects.toThrow();
    });
  });
});
