// Panel 模块单元测试

import { Panel } from '../src/content/panel';

describe('Panel 模块单元测试', () => {
  let panel: Panel;

  beforeEach(() => {
    // 清理 DOM
    document.body.innerHTML = '';
    panel = new Panel();
  });

  afterEach(() => {
    // 清理面板
    panel.hide();
    document.body.innerHTML = '';
  });

  describe('showLimitReached 方法测试', () => {
    test('showLimitReached 方法应该存在', () => {
      expect(panel.showLimitReached).toBeDefined();
      expect(typeof panel.showLimitReached).toBe('function');
    });

    test('showLimitReached 应该显示正确的提示文本', () => {
      panel.showLimitReached();

      // 验证面板已创建
      const panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();

      // 验证标题
      const title = panelElement?.querySelector('.browser-selection-copy-panel-title');
      expect(title?.textContent).toContain('使用限制');

      // 验证图标
      const icon = panelElement?.querySelector('.browser-selection-copy-panel-icon');
      expect(icon?.textContent).toBe('🚫');

      // 验证主消息
      const message = panelElement?.querySelector('.browser-selection-copy-panel-message');
      expect(message?.textContent).toBe('今日免费次数已用完');

      // 验证次数显示（使用新的样式类）
      const countInfo = panelElement?.querySelector('.browser-selection-copy-panel-limit-count');
      expect(countInfo?.textContent).toBe('(20/20)');

      // 验证重置信息（使用新的样式类）
      const resetInfo = panelElement?.querySelector('.browser-selection-copy-panel-limit-secondary');
      expect(resetInfo?.textContent).toBe('明天将自动重置');
    });

    test('showLimitReached 应该显示升级按钮', () => {
      panel.showLimitReached();

      // 验证升级按钮存在
      const upgradeBtn = document.querySelector('.browser-selection-copy-panel-upgrade-btn');
      expect(upgradeBtn).toBeTruthy();
      expect(upgradeBtn?.textContent).toBe('升级 Pro（占位）');
    });

    test('showLimitReached 应该显示关闭按钮', () => {
      panel.showLimitReached();

      // 验证关闭按钮存在
      const closeBtn = document.querySelector('.browser-selection-copy-panel-close');
      expect(closeBtn).toBeTruthy();
      expect(closeBtn?.textContent).toBe('×');
    });

    test('升级按钮点击应该输出日志（占位功能）', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      panel.showLimitReached();

      const upgradeBtn = document.querySelector('.browser-selection-copy-panel-upgrade-btn') as HTMLButtonElement;
      expect(upgradeBtn).toBeTruthy();

      upgradeBtn.click();

      expect(consoleSpy).toHaveBeenCalledWith('升级 Pro 功能尚未实现');

      consoleSpy.mockRestore();
    });

    test('关闭按钮应该能够隐藏限制提示面板', () => {
      panel.showLimitReached();

      // 验证面板已显示
      let panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();

      // 点击关闭按钮
      const closeBtn = document.querySelector('.browser-selection-copy-panel-close') as HTMLButtonElement;
      closeBtn.click();

      // 验证面板已隐藏
      panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeFalsy();
    });

    test('showLimitReached 不应该显示文本预览区域', () => {
      panel.showLimitReached();

      // 验证不存在文本预览相关元素
      const textarea = document.querySelector('.browser-selection-copy-panel-textarea');
      expect(textarea).toBeFalsy();

      const copyBtn = document.querySelector('.browser-selection-copy-panel-copy-btn');
      expect(copyBtn).toBeFalsy();
    });

    test('showLimitReached 应该在正确位置显示面板', () => {
      panel.showLimitReached();

      const panelElement = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
      expect(panelElement).toBeTruthy();

      // 验证强制居中样式类已应用
      expect(panelElement.classList.contains('browser-selection-copy-panel-force-center')).toBe(true);
      
      // 验证不再使用内联样式设置位置（因为使用 CSS 类居中）
      expect(panelElement.style.left).toBe('');
      expect(panelElement.style.top).toBe('');
    });
  });

  describe('show 方法回归测试', () => {
    test('show 方法应该保持不变 - 显示文本预览', () => {
      const testText = '测试文本内容';
      panel.show(testText, { position: { left: 100, top: 100 }, editable: true });

      // 验证面板已创建
      const panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();

      // 验证标题
      const title = panelElement?.querySelector('.browser-selection-copy-panel-title');
      expect(title?.textContent).toContain('文本预览');

      // 验证图标
      const icon = panelElement?.querySelector('.browser-selection-copy-panel-icon');
      expect(icon?.textContent).toBe('📋');

      // 验证文本预览区域存在
      const textarea = document.querySelector('.browser-selection-copy-panel-textarea') as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      expect(textarea.value).toBe(testText);

      // 验证复制按钮存在
      const copyBtn = document.querySelector('.browser-selection-copy-panel-copy-btn');
      expect(copyBtn).toBeTruthy();
      expect(copyBtn?.textContent).toContain('复制到剪贴板');
    });

    test('show 方法应该保持不变 - 可编辑功能', () => {
      const testText = '初始文本';
      panel.show(testText, { position: { left: 100, top: 100 }, editable: true });

      const textarea = document.querySelector('.browser-selection-copy-panel-textarea') as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      expect(textarea.readOnly).toBe(false);

      // 修改文本
      textarea.value = '修改后的文本';
      textarea.dispatchEvent(new Event('input'));

      // 验证文本已更新（通过复制功能验证）
      const copyBtn = document.querySelector('.browser-selection-copy-panel-copy-btn') as HTMLButtonElement;
      copyBtn.click();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('修改后的文本');
    });

    test('show 方法应该保持不变 - 关闭功能', () => {
      panel.show('测试文本', { position: { left: 100, top: 100 } });

      // 验证面板已显示
      let panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();

      // 点击关闭按钮
      const closeBtn = document.querySelector('.browser-selection-copy-panel-close') as HTMLButtonElement;
      closeBtn.click();

      // 验证面板已隐藏
      panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeFalsy();
    });

    test('show 方法应该保持不变 - 复制功能', async () => {
      const testText = '要复制的文本';
      panel.show(testText, { position: { left: 100, top: 100 } });

      const copyBtn = document.querySelector('.browser-selection-copy-panel-copy-btn') as HTMLButtonElement;
      expect(copyBtn).toBeTruthy();

      // 模拟成功的复制操作
      (navigator.clipboard.writeText as jest.Mock).mockResolvedValueOnce(undefined);

      copyBtn.click();

      // 等待异步操作
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testText);
    });

    test('show 方法应该保持不变 - 位置设置', () => {
      panel.show('测试文本', { position: { left: 200, top: 300 } });

      const panelElement = document.querySelector('.browser-selection-copy-panel') as HTMLElement;
      expect(panelElement).toBeTruthy();
      expect(panelElement.style.left).toBe('200px');
      expect(panelElement.style.top).toBe('300px');
    });

    test('show 方法应该保持不变 - 只能有一个面板实例', () => {
      // 第一次显示
      panel.show('第一段文本', { position: { left: 100, top: 100 } });
      let panels = document.querySelectorAll('.browser-selection-copy-panel');
      expect(panels.length).toBe(1);

      // 第二次显示（应该替换第一个）
      panel.show('第二段文本', { position: { left: 200, top: 200 } });
      panels = document.querySelectorAll('.browser-selection-copy-panel');
      expect(panels.length).toBe(1);

      // 验证显示的是第二段文本
      const textarea = document.querySelector('.browser-selection-copy-panel-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('第二段文本');
    });
  });

  describe('hide 方法测试', () => {
    test('hide 应该能够隐藏 show 创建的面板', () => {
      panel.show('测试文本', { position: { left: 100, top: 100 } });

      let panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();

      panel.hide();

      panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeFalsy();
    });

    test('hide 应该能够隐藏 showLimitReached 创建的面板', () => {
      panel.showLimitReached();

      let panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();

      panel.hide();

      panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeFalsy();
    });

    test('hide 在没有面板时不应该抛出错误', () => {
      expect(() => {
        panel.hide();
      }).not.toThrow();
    });
  });

  describe('contains 方法测试', () => {
    test('contains 应该正确判断元素是否在面板内 - show 面板', () => {
      panel.show('测试文本', { position: { left: 100, top: 100 } });

      const panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();

      // 面板内的元素
      const textarea = document.querySelector('.browser-selection-copy-panel-textarea');
      expect(panel.contains(textarea)).toBe(true);

      // 面板外的元素
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);
      expect(panel.contains(outsideElement)).toBe(false);
    });

    test('contains 应该正确判断元素是否在面板内 - showLimitReached 面板', () => {
      panel.showLimitReached();

      const panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();

      // 面板内的元素
      const upgradeBtn = document.querySelector('.browser-selection-copy-panel-upgrade-btn');
      expect(panel.contains(upgradeBtn)).toBe(true);

      // 面板外的元素
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);
      expect(panel.contains(outsideElement)).toBe(false);
    });

    test('contains 在没有面板时应该返回 false', () => {
      const element = document.createElement('div');
      expect(panel.contains(element)).toBe(false);
    });
  });
});
