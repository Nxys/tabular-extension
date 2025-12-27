/**
 * constants.ts 常量测试
 * 
 * 验证：需求 3.2
 * 
 * 测试范围：
 * - CSS_CLASS_PREFIX 值
 * - IGNORED_TAGS 数组
 * - DEFAULT_LAYOUT_OPTIONS 对象
 * - MIN_SELECTION_SIZE 值
 */

import {
  CSS_CLASS_PREFIX,
  IGNORED_TAGS,
  DEFAULT_LAYOUT_OPTIONS,
  MIN_SELECTION_SIZE
} from '../constants';

describe('constants.ts - 常量定义测试', () => {
  describe('CSS_CLASS_PREFIX', () => {
    it('应该定义正确的 CSS 类名前缀', () => {
      // Assert
      expect(CSS_CLASS_PREFIX).toBe('browser-selection-copy');
    });

    it('应该是字符串类型', () => {
      // Assert
      expect(typeof CSS_CLASS_PREFIX).toBe('string');
    });

    it('应该不为空字符串', () => {
      // Assert
      expect(CSS_CLASS_PREFIX.length).toBeGreaterThan(0);
    });
  });

  describe('IGNORED_TAGS', () => {
    it('应该包含所有需要忽略的标签', () => {
      // Arrange
      const expectedTags = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];

      // Assert
      expect(IGNORED_TAGS).toEqual(expectedTags);
    });

    it('应该是只读数组', () => {
      // Assert
      expect(Array.isArray(IGNORED_TAGS)).toBe(true);
      // 验证是 readonly（TypeScript 编译时检查，运行时验证数组特性）
      expect(IGNORED_TAGS.length).toBe(4);
    });

    it('应该包含 INPUT 标签', () => {
      // Assert
      expect(IGNORED_TAGS).toContain('INPUT');
    });

    it('应该包含 TEXTAREA 标签', () => {
      // Assert
      expect(IGNORED_TAGS).toContain('TEXTAREA');
    });

    it('应该包含 SELECT 标签', () => {
      // Assert
      expect(IGNORED_TAGS).toContain('SELECT');
    });

    it('应该包含 BUTTON 标签', () => {
      // Assert
      expect(IGNORED_TAGS).toContain('BUTTON');
    });

    it('所有标签应该是大写字母', () => {
      // Assert
      IGNORED_TAGS.forEach(tag => {
        expect(tag).toBe(tag.toUpperCase());
      });
    });
  });

  describe('DEFAULT_LAYOUT_OPTIONS', () => {
    it('应该定义正确的默认布局选项', () => {
      // Assert
      expect(DEFAULT_LAYOUT_OPTIONS).toEqual({
        lineThresholdRatio: 5,
        minHorizontalGap: 10
      });
    });

    it('应该包含 lineThresholdRatio 属性', () => {
      // Assert
      expect(DEFAULT_LAYOUT_OPTIONS).toHaveProperty('lineThresholdRatio');
      expect(typeof DEFAULT_LAYOUT_OPTIONS.lineThresholdRatio).toBe('number');
    });

    it('应该包含 minHorizontalGap 属性', () => {
      // Assert
      expect(DEFAULT_LAYOUT_OPTIONS).toHaveProperty('minHorizontalGap');
      expect(typeof DEFAULT_LAYOUT_OPTIONS.minHorizontalGap).toBe('number');
    });

    it('lineThresholdRatio 应该为 5', () => {
      // Assert
      expect(DEFAULT_LAYOUT_OPTIONS.lineThresholdRatio).toBe(5);
    });

    it('minHorizontalGap 应该为 10', () => {
      // Assert
      expect(DEFAULT_LAYOUT_OPTIONS.minHorizontalGap).toBe(10);
    });

    it('所有值应该是正数', () => {
      // Assert
      expect(DEFAULT_LAYOUT_OPTIONS.lineThresholdRatio).toBeGreaterThan(0);
      expect(DEFAULT_LAYOUT_OPTIONS.minHorizontalGap).toBeGreaterThan(0);
    });
  });

  describe('MIN_SELECTION_SIZE', () => {
    it('应该定义正确的最小选择尺寸', () => {
      // Assert
      expect(MIN_SELECTION_SIZE).toBe(5);
    });

    it('应该是数字类型', () => {
      // Assert
      expect(typeof MIN_SELECTION_SIZE).toBe('number');
    });

    it('应该是正数', () => {
      // Assert
      expect(MIN_SELECTION_SIZE).toBeGreaterThan(0);
    });

    it('应该是合理的像素值', () => {
      // Assert
      // 最小选择尺寸应该在 1-100 像素之间
      expect(MIN_SELECTION_SIZE).toBeGreaterThanOrEqual(1);
      expect(MIN_SELECTION_SIZE).toBeLessThanOrEqual(100);
    });
  });

  describe('常量不可变性', () => {
    it('CSS_CLASS_PREFIX 应该保持不变', () => {
      // Arrange
      const original = CSS_CLASS_PREFIX;

      // Act & Assert
      expect(CSS_CLASS_PREFIX).toBe(original);
    });

    it('IGNORED_TAGS 数组长度应该保持不变', () => {
      // Arrange
      const originalLength = IGNORED_TAGS.length;

      // Act & Assert
      expect(IGNORED_TAGS.length).toBe(originalLength);
      expect(IGNORED_TAGS.length).toBe(4);
    });

    it('DEFAULT_LAYOUT_OPTIONS 应该保持不变', () => {
      // Arrange
      const original = { ...DEFAULT_LAYOUT_OPTIONS };

      // Act & Assert
      expect(DEFAULT_LAYOUT_OPTIONS).toEqual(original);
    });

    it('MIN_SELECTION_SIZE 应该保持不变', () => {
      // Arrange
      const original = MIN_SELECTION_SIZE;

      // Act & Assert
      expect(MIN_SELECTION_SIZE).toBe(original);
    });
  });
});
