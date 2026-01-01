/**
 * 面板定位集成测试
 * 验证 panelPosition 设置是否正确应用到面板显示位置
 * 
 * Feature: integration-testing
 * 需求：验证面板位置设置的端到端功能
 */

import { Panel } from '../../content/panel';
import type { PanelPosition } from '../../shared/types';

describe('面板定位集成测试', () => {
  let panel: Panel;
  
  beforeEach(() => {
    panel = new Panel();
    // 清理可能存在的面板
    document.body.innerHTML = '';
  });
  
  afterEach(() => {
    panel.hide();
    document.body.innerHTML = '';
  });
  
  describe('showResult 应该根据 panelPosition 定位面板', () => {
    test('panelPosition 为 center 时应该居中显示', () => {
      // Arrange: 设置视口大小
      Object.defineProperty(window, 'innerWidth', { value: 1000, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
      
      // Act: 显示面板（居中模式）
      const position: PanelPosition = 'center';
      panel.showResult({ text: '测试文本' }, position);
      
      // Assert: 验证面板位置接近居中
      const panelElement = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
      expect(panelElement).toBeTruthy();
      
      const left = parseInt(panelElement.style.left);
      const top = parseInt(panelElement.style.top);
      const rect = panelElement.getBoundingClientRect();
      
      // 面板应该在视口中心附近（允许一定误差）
      const expectedLeft = (1000 - rect.width) / 2;
      const expectedTop = (800 - rect.height) / 2;
      
      expect(Math.abs(left - expectedLeft)).toBeLessThan(10);
      expect(Math.abs(top - expectedTop)).toBeLessThan(10);
    });
    
    test('panelPosition 为 mouse 时应该跟随鼠标位置', () => {
      // Arrange: 设置鼠标位置
      panel.updateMousePosition(200, 150);
      
      // Act: 显示面板（跟随鼠标模式）
      panel.showResult({ text: '测试文本' }, 'mouse');
      
      // Assert: 验证面板位置在鼠标附近
      const panelElement = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
      expect(panelElement).toBeTruthy();
      
      const left = parseInt(panelElement.style.left);
      const top = parseInt(panelElement.style.top);
      
      // 面板应该在鼠标位置偏移 10px 处
      expect(left).toBeGreaterThanOrEqual(200);
      expect(top).toBeGreaterThanOrEqual(150);
    });
    
    test('panelPosition 为 none 时应该显示在左上角', () => {
      // Act: 显示面板（直接复制模式）
      panel.showResult({ text: '测试文本' }, 'none');
      
      // Assert: 验证面板位置在左上角
      const panelElement = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
      expect(panelElement).toBeTruthy();
      
      const left = parseInt(panelElement.style.left);
      const top = parseInt(panelElement.style.top);
      
      // 面板应该在左上角附近
      expect(left).toBeLessThan(50);
      expect(top).toBeLessThan(50);
    });
    
    test('不同 panelPosition 应该产生不同的面板位置', () => {
      // Arrange: 设置视口和鼠标位置
      Object.defineProperty(window, 'innerWidth', { value: 1000, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
      panel.updateMousePosition(300, 250);
      
      // Act & Assert: 测试 center 模式
      panel.showResult({ text: '测试' }, 'center');
      let panelElement = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
      const centerLeft = parseInt(panelElement.style.left);
      const centerTop = parseInt(panelElement.style.top);
      panel.hide();
      
      // Act & Assert: 测试 mouse 模式
      panel.showResult({ text: '测试' }, 'mouse');
      panelElement = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
      const mouseLeft = parseInt(panelElement.style.left);
      const mouseTop = parseInt(panelElement.style.top);
      panel.hide();
      
      // Act & Assert: 测试 none 模式
      panel.showResult({ text: '测试' }, 'none');
      panelElement = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
      const noneLeft = parseInt(panelElement.style.left);
      
      // 验证三种模式产生不同的位置
      expect(centerLeft).not.toBe(mouseLeft);
      expect(centerTop).not.toBe(mouseTop);
      expect(mouseLeft).not.toBe(noneLeft);
      expect(centerLeft).not.toBe(noneLeft);
    });
    
    test('面板应该始终完整显示在视口内', () => {
      // Arrange: 设置小视口
      Object.defineProperty(window, 'innerWidth', { value: 400, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 300, writable: true });
      
      // 设置鼠标位置在视口边缘
      panel.updateMousePosition(380, 280);
      
      // Act: 显示面板（跟随鼠标模式）
      panel.showResult({ text: '测试文本' }, 'mouse');
      
      // Assert: 验证面板不会超出视口
      const panelElement = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
      const rect = panelElement.getBoundingClientRect();
      
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.top).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(400);
      expect(rect.bottom).toBeLessThanOrEqual(300);
    });
  });
  
  describe('showLimit 和 showPro 应该始终居中', () => {
    test('showLimit 应该忽略 panelPosition 设置，始终居中', () => {
      // Act: 显示限制面板
      panel.showLimit({ message: '免费次数已用完' });
      
      // Assert: 验证面板有强制居中的 CSS 类
      const panelElement = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
      expect(panelElement).toBeTruthy();
      expect(panelElement.classList.contains('browser-selection-copy-panel-force-center')).toBe(true);
    });
    
    test('showPro 应该忽略 panelPosition 设置，始终居中', () => {
      // Act: 显示 Pro 面板
      panel.showPro({ message: '这是 Pro 功能' });
      
      // Assert: 验证面板有强制居中的 CSS 类
      const panelElement = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
      expect(panelElement).toBeTruthy();
      expect(panelElement.classList.contains('browser-selection-copy-panel-force-center')).toBe(true);
    });
  });
  
  describe('鼠标位置更新', () => {
    test('updateMousePosition 应该更新内部鼠标位置', () => {
      // Arrange & Act: 更新鼠标位置
      panel.updateMousePosition(100, 200);
      
      // 显示面板（跟随鼠标模式）
      panel.showResult({ text: '测试' }, 'mouse');
      
      // Assert: 验证面板位置基于更新的鼠标位置
      const panelElement = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
      const left = parseInt(panelElement.style.left);
      const top = parseInt(panelElement.style.top);
      
      expect(left).toBeGreaterThanOrEqual(100);
      expect(top).toBeGreaterThanOrEqual(200);
    });
    
    test('多次更新鼠标位置应该使用最新位置', () => {
      // Arrange & Act: 多次更新鼠标位置
      panel.updateMousePosition(100, 100);
      panel.updateMousePosition(200, 200);
      panel.updateMousePosition(300, 300);
      
      // 显示面板
      panel.showResult({ text: '测试' }, 'mouse');
      
      // Assert: 验证使用最新的鼠标位置
      const panelElement = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
      const left = parseInt(panelElement.style.left);
      const top = parseInt(panelElement.style.top);
      
      expect(left).toBeGreaterThanOrEqual(300);
      expect(top).toBeGreaterThanOrEqual(300);
    });
  });
});
