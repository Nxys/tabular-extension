import { ResultPanel } from '../components/ResultPanel.js';

/**
 * ResultPanel 交互逻辑测试
 */
describe('ResultPanel 交互逻辑', () => {
  let resultPanel: ResultPanel;

  beforeEach(() => {
    resultPanel = new ResultPanel();
    // 清理可能存在的面板元素
    document.querySelectorAll('.browser-selection-copy-panel').forEach(el => el.remove());
  });

  afterEach(() => {
    // 清理测试后的面板元素
    resultPanel.hide();
    document.querySelectorAll('.browser-selection-copy-panel').forEach(el => el.remove());
  });

  describe('面板显示和隐藏', () => {
    test('应该能够显示结果面板', () => {
      const testText = '测试文本内容';
      
      resultPanel.showResult(testText);
      
      const panel = document.querySelector('.browser-selection-copy-panel');
      expect(panel).toBeTruthy();
      expect(panel?.textContent).toContain(testText);
    });

    test('应该能够隐藏结果面板', () => {
      resultPanel.showResult('测试文本');
      
      let panel = document.querySelector('.browser-selection-copy-panel');
      expect(panel).toBeTruthy();
      
      resultPanel.hide();
      
      panel = document.querySelector('.browser-selection-copy-panel');
      expect(panel).toBeFalsy();
    });

    test('显示新面板时应该清除之前的面板', () => {
      resultPanel.showResult('第一个文本');
      resultPanel.showResult('第二个文本');
      
      const panels = document.querySelectorAll('.browser-selection-copy-panel');
      expect(panels.length).toBe(1);
      expect(panels[0].textContent).toContain('第二个文本');
    });
  });

  describe('点击外部区域隐藏面板', () => {
    test('点击面板外部应该隐藏面板', (done) => {
      resultPanel.showResult('测试文本');
      
      let panel = document.querySelector('.browser-selection-copy-panel');
      expect(panel).toBeTruthy();
      
      // 延迟执行点击事件，因为事件监听器是异步添加的
      setTimeout(() => {
        // 模拟点击页面其他区域
        const outsideElement = document.createElement('div');
        document.body.appendChild(outsideElement);
        
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        });
        
        outsideElement.dispatchEvent(clickEvent);
        
        // 检查面板是否被隐藏
        setTimeout(() => {
          panel = document.querySelector('.browser-selection-copy-panel');
          expect(panel).toBeFalsy();
          
          document.body.removeChild(outsideElement);
          done();
        }, 10);
      }, 10);
    });

    test('点击面板内部不应该隐藏面板', (done) => {
      resultPanel.showResult('测试文本');
      
      setTimeout(() => {
        const panel = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
        expect(panel).toBeTruthy();
        
        // 模拟点击面板内部
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        });
        
        panel.dispatchEvent(clickEvent);
        
        // 检查面板是否仍然存在
        setTimeout(() => {
          const stillExists = document.querySelector('.browser-selection-copy-panel');
          expect(stillExists).toBeTruthy();
          done();
        }, 10);
      }, 10);
    });
  });

  describe('键盘交互', () => {
    test('按 ESC 键应该隐藏面板', (done) => {
      resultPanel.showResult('测试文本');
      
      let panel = document.querySelector('.browser-selection-copy-panel');
      expect(panel).toBeTruthy();
      
      // 延迟执行键盘事件，因为事件监听器是异步添加的
      setTimeout(() => {
        const escEvent = new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        });
        
        document.dispatchEvent(escEvent);
        
        // 检查面板是否被隐藏
        setTimeout(() => {
          panel = document.querySelector('.browser-selection-copy-panel');
          expect(panel).toBeFalsy();
          done();
        }, 10);
      }, 10);
    });

    test('按其他键不应该隐藏面板', (done) => {
      resultPanel.showResult('测试文本');
      
      setTimeout(() => {
        const panel = document.querySelector('.browser-selection-copy-panel');
        expect(panel).toBeTruthy();
        
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        });
        
        document.dispatchEvent(enterEvent);
        
        // 检查面板是否仍然存在
        setTimeout(() => {
          const stillExists = document.querySelector('.browser-selection-copy-panel');
          expect(stillExists).toBeTruthy();
          done();
        }, 10);
      }, 10);
    });
  });

  describe('事件监听器清理', () => {
    test('隐藏面板时应该清理事件监听器', () => {
      resultPanel.showResult('测试文本');
      
      // 验证面板存在
      const panel = document.querySelector('.browser-selection-copy-panel');
      expect(panel).toBeTruthy();
      
      // 隐藏面板
      resultPanel.hide();
      
      // 验证面板被移除
      const hiddenPanel = document.querySelector('.browser-selection-copy-panel');
      expect(hiddenPanel).toBeFalsy();
      
      // 这里我们无法直接测试事件监听器是否被移除，
      // 但可以通过代码审查确认 removeOutsideClickListener 和 removeKeydownListener 被调用
    });
  });
});