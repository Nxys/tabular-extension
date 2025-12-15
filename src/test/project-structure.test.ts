// 项目结构验证测试

import { BrowserSelectionCopy } from '../content.js';
import { SelectionRect, TextElement } from '../types.js';

describe('项目结构测试', () => {
  test('应该能够导入核心组件', () => {
    // 验证主要组件能正确导入
    expect(BrowserSelectionCopy).toBeDefined();
  });

  test('应该能够导入类型定义', () => {
    // 验证类型定义能正确导入
    const rect: SelectionRect = {
      left: 0,
      top: 0,
      right: 100,
      bottom: 100
    };
    expect(rect).toBeDefined();

    const element: TextElement = {
      text: '测试文本',
      rect: {
        left: 0,
        top: 0,
        right: 100,
        bottom: 20,
        width: 100,
        height: 20,
        x: 0,
        y: 0
      } as DOMRect,
      element: document.createElement('div'),
      lineIndex: 0,
      columnIndex: 0
    };
    expect(element).toBeDefined();
  });

  test('应该能够创建组件实例', () => {
    // 验证组件能正确实例化
    const browserSelectionCopy = new BrowserSelectionCopy();
    expect(browserSelectionCopy).toBeInstanceOf(BrowserSelectionCopy);
    
    // 清理实例
    browserSelectionCopy.cleanup();
  });

  test('组件应该实现正确的公共接口方法', () => {
    const browserSelectionCopy = new BrowserSelectionCopy();

    // 验证公共方法存在
    expect(typeof browserSelectionCopy.initialize).toBe('function');
    expect(typeof browserSelectionCopy.cleanup).toBe('function');

    // 清理实例
    browserSelectionCopy.cleanup();
  });

  test('应该正确处理文件依赖关系', () => {
    // 验证没有循环依赖
    expect(() => {
      new BrowserSelectionCopy();
    }).not.toThrow();
  });
});