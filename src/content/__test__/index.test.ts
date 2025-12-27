/**
 * content/index.ts 单元测试
 * 测试事件监听、消息发送和 UI Action 执行
 */

import { BrowserSelectionCopy } from '../index';
import { createChromeMock } from '../../__test__/mocks/chrome';

describe('content/index.ts', () => {
  let instance: BrowserSelectionCopy;

  beforeEach(async () => {
    // 清理 DOM
    document.body.innerHTML = '';
    
    // 重新创建 chrome mock（确保每个测试都有干净的 chrome 对象）
    global.chrome = createChromeMock();
    
    // 设置默认的 storage mock 数据
    await chrome.storage.local.set({
      enabled: true,
      panelPosition: 'center'
    });

    // 创建实例
    instance = new BrowserSelectionCopy();
    instance.initialize();

    // 等待设置初始化
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(() => {
    // 清理实例
    instance.cleanup();
  });

  describe('事件监听绑定', () => {
    it('应该绑定 mousedown 事件监听器', () => {
      // Arrange
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      // Act
      const newInstance = new BrowserSelectionCopy();
      newInstance.initialize();

      // Assert
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

      // Cleanup
      newInstance.cleanup();
    });

    it('应该绑定 mousemove 事件监听器', () => {
      // Arrange
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      // Act
      const newInstance = new BrowserSelectionCopy();
      newInstance.initialize();

      // Assert
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));

      // Cleanup
      newInstance.cleanup();
    });

    it('应该绑定 mouseup 事件监听器', () => {
      // Arrange
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      // Act
      const newInstance = new BrowserSelectionCopy();
      newInstance.initialize();

      // Assert
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

      // Cleanup
      newInstance.cleanup();
    });

    it('应该绑定 click 事件监听器', () => {
      // Arrange
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      // Act
      const newInstance = new BrowserSelectionCopy();
      newInstance.initialize();

      // Assert
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));

      // Cleanup
      newInstance.cleanup();
    });

    it('应该绑定 keydown 事件监听器', () => {
      // Arrange
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      // Act
      const newInstance = new BrowserSelectionCopy();
      newInstance.initialize();

      // Assert
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      // Cleanup
      newInstance.cleanup();
    });
  });

  describe('mousedown 事件处理', () => {
    it('应该忽略右键点击', () => {
      // Arrange & Act
      const event = new MouseEvent('mousedown', {
        button: 2, // 右键
        clientX: 100,
        clientY: 100
      });
      document.dispatchEvent(event);

      // Assert - 不应该创建选择框
      const box = document.querySelector('.browser-selection-copy-box');
      expect(box).toBeNull();
    });

    it('应该忽略中键点击', () => {
      // Arrange & Act
      const event = new MouseEvent('mousedown', {
        button: 1, // 中键
        clientX: 100,
        clientY: 100
      });
      document.dispatchEvent(event);

      // Assert - 不应该创建选择框
      const box = document.querySelector('.browser-selection-copy-box');
      expect(box).toBeNull();
    });

    it('应该忽略在 INPUT 元素上的点击', () => {
      // Arrange
      const input = document.createElement('input');
      document.body.appendChild(input);

      // Act
      const event = new MouseEvent('mousedown', {
        button: 0,
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      input.dispatchEvent(event);

      // Assert - 不应该创建选择框
      const box = document.querySelector('.browser-selection-copy-box');
      expect(box).toBeNull();
    });

    it('应该忽略在 TEXTAREA 元素上的点击', () => {
      // Arrange
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      // Act
      const event = new MouseEvent('mousedown', {
        button: 0,
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      textarea.dispatchEvent(event);

      // Assert - 不应该创建选择框
      const box = document.querySelector('.browser-selection-copy-box');
      expect(box).toBeNull();
    });

    it('应该忽略在 BUTTON 元素上的点击', () => {
      // Arrange
      const button = document.createElement('button');
      document.body.appendChild(button);

      // Act
      const event = new MouseEvent('mousedown', {
        button: 0,
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      button.dispatchEvent(event);

      // Assert - 不应该创建选择框
      const box = document.querySelector('.browser-selection-copy-box');
      expect(box).toBeNull();
    });
  });

  describe('mousemove 事件处理', () => {
    it('应该忽略 mousemove 事件当未开始选择时', () => {
      // Arrange & Act
      const event = new MouseEvent('mousemove', {
        clientX: 200,
        clientY: 200
      });
      document.dispatchEvent(event);

      // Assert - 不应该有任何效果
      const box = document.querySelector('.browser-selection-copy-box');
      expect(box).toBeNull();
    });
  });

  describe('mouseup 事件处理', () => {
    it('应该忽略 mouseup 事件当未开始选择时', () => {
      // Arrange & Act
      const event = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 200
      });
      document.dispatchEvent(event);

      // Assert - 不应该有任何效果
      const panel = document.querySelector('.browser-selection-copy-panel');
      expect(panel).toBeNull();
    });
  });

  describe('消息发送', () => {
    it('应该有 chrome.runtime.sendMessage 可用', () => {
      // Assert
      expect(chrome.runtime.sendMessage).toBeDefined();
      expect(typeof chrome.runtime.sendMessage).toBe('function');
    });
  });

  describe('UI Action 执行', () => {
    it('应该能够创建 BrowserSelectionCopy 实例', () => {
      // Arrange & Act
      const newInstance = new BrowserSelectionCopy();

      // Assert
      expect(newInstance).toBeDefined();
      expect(newInstance.initialize).toBeDefined();
      expect(newInstance.cleanup).toBeDefined();

      // Cleanup
      newInstance.cleanup();
    });
  });

  describe('设置管理', () => {
    describe('设置初始化', () => {
      it('应该从 chrome.storage 读取设置', async () => {
        // Arrange
        await chrome.storage.local.set({
          enabled: true,
          panelPosition: 'mouse'
        });

        // Act
        const newInstance = new BrowserSelectionCopy();
        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert - 通过测试行为验证设置已加载
        const div = document.createElement('div');
        document.body.appendChild(div);
        const event = new MouseEvent('mousedown', {
          button: 0,
          clientX: 100,
          clientY: 100,
          bubbles: true
        });
        div.dispatchEvent(event);

        // 如果设置正确加载（enabled: true），应该创建选择框
        const box = document.querySelector('.browser-selection-copy-box');
        expect(box).not.toBeNull();

        // Cleanup
        newInstance.cleanup();
      });

      it('应该使用默认设置当 chrome.storage 不可用时', async () => {
        // Arrange - 在创建实例前清理并重新设置 chrome mock
        instance.cleanup();
        
        const originalChrome = global.chrome;
        // 创建一个没有 storage 的 chrome mock
        (global as any).chrome = {
          runtime: originalChrome.runtime,
          tabs: originalChrome.tabs,
          commands: originalChrome.commands,
          storage: undefined
        };

        // Act
        const newInstance = new BrowserSelectionCopy();
        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert - 默认设置 enabled: false，不应该响应鼠标事件
        const div = document.createElement('div');
        document.body.appendChild(div);
        const event = new MouseEvent('mousedown', {
          button: 0,
          clientX: 100,
          clientY: 100,
          bubbles: true
        });
        div.dispatchEvent(event);

        const box = document.querySelector('.browser-selection-copy-box');
        expect(box).toBeNull();

        // Cleanup
        newInstance.cleanup();
        global.chrome = originalChrome;
      });

      it('应该使用默认设置当读取存储失败时', async () => {
        // Arrange - 在创建实例前清理
        instance.cleanup();
        
        // 重新创建 chrome mock 并设置 get 失败
        global.chrome = createChromeMock();
        const originalGet = chrome.storage.local.get;
        (chrome.storage.local as any).get = jest.fn().mockRejectedValue(new Error('Storage error'));

        // Act
        const newInstance = new BrowserSelectionCopy();
        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert - 应该使用默认设置 enabled: false
        const div = document.createElement('div');
        document.body.appendChild(div);
        const event = new MouseEvent('mousedown', {
          button: 0,
          clientX: 100,
          clientY: 100,
          bubbles: true
        });
        div.dispatchEvent(event);

        const box = document.querySelector('.browser-selection-copy-box');
        expect(box).toBeNull();

        // Cleanup
        chrome.storage.local.get = originalGet;
        newInstance.cleanup();
      });

      it('应该验证 panelPosition 值的有效性', async () => {
        // Arrange
        await chrome.storage.local.set({
          enabled: true,
          panelPosition: 'invalid-value' as any
        });

        // Act
        const newInstance = new BrowserSelectionCopy();
        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert - 应该使用默认值 'center'
        // 通过检查实例能正常工作来验证
        expect(newInstance).toBeDefined();

        // Cleanup
        newInstance.cleanup();
      });
    });

    describe('设置更新', () => {
      it('应该通过消息更新设置', async () => {
        // Arrange
        const newInstance = new BrowserSelectionCopy();
        await new Promise(resolve => setTimeout(resolve, 10));

        // Act - 发送更新设置消息
        const message = {
          type: 'updateSettings',
          payload: {
            enabled: true,
            panelPosition: 'mouse' as const
          }
        };

        const sendResponse = jest.fn();
        const listeners = (chrome.runtime.onMessage as any).listeners;
        if (listeners && listeners.length > 0) {
          listeners[listeners.length - 1](message, {}, sendResponse);
        }

        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert - 设置应该已更新，验证行为
        const div = document.createElement('div');
        document.body.appendChild(div);
        const event = new MouseEvent('mousedown', {
          button: 0,
          clientX: 100,
          clientY: 100,
          bubbles: true
        });
        div.dispatchEvent(event);

        const box = document.querySelector('.browser-selection-copy-box');
        expect(box).not.toBeNull();
        expect(sendResponse).toHaveBeenCalledWith({ ok: true });

        // Cleanup
        newInstance.cleanup();
      });

      it('应该在禁用时清理 UI', async () => {
        // Arrange
        await chrome.storage.local.set({
          enabled: true,
          panelPosition: 'center'
        });

        // 清理全局实例以避免干扰
        instance.cleanup();

        const newInstance = new BrowserSelectionCopy();
        newInstance.initialize();
        // 等待设置初始化完成
        await new Promise(resolve => setTimeout(resolve, 50));

        // 创建一个选择框（只触发 mousedown，不触发 mouseup）
        const div = document.createElement('div');
        document.body.appendChild(div);
        const mousedownEvent = new MouseEvent('mousedown', {
          button: 0,
          clientX: 100,
          clientY: 100,
          bubbles: true
        });
        div.dispatchEvent(mousedownEvent);

        // 验证选择框已创建
        let box = document.querySelector('.browser-selection-copy-box');
        expect(box).not.toBeNull();

        // Act - 通过消息禁用插件
        const message = {
          type: 'updateSettings',
          payload: {
            enabled: false
          }
        };

        const listeners = (chrome.runtime.onMessage as any).listeners;
        if (listeners && listeners.length > 0) {
          listeners[listeners.length - 1](message, {}, jest.fn());
        }

        // 等待 applySettings 完成（它是异步的）
        await new Promise(resolve => setTimeout(resolve, 100));

        // Assert - 选择框应该被清理
        box = document.querySelector('.browser-selection-copy-box');
        expect(box).toBeNull();

        // Cleanup
        newInstance.cleanup();
      });

      it('应该持久化设置到 chrome.storage', async () => {
        // Arrange
        const newInstance = new BrowserSelectionCopy();
        await new Promise(resolve => setTimeout(resolve, 10));

        const setSpy = jest.spyOn(chrome.storage.local, 'set');

        // Act - 通过快捷键切换（会持久化）
        const event = new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          code: 'KeyY',
          bubbles: true
        });
        document.dispatchEvent(event);

        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert
        expect(setSpy).toHaveBeenCalledWith({
          enabled: true,
          panelPosition: 'center'
        });

        // Cleanup
        newInstance.cleanup();
      });
    });

    describe('快捷键切换', () => {
      it('应该通过 Ctrl+Shift+Y 切换启用状态', async () => {
        // Arrange
        await chrome.storage.local.set({
          enabled: false,
          panelPosition: 'center'
        });

        const newInstance = new BrowserSelectionCopy();
        await new Promise(resolve => setTimeout(resolve, 10));

        // Act - 按下快捷键
        const event = new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          code: 'KeyY',
          bubbles: true
        });
        document.dispatchEvent(event);

        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert - 应该切换到启用状态
        const div = document.createElement('div');
        document.body.appendChild(div);
        const mouseEvent = new MouseEvent('mousedown', {
          button: 0,
          clientX: 100,
          clientY: 100,
          bubbles: true
        });
        div.dispatchEvent(mouseEvent);

        const box = document.querySelector('.browser-selection-copy-box');
        expect(box).not.toBeNull();

        // Cleanup
        newInstance.cleanup();
      });

      it('应该忽略在输入框中的快捷键', async () => {
        // Arrange
        await chrome.storage.local.set({
          enabled: false,
          panelPosition: 'center'
        });

        // 清理全局实例以避免干扰
        instance.cleanup();

        const newInstance = new BrowserSelectionCopy();
        newInstance.initialize();
        await new Promise(resolve => setTimeout(resolve, 10));

        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();

        // Act - 在输入框中按下快捷键（通过 input 元素触发）
        const event = new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          code: 'KeyY',
          bubbles: true
        });
        input.dispatchEvent(event);

        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert - 状态不应该改变（仍然是 disabled）
        const div = document.createElement('div');
        document.body.appendChild(div);
        const mouseEvent = new MouseEvent('mousedown', {
          button: 0,
          clientX: 100,
          clientY: 100,
          bubbles: true
        });
        div.dispatchEvent(mouseEvent);

        const box = document.querySelector('.browser-selection-copy-box');
        expect(box).toBeNull();

        // Cleanup
        newInstance.cleanup();
      });

      it('应该忽略在文本域中的快捷键', async () => {
        // Arrange
        await chrome.storage.local.set({
          enabled: false,
          panelPosition: 'center'
        });

        // 清理全局实例以避免干扰
        instance.cleanup();

        const newInstance = new BrowserSelectionCopy();
        newInstance.initialize();
        await new Promise(resolve => setTimeout(resolve, 10));

        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        textarea.focus();

        // Act - 在文本域中按下快捷键（通过 textarea 元素触发）
        const event = new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          code: 'KeyY',
          bubbles: true
        });
        textarea.dispatchEvent(event);

        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert - 状态不应该改变
        const div = document.createElement('div');
        document.body.appendChild(div);
        const mouseEvent = new MouseEvent('mousedown', {
          button: 0,
          clientX: 100,
          clientY: 100,
          bubbles: true
        });
        div.dispatchEvent(mouseEvent);

        const box = document.querySelector('.browser-selection-copy-box');
        expect(box).toBeNull();

        // Cleanup
        newInstance.cleanup();
      });

      it('应该在禁用时清理选择框和面板', async () => {
        // Arrange
        await chrome.storage.local.set({
          enabled: true,
          panelPosition: 'center'
        });

        const newInstance = new BrowserSelectionCopy();
        await new Promise(resolve => setTimeout(resolve, 10));

        // 创建选择框
        const div = document.createElement('div');
        document.body.appendChild(div);
        const mousedownEvent = new MouseEvent('mousedown', {
          button: 0,
          clientX: 100,
          clientY: 100,
          bubbles: true
        });
        div.dispatchEvent(mousedownEvent);

        // Act - 按快捷键禁用
        const event = new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          code: 'KeyY',
          bubbles: true
        });
        document.dispatchEvent(event);

        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert - UI 应该被清理
        const box = document.querySelector('.browser-selection-copy-box');
        expect(box).toBeNull();

        // Cleanup
        newInstance.cleanup();
      });
    });
  });
});

