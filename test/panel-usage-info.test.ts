/**
 * 面板免费额度显示测试
 * 验证文本预览面板标题区的免费额度显示功能
 */

import { Panel } from '../src/content/panel';

describe('面板免费额度显示', () => {
  let panel: Panel;

  beforeEach(() => {
    panel = new Panel();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    panel.hide();
  });

  describe('文本预览面板', () => {
    test('应该在标题区显示免费额度信息', () => {
      // 显示面板并传入 usageInfo
      panel.show('测试文本', {
        position: { left: 100, top: 100 },
        editable: true,
        usageInfo: { remaining: 15, max: 20 }
      });

      // 查找免费额度显示元素
      const usageInfoElement = document.querySelector('.browser-selection-copy-panel-usage-info');
      
      expect(usageInfoElement).toBeTruthy();
      expect(usageInfoElement?.textContent).toBe('剩余 15 次');
    });

    test('应该使用正确的样式类', () => {
      panel.show('测试文本', {
        position: { left: 100, top: 100 },
        editable: true,
        usageInfo: { remaining: 10, max: 20 }
      });

      const usageInfoElement = document.querySelector('.browser-selection-copy-panel-usage-info');
      
      expect(usageInfoElement?.classList.contains('browser-selection-copy-panel-usage-info')).toBe(true);
    });

    test('当没有 usageInfo 时不应该显示免费额度', () => {
      panel.show('测试文本', {
        position: { left: 100, top: 100 },
        editable: true
      });

      const usageInfoElement = document.querySelector('.browser-selection-copy-panel-usage-info');
      
      expect(usageInfoElement).toBeNull();
    });

    test('应该正确显示不同的剩余次数', () => {
      // 测试剩余 0 次
      panel.show('测试文本', {
        position: { left: 100, top: 100 },
        editable: true,
        usageInfo: { remaining: 0, max: 20 }
      });

      let usageInfoElement = document.querySelector('.browser-selection-copy-panel-usage-info');
      expect(usageInfoElement?.textContent).toBe('剩余 0 次');

      // 测试剩余 20 次
      panel.show('测试文本', {
        position: { left: 100, top: 100 },
        editable: true,
        usageInfo: { remaining: 20, max: 20 }
      });

      usageInfoElement = document.querySelector('.browser-selection-copy-panel-usage-info');
      expect(usageInfoElement?.textContent).toBe('剩余 20 次');
    });

    test('免费额度信息应该在标题区内', () => {
      panel.show('测试文本', {
        position: { left: 100, top: 100 },
        editable: true,
        usageInfo: { remaining: 15, max: 20 }
      });

      const titleElement = document.querySelector('.browser-selection-copy-panel-title');
      const usageInfoElement = document.querySelector('.browser-selection-copy-panel-usage-info');
      
      expect(titleElement).toBeTruthy();
      expect(usageInfoElement).toBeTruthy();
      expect(titleElement?.contains(usageInfoElement as Node)).toBe(true);
    });
  });

  describe('限制面板', () => {
    test('限制面板不应该显示文本预览面板的免费额度信息', () => {
      panel.showLimitReached({ current: 20, max: 20 });

      // 查找文本预览面板的免费额度显示元素（应该不存在）
      const usageInfoElement = document.querySelector('.browser-selection-copy-panel-usage-info');
      
      expect(usageInfoElement).toBeNull();
    });
  });

  describe('CSS 样式验证', () => {
    test('免费额度信息应该有正确的样式属性', () => {
      panel.show('测试文本', {
        position: { left: 100, top: 100 },
        editable: true,
        usageInfo: { remaining: 15, max: 20 }
      });

      const usageInfoElement = document.querySelector('.browser-selection-copy-panel-usage-info') as HTMLElement;
      
      expect(usageInfoElement).toBeTruthy();
      
      // 验证样式类存在（实际样式由 CSS 文件控制）
      expect(usageInfoElement.className).toContain('browser-selection-copy-panel-usage-info');
    });
  });
});
