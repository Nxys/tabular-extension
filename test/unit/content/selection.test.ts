/**
 * selection.ts 单元测试
 * 测试选择框组件的功能
 */

import { Selection } from '../../../src/content/selection';
import { CSS_CLASS_PREFIX, MIN_SELECTION_SIZE } from '../../../src/shared/constants';
import { mockGetBoundingClientRect, createDOMRect } from '../../mocks/dom';

describe('selection.ts', () => {
  let selection: Selection;

  beforeEach(() => {
    // 清理 DOM
    document.body.innerHTML = '';
    // 创建新的 Selection 实例
    selection = new Selection();
  });

  afterEach(() => {
    // 清理选择框
    selection.clear();
  });

  describe('start() - 创建选择框', () => {
    it('应该创建选择框元素', () => {
      // Arrange & Act
      selection.start(100, 200);

      // Assert
      const box = document.querySelector(`.${CSS_CLASS_PREFIX}-box`);
      expect(box).not.toBeNull();
      expect(box?.tagName).toBe('DIV');
    });

    it('应该设置选择框的初始位置', () => {
      // Arrange & Act
      selection.start(100, 200);

      // Assert
      const box = document.querySelector(`.${CSS_CLASS_PREFIX}-box`) as HTMLElement;
      expect(box.style.left).toBe('100px');
      expect(box.style.top).toBe('200px');
    });

    it('应该设置选择框的初始尺寸为 0', () => {
      // Arrange & Act
      selection.start(100, 200);

      // Assert
      const box = document.querySelector(`.${CSS_CLASS_PREFIX}-box`) as HTMLElement;
      expect(box.style.width).toBe('0px');
      expect(box.style.height).toBe('0px');
    });

    it('应该设置选择状态为 true', () => {
      // Arrange & Act
      selection.start(100, 200);

      // Assert
      expect(selection.getIsSelecting()).toBe(true);
    });
  });

  describe('update() - 更新选择框', () => {
    it('应该更新选择框的位置和尺寸（向右下拖动）', () => {
      // Arrange
      selection.start(100, 100);

      // Act
      selection.update(200, 200);

      // Assert
      const box = document.querySelector(`.${CSS_CLASS_PREFIX}-box`) as HTMLElement;
      expect(box.style.left).toBe('100px');
      expect(box.style.top).toBe('100px');
      expect(box.style.width).toBe('100px');
      expect(box.style.height).toBe('100px');
    });

    it('应该更新选择框的位置和尺寸（向左上拖动）', () => {
      // Arrange
      selection.start(200, 200);

      // Act
      selection.update(100, 100);

      // Assert
      const box = document.querySelector(`.${CSS_CLASS_PREFIX}-box`) as HTMLElement;
      expect(box.style.left).toBe('100px');
      expect(box.style.top).toBe('100px');
      expect(box.style.width).toBe('100px');
      expect(box.style.height).toBe('100px');
    });

    it('应该更新选择框的位置和尺寸（向右上拖动）', () => {
      // Arrange
      selection.start(100, 200);

      // Act
      selection.update(200, 100);

      // Assert
      const box = document.querySelector(`.${CSS_CLASS_PREFIX}-box`) as HTMLElement;
      expect(box.style.left).toBe('100px');
      expect(box.style.top).toBe('100px');
      expect(box.style.width).toBe('100px');
      expect(box.style.height).toBe('100px');
    });

    it('应该更新选择框的位置和尺寸（向左下拖动）', () => {
      // Arrange
      selection.start(200, 100);

      // Act
      selection.update(100, 200);

      // Assert
      const box = document.querySelector(`.${CSS_CLASS_PREFIX}-box`) as HTMLElement;
      expect(box.style.left).toBe('100px');
      expect(box.style.top).toBe('100px');
      expect(box.style.width).toBe('100px');
      expect(box.style.height).toBe('100px');
    });

    it('应该不做任何操作当选择框不存在时', () => {
      // Arrange - 不调用 start()

      // Act
      selection.update(200, 200);

      // Assert
      const box = document.querySelector(`.${CSS_CLASS_PREFIX}-box`);
      expect(box).toBeNull();
    });
  });

  describe('finish() - 返回选择区域', () => {
    it('应该返回选择区域', () => {
      // Arrange
      selection.start(100, 100);
      selection.update(200, 200);

      const box = document.querySelector(`.${CSS_CLASS_PREFIX}-box`) as HTMLElement;
      const rect = createDOMRect(100, 100, 100, 100);
      mockGetBoundingClientRect(box, rect);

      // Mock window.scrollX 和 window.scrollY
      Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      // Act
      const result = selection.finish();

      // Assert
      expect(result).not.toBeNull();
      expect(result).toEqual({
        left: 100,
        top: 100,
        right: 200,
        bottom: 200
      });
    });

    it('应该考虑页面滚动偏移', () => {
      // Arrange
      selection.start(100, 100);
      selection.update(200, 200);

      const box = document.querySelector(`.${CSS_CLASS_PREFIX}-box`) as HTMLElement;
      const rect = createDOMRect(100, 100, 100, 100);
      mockGetBoundingClientRect(box, rect);

      // Mock window.scrollX 和 window.scrollY
      Object.defineProperty(window, 'scrollX', { value: 50, writable: true });
      Object.defineProperty(window, 'scrollY', { value: 30, writable: true });

      // Act
      const result = selection.finish();

      // Assert
      expect(result).not.toBeNull();
      expect(result).toEqual({
        left: 150,
        top: 130,
        right: 250,
        bottom: 230
      });
    });

    it('应该清除选择框', () => {
      // Arrange
      selection.start(100, 100);
      selection.update(200, 200);

      const box = document.querySelector(`.${CSS_CLASS_PREFIX}-box`) as HTMLElement;
      const rect = createDOMRect(100, 100, 100, 100);
      mockGetBoundingClientRect(box, rect);

      // Mock window.scrollX 和 window.scrollY
      Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      // Act
      selection.finish();

      // Assert
      const boxAfter = document.querySelector(`.${CSS_CLASS_PREFIX}-box`);
      expect(boxAfter).toBeNull();
    });

    it('应该返回 null 当选择框不存在时', () => {
      // Arrange - 不调用 start()

      // Act
      const result = selection.finish();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('isValid() - 有效性验证', () => {
    it('应该返回 true 当选择区域大于最小尺寸时', () => {
      // Arrange
      const rect = {
        left: 100,
        top: 100,
        right: 200,
        bottom: 200
      };

      // Act
      const result = selection.isValid(rect);

      // Assert
      expect(result).toBe(true);
    });

    it('应该返回 false 当宽度小于最小尺寸时', () => {
      // Arrange
      const rect = {
        left: 100,
        top: 100,
        right: 100 + MIN_SELECTION_SIZE - 1,
        bottom: 200
      };

      // Act
      const result = selection.isValid(rect);

      // Assert
      expect(result).toBe(false);
    });

    it('应该返回 false 当高度小于最小尺寸时', () => {
      // Arrange
      const rect = {
        left: 100,
        top: 100,
        right: 200,
        bottom: 100 + MIN_SELECTION_SIZE - 1
      };

      // Act
      const result = selection.isValid(rect);

      // Assert
      expect(result).toBe(false);
    });

    it('应该返回 false 当宽度和高度都小于最小尺寸时', () => {
      // Arrange
      const rect = {
        left: 100,
        top: 100,
        right: 100 + MIN_SELECTION_SIZE - 1,
        bottom: 100 + MIN_SELECTION_SIZE - 1
      };

      // Act
      const result = selection.isValid(rect);

      // Assert
      expect(result).toBe(false);
    });

    it('应该返回 true 当宽度和高度等于最小尺寸时', () => {
      // Arrange
      const rect = {
        left: 100,
        top: 100,
        right: 100 + MIN_SELECTION_SIZE + 1,
        bottom: 100 + MIN_SELECTION_SIZE + 1
      };

      // Act
      const result = selection.isValid(rect);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('clear() - 清理操作', () => {
    it('应该移除选择框元素', () => {
      // Arrange
      selection.start(100, 100);
      expect(document.querySelector(`.${CSS_CLASS_PREFIX}-box`)).not.toBeNull();

      // Act
      selection.clear();

      // Assert
      const box = document.querySelector(`.${CSS_CLASS_PREFIX}-box`);
      expect(box).toBeNull();
    });

    it('应该重置选择状态', () => {
      // Arrange
      selection.start(100, 100);
      expect(selection.getIsSelecting()).toBe(true);

      // Act
      selection.clear();

      // Assert
      expect(selection.getIsSelecting()).toBe(false);
    });

    it('应该不抛出错误当选择框不存在时', () => {
      // Arrange - 不调用 start()

      // Act & Assert
      expect(() => selection.clear()).not.toThrow();
    });

    it('应该可以多次调用 clear()', () => {
      // Arrange
      selection.start(100, 100);

      // Act & Assert
      expect(() => {
        selection.clear();
        selection.clear();
        selection.clear();
      }).not.toThrow();
    });
  });

  describe('getIsSelecting() - 获取选择状态', () => {
    it('应该返回 false 当未开始选择时', () => {
      // Arrange & Act & Assert
      expect(selection.getIsSelecting()).toBe(false);
    });

    it('应该返回 true 当正在选择时', () => {
      // Arrange
      selection.start(100, 100);

      // Act & Assert
      expect(selection.getIsSelecting()).toBe(true);
    });

    it('应该返回 false 当选择完成后', () => {
      // Arrange
      selection.start(100, 100);
      selection.update(200, 200);

      const box = document.querySelector(`.${CSS_CLASS_PREFIX}-box`) as HTMLElement;
      const rect = createDOMRect(100, 100, 100, 100);
      mockGetBoundingClientRect(box, rect);

      // Mock window.scrollX 和 window.scrollY
      Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      // Act
      selection.finish();

      // Assert
      expect(selection.getIsSelecting()).toBe(false);
    });
  });
});
