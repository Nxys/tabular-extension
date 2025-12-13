// 项目结构验证测试

import { SelectionBox } from '../components/selection.js';
import { VisualTextExtractor } from '../components/extractor.js';
import { ResultPanel } from '../components/panel.js';
import { MainController } from '../main.js';

describe('项目结构测试', () => {
  test('应该能够导入所有核心组件', () => {
    // 验证所有组件都能正确导入
    expect(SelectionBox).toBeDefined();
    expect(VisualTextExtractor).toBeDefined();
    expect(ResultPanel).toBeDefined();
    expect(MainController).toBeDefined();
  });

  test('应该能够创建组件实例', () => {
    // 验证所有组件都能正确实例化
    const selectionBox = new SelectionBox();
    const textExtractor = new VisualTextExtractor();
    const resultPanel = new ResultPanel();
    const mainController = new MainController();

    expect(selectionBox).toBeInstanceOf(SelectionBox);
    expect(textExtractor).toBeInstanceOf(VisualTextExtractor);
    expect(resultPanel).toBeInstanceOf(ResultPanel);
    expect(mainController).toBeInstanceOf(MainController);
  });

  test('组件应该实现正确的接口方法', () => {
    const selectionBox = new SelectionBox();
    const textExtractor = new VisualTextExtractor();
    const resultPanel = new ResultPanel();
    const mainController = new MainController();

    // 验证 SelectionBox 接口
    expect(typeof selectionBox.startSelection).toBe('function');
    expect(typeof selectionBox.updateSelection).toBe('function');
    expect(typeof selectionBox.finishSelection).toBe('function');
    expect(typeof selectionBox.clearSelection).toBe('function');

    // 验证 VisualTextExtractor 接口
    expect(typeof textExtractor.extractText).toBe('function');
    expect(typeof textExtractor.getTextElements).toBe('function');
    expect(typeof textExtractor.sortByVisualOrder).toBe('function');

    // 验证 ResultPanel 接口
    expect(typeof resultPanel.showResult).toBe('function');
    expect(typeof resultPanel.hide).toBe('function');
    expect(typeof resultPanel.copyToClipboard).toBe('function');

    // 验证 MainController 接口
    expect(typeof mainController.initialize).toBe('function');
    expect(typeof mainController.destroy).toBe('function');
  });
});