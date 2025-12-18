// 浏览器框选复制插件核心功能测试

import { BrowserSelectionCopy } from '../src/content/content';
import { Extractor } from '../src/content/extractor';
import type { PanelPosition } from '../src/types';

describe('BrowserSelectionCopy 核心功能测试', () => {
  let browserSelectionCopy: BrowserSelectionCopy;
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));
  const enablePlugin = async (panelPosition: PanelPosition = 'center') => {
    await browserSelectionCopy.applySettings({ enabled: true, panelPosition });
    await flush();
  };

  beforeEach(async () => {
    // 清理 DOM 和全局状态
    document.body.innerHTML = '';
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({ enabled: false, panelPosition: 'center' });
    // 清理可能存在的全局实例
    if (window.browserSelectionCopy) {
      window.browserSelectionCopy.cleanup();
      delete window.browserSelectionCopy;
    }
    // 清理所有可能残留的面板
    const existingPanels = document.querySelectorAll('.browser-selection-copy-panel');
    existingPanels.forEach(panel => panel.remove());
    const existingBoxes = document.querySelectorAll('.browser-selection-copy-box');
    existingBoxes.forEach(box => box.remove());
    
    browserSelectionCopy = new BrowserSelectionCopy();
    await flush();
  });

  afterEach(() => {
    browserSelectionCopy.cleanup();
    document.body.innerHTML = '';
    // 清理全局实例
    if (window.browserSelectionCopy) {
      window.browserSelectionCopy.cleanup();
      delete window.browserSelectionCopy;
    }
  });

  describe('初始化测试', () => {
    test('应该能够正确初始化', () => {
      expect(browserSelectionCopy).toBeDefined();
    });

    test('应该绑定鼠标事件', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const tempInstance = new BrowserSelectionCopy();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
      tempInstance.cleanup();
    });
  });

  describe('启停与配置', () => {
    let extractSpy: jest.SpyInstance;

    beforeEach(() => {
      extractSpy = jest.spyOn(Extractor.prototype, 'extract').mockReturnValue('测试文本');
    });

    afterEach(() => {
      extractSpy.mockRestore();
    });

    test('默认禁用时不创建选择框', async () => {
      await browserSelectionCopy.applySettings({ enabled: false });

      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        button: 0
      });
      document.dispatchEvent(mouseDownEvent);

      const selectionBox = document.querySelector('.browser-selection-copy-box');
      expect(selectionBox).toBeFalsy();
    });

    test('快捷键可启用功能', async () => {
      await browserSelectionCopy.applySettings({ enabled: false });

      const keyEvent = new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, altKey: true, code: 'KeyC' });
      document.dispatchEvent(keyEvent);
      await flush();

      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 0,
        clientY: 0,
        button: 0
      });
      document.dispatchEvent(mouseDownEvent);

      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 100
      });
      document.dispatchEvent(mouseUpEvent);

      const resultPanel = document.querySelector('.browser-selection-copy-panel');
      expect(resultPanel).toBeTruthy();
    });

    test('面板模式为 none 时直接复制不弹出', async () => {
      await browserSelectionCopy.applySettings({ enabled: true, panelPosition: 'none' });

      document.body.innerHTML = `
        <div style="position: absolute; left: 50px; top: 50px;">测试文本</div>
      `;

      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 0,
        clientY: 0,
        button: 0
      });
      document.dispatchEvent(mouseDownEvent);

      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 100
      });
      document.dispatchEvent(mouseUpEvent);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      const resultPanel = document.querySelector('.browser-selection-copy-panel');
      expect(resultPanel).toBeFalsy();
    });
  });

  describe('选择框功能测试', () => {
    beforeEach(async () => {
      await enablePlugin();
    });

    test('应该能够创建选择框元素', () => {
      // 模拟鼠标按下事件
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        button: 0
      });

      document.dispatchEvent(mouseDownEvent);

      // 检查是否创建了选择框元素
      const selectionBox = document.querySelector('.browser-selection-copy-box');
      expect(selectionBox).toBeTruthy();
    });

    test('应该能够更新选择框大小', () => {
      // 开始选择
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        button: 0
      });
      document.dispatchEvent(mouseDownEvent);

      // 移动鼠标
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 200,
        clientY: 200
      });
      document.dispatchEvent(mouseMoveEvent);

      const selectionBox = document.querySelector('.browser-selection-copy-box') as HTMLElement;
      expect(selectionBox).toBeTruthy();
      expect(selectionBox.style.width).toBe('100px');
      expect(selectionBox.style.height).toBe('100px');
    });
  });

  describe('文本提取功能测试', () => {
    beforeEach(async () => {
      await enablePlugin();
    });

    test('应该能够提取可见文本', () => {
      // 创建测试 DOM 结构
      document.body.innerHTML = `
        <div style="position: absolute; left: 50px; top: 50px; width: 100px; height: 20px;">
          可见文本内容
        </div>
        <div style="display: none;">隐藏文本</div>
      `;

      // 由于 extractText 是私有方法，我们通过完整的选择流程来测试
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 0,
        clientY: 0,
        button: 0
      });
      document.dispatchEvent(mouseDownEvent);

      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 100
      });
      document.dispatchEvent(mouseUpEvent);

      // 检查是否显示了结果面板
      const resultPanel = document.querySelector('.browser-selection-copy-panel');
      expect(resultPanel).toBeTruthy();
    });
  });

  describe('结果面板功能测试', () => {
    let extractSpy: jest.SpyInstance;

    beforeEach(async () => {
      extractSpy = jest.spyOn(Extractor.prototype, 'extract').mockImplementation(() => {
        const marker = document.querySelector('[data-mock-text]');
        return marker?.textContent?.trim() || '测试文本';
      });
      await enablePlugin();
    });

    afterEach(() => {
      extractSpy.mockRestore();
    });

    test('应该能够显示提取的文本', () => {
      // 创建测试文本
      document.body.innerHTML = `
        <div data-mock-text style="position: absolute; left: 50px; top: 50px;">测试文本</div>
      `;

      // 执行选择操作
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 0,
        clientY: 0,
        button: 0
      });
      document.dispatchEvent(mouseDownEvent);

      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 100
      });
      document.dispatchEvent(mouseUpEvent);

      // 检查结果面板
      const resultPanel = document.querySelector('.browser-selection-copy-panel');
      expect(resultPanel).toBeTruthy();

      const buttons = resultPanel?.querySelectorAll('button') || [];
      const copyButton = buttons[buttons.length - 1];
      expect(copyButton).toBeTruthy();
      expect(copyButton?.textContent).toBe('复制到剪贴板');
    });

    test('应该能够复制文本到剪贴板', async () => {
      // 创建测试文本
      document.body.innerHTML = `
        <div data-mock-text style="position: absolute; left: 50px; top: 50px;">测试文本</div>
      `;

      // 执行选择操作
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 0,
        clientY: 0,
        button: 0
      });
      document.dispatchEvent(mouseDownEvent);

      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 100
      });
      document.dispatchEvent(mouseUpEvent);

      // 点击复制按钮
      const buttons = document.querySelectorAll('.browser-selection-copy-panel button');
      const copyButton = buttons[buttons.length - 1] as HTMLButtonElement;
      expect(copyButton).toBeTruthy();

      copyButton.click();

      // 验证 clipboard API 被调用
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    test('应该在正确位置显示面板', () => {
      // 创建测试文本
      document.body.innerHTML = `
        <div style="position: absolute; left: 50px; top: 50px;">测试文本</div>
      `;

      // 执行选择操作
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 0,
        clientY: 0,
        button: 0
      });
      document.dispatchEvent(mouseDownEvent);

      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 100
      });
      document.dispatchEvent(mouseUpEvent);

      // 检查面板位置
      const resultPanel = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
      expect(resultPanel).toBeTruthy();
      expect(resultPanel.style.position).toBe('fixed');
      expect(resultPanel.style.top).not.toBe('');
      expect(resultPanel.style.left).not.toBe('');
    });

    test('应该显示正确的文本内容', () => {
      // 创建测试文本
      const testText = '这是一段测试文本内容';
      document.body.innerHTML = `
        <div data-mock-text style="position: absolute; left: 50px; top: 50px;">${testText}</div>
      `;

      // 执行选择操作
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 0,
        clientY: 0,
        button: 0
      });
      document.dispatchEvent(mouseDownEvent);

      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 100
      });
      document.dispatchEvent(mouseUpEvent);

      // 检查面板内容
      const resultPanel = document.querySelector('.browser-selection-copy-panel');
      expect(resultPanel).toBeTruthy();
      
      const preview = resultPanel?.querySelector('textarea');
      expect((preview as HTMLTextAreaElement)?.value).toBe(testText);
    });

    test('关闭按钮应隐藏面板', async () => {
      document.body.innerHTML = `
        <div data-mock-text style="position: absolute; left: 50px; top: 50px;">测试文本</div>
      `;

      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 0, clientY: 0, button: 0 });
      document.dispatchEvent(mouseDownEvent);
      const mouseUpEvent = new MouseEvent('mouseup', { clientX: 200, clientY: 100 });
      document.dispatchEvent(mouseUpEvent);

      const closeButton = document.querySelector('.browser-selection-copy-panel button[data-role="close"]') as HTMLButtonElement;
      expect(closeButton).toBeTruthy();
      closeButton.click();
      await flush();

      const resultPanel = document.querySelector('.browser-selection-copy-panel');
      expect(resultPanel).toBeFalsy();
    });

    test('编辑后的文本应被复制', async () => {
      document.body.innerHTML = `
        <div style="position: absolute; left: 50px; top: 50px;">初始文本</div>
      `;

      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 0, clientY: 0, button: 0 });
      document.dispatchEvent(mouseDownEvent);
      const mouseUpEvent = new MouseEvent('mouseup', { clientX: 200, clientY: 100 });
      document.dispatchEvent(mouseUpEvent);

      const textarea = document.querySelector('.browser-selection-copy-panel textarea') as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      textarea.value = '修改后的文本';
      textarea.dispatchEvent(new Event('input'));

      const buttons = document.querySelectorAll('.browser-selection-copy-panel button');
      const copyButton = buttons[buttons.length - 1] as HTMLButtonElement;
      copyButton.click();
      await flush();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('修改后的文本');
    });

    test('面板可拖动改变位置', () => {
      document.body.innerHTML = `
        <div data-mock-text style="position: absolute; left: 50px; top: 50px;">测试文本</div>
      `;

      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 0, clientY: 0, button: 0 });
      document.dispatchEvent(mouseDownEvent);
      const mouseUpEvent = new MouseEvent('mouseup', { clientX: 200, clientY: 100 });
      document.dispatchEvent(mouseUpEvent);

      const header = document.querySelector('.browser-selection-copy-panel-header') as HTMLElement;
      expect(header).toBeTruthy();

      header.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 60, clientY: 60, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      const panel = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
      expect(panel.style.left).toBe('50px');
      expect(panel.style.top).toBe('50px');
    });

    test('应该在点击外部区域时隐藏面板', () => {
      // 创建测试文本
      document.body.innerHTML = `
        <div style="position: absolute; left: 50px; top: 50px;">测试文本</div>
      `;

      // 执行选择操作显示面板
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 0,
        clientY: 0,
        button: 0
      });
      document.dispatchEvent(mouseDownEvent);

      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 100
      });
      document.dispatchEvent(mouseUpEvent);

      // 验证面板已显示
      let resultPanel = document.querySelector('.browser-selection-copy-panel');
      expect(resultPanel).toBeTruthy();

      // 点击页面其他区域
      const outsideClickEvent = new MouseEvent('click', {
        clientX: 300,
        clientY: 300,
        bubbles: true
      });
      document.dispatchEvent(outsideClickEvent);

      // 验证面板已隐藏
      resultPanel = document.querySelector('.browser-selection-copy-panel');
      expect(resultPanel).toBeFalsy();
    });

    test('应该在面板内点击时不隐藏面板', () => {
      // 创建测试文本
      document.body.innerHTML = `
        <div style="position: absolute; left: 50px; top: 50px;">测试文本</div>
      `;

      // 执行选择操作显示面板
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 0,
        clientY: 0,
        button: 0
      });
      document.dispatchEvent(mouseDownEvent);

      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 100
      });
      document.dispatchEvent(mouseUpEvent);

      // 验证面板已显示
      let resultPanel = document.querySelector('.browser-selection-copy-panel');
      expect(resultPanel).toBeTruthy();

      // 点击面板内部
      const panelClickEvent = new MouseEvent('click', {
        bubbles: true
      });
      Object.defineProperty(panelClickEvent, 'target', {
        value: resultPanel,
        enumerable: true
      });
      document.dispatchEvent(panelClickEvent);

      // 验证面板仍然存在
      resultPanel = document.querySelector('.browser-selection-copy-panel');
      expect(resultPanel).toBeTruthy();
    });

    test('应该确保同一实例只有一个面板', () => {
      // 创建测试文本
      document.body.innerHTML = `
        <div data-mock-text style="position: absolute; left: 50px; top: 50px;">第一段文本</div>
        <div style="position: absolute; left: 50px; top: 100px;">第二段文本</div>
      `;

      // 第一次选择操作
      let mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 0,
        clientY: 0,
        button: 0
      });
      document.dispatchEvent(mouseDownEvent);

      let mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 80
      });
      document.dispatchEvent(mouseUpEvent);

      // 验证有面板显示
      let panels = document.querySelectorAll('.browser-selection-copy-panel');
      const firstPanelCount = panels.length;
      expect(firstPanelCount).toBeGreaterThan(0);

      // 第二次选择操作（同一个实例）
      mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 0,
        clientY: 80,
        button: 0
      });
      document.dispatchEvent(mouseDownEvent);

      mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 150
      });
      document.dispatchEvent(mouseUpEvent);

      // 验证面板数量没有增加（同一个Panel实例会先hide再show）
      panels = document.querySelectorAll('.browser-selection-copy-panel');
      expect(panels.length).toBe(firstPanelCount);
    });

    test('应该显示复制成功反馈', async () => {
      // 创建测试文本
      document.body.innerHTML = `
        <div data-mock-text style="position: absolute; left: 50px; top: 50px;">测试文本</div>
      `;

      // 执行选择操作
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 0,
        clientY: 0,
        button: 0
      });
      document.dispatchEvent(mouseDownEvent);

      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 100
      });
      document.dispatchEvent(mouseUpEvent);

      // 点击复制按钮
      const buttons = document.querySelectorAll('.browser-selection-copy-panel button');
      const copyButton = buttons[buttons.length - 1] as HTMLButtonElement;
      expect(copyButton).toBeTruthy();

      // 模拟成功的复制操作
      (navigator.clipboard.writeText as jest.Mock).mockResolvedValueOnce(undefined);
      
      copyButton.click();
      await flush();

      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 0));

      // 验证按钮显示成功状态
      expect(copyButton.textContent).toBe('✓ 已复制');
      expect(copyButton.style.background).toBe('rgb(40, 167, 69)'); // #28a745
    });

    test('应该显示复制失败反馈', async () => {
      // 临时禁用console.error以避免测试中的错误日志
      const originalConsoleError = console.error;
      console.error = jest.fn();

      try {
        // 创建测试文本
        document.body.innerHTML = `
          <div data-mock-text style="position: absolute; left: 50px; top: 50px;">测试文本</div>
        `;

        // 执行选择操作
        const mouseDownEvent = new MouseEvent('mousedown', {
          clientX: 0,
          clientY: 0,
          button: 0
        });
        document.dispatchEvent(mouseDownEvent);

        const mouseUpEvent = new MouseEvent('mouseup', {
          clientX: 200,
          clientY: 100
        });
        document.dispatchEvent(mouseUpEvent);

        // 点击复制按钮
        const buttons = document.querySelectorAll('.browser-selection-copy-panel button');
        const copyButton = buttons[buttons.length - 1] as HTMLButtonElement;
        expect(copyButton).toBeTruthy();

        // 模拟失败的复制操作
        (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(new Error('复制失败'));
        
        copyButton.click();

        // 等待异步操作完成
        await new Promise(resolve => setTimeout(resolve, 0));

        // 验证按钮显示失败状态
        expect(copyButton.textContent).toBe('复制失败');
        expect(copyButton.style.background).toBe('rgb(220, 53, 69)'); // #dc3545

        // 验证console.error被调用
        expect(console.error).toHaveBeenCalledWith('复制失败:', expect.any(Error));
      } finally {
        // 恢复原始的console.error
        console.error = originalConsoleError;
      }
    });

    test('应该在无文本内容时不显示面板', () => {
      extractSpy.mockReset();
      extractSpy.mockReturnValue('');
      // 创建完全空的DOM结构（没有任何文本）
      document.body.innerHTML = `
        <div style="position: absolute; left: 50px; top: 50px; width: 100px; height: 20px;"></div>
      `;

      // 执行选择操作
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 0,
        clientY: 0,
        button: 0
      });
      document.dispatchEvent(mouseDownEvent);

      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 100
      });
      document.dispatchEvent(mouseUpEvent);

      // 验证没有显示面板（因为没有提取到文本内容）
      const resultPanel = document.querySelector('.browser-selection-copy-panel');
      expect(resultPanel).toBeFalsy();
    });
  });

  describe('清理功能测试', () => {
    beforeEach(async () => {
      await enablePlugin();
    });

    test('应该能够清理资源', () => {
      // 测试cleanup方法不会抛出错误
      expect(() => {
        browserSelectionCopy.cleanup();
      }).not.toThrow();
      
      // 验证cleanup后DOM中没有插件创建的元素
      expect(document.querySelector('.browser-selection-copy-box')).toBeFalsy();
      expect(document.querySelector('.browser-selection-copy-panel')).toBeFalsy();
    });
  });
});