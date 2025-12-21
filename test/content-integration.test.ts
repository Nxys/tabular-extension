/**
 * Content 控制器集成测试
 * 
 * 测试范围：
 * 1. content.ts 在 extractText 前调用 checkUsage
 * 2. content.ts 在 allowed: false 时调用 panel.showLimitReached
 * 3. content.ts 在 allowed: true 时继续执行 extractText
 * 4. content.ts 在成功提取后调用 consumeUsage
 * 
 * 验证需求：4.1, 4.2, 4.3, 4.4
 */

// Mock usage 模块 - 必须在导入之前
const mockCheckUsage = jest.fn();
const mockConsumeUsage = jest.fn();

jest.mock('../src/content/usage/usage', () => ({
  checkUsage: mockCheckUsage,
  consumeUsage: mockConsumeUsage
}));

// Mock extractor 模块
const mockExtractText = jest.fn();
jest.mock('../src/content/extractor', () => ({
  extractText: mockExtractText
}));

import { BrowserSelectionCopy } from '../src/content/content';
import { Panel } from '../src/content/panel';

describe('Content 控制器集成测试', () => {
  let browserSelectionCopy: BrowserSelectionCopy;
  let panelShowLimitReachedSpy: jest.SpyInstance;
  let panelShowSpy: jest.SpyInstance;
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));

  beforeEach(async () => {
    // 清理 DOM 和全局状态
    document.body.innerHTML = '';
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({ enabled: true, panelPosition: 'center' });
    
    // 清理可能存在的全局实例
    if (window.browserSelectionCopy) {
      window.browserSelectionCopy.cleanup();
      delete window.browserSelectionCopy;
    }
    
    // 清理所有可能残留的面板和选择框
    const existingPanels = document.querySelectorAll('.browser-selection-copy-panel');
    existingPanels.forEach(panel => panel.remove());
    const existingBoxes = document.querySelectorAll('.browser-selection-copy-box');
    existingBoxes.forEach(box => box.remove());
    
    // 重置所有 mock
    jest.clearAllMocks();
    
    // 默认 mock 返回值
    mockCheckUsage.mockResolvedValue({ allowed: true, remaining: 20 });
    mockConsumeUsage.mockResolvedValue(undefined);
    mockExtractText.mockReturnValue('测试文本');
    
    // 创建实例
    browserSelectionCopy = new BrowserSelectionCopy();
    await flush();
    
    // 启用插件
    await browserSelectionCopy.applySettings({ enabled: true, panelPosition: 'center' });
    await flush();
    
    // 创建 spy
    panelShowLimitReachedSpy = jest.spyOn(Panel.prototype, 'showLimitReached');
    panelShowSpy = jest.spyOn(Panel.prototype, 'show');
  });

  afterEach(() => {
    // 恢复 spy
    panelShowLimitReachedSpy.mockRestore();
    panelShowSpy.mockRestore();
    
    // 清理实例
    browserSelectionCopy.cleanup();
    document.body.innerHTML = '';
    
    // 清理全局实例
    if (window.browserSelectionCopy) {
      window.browserSelectionCopy.cleanup();
      delete window.browserSelectionCopy;
    }
  });

  describe('使用限制集成 - 基本流程', () => {
    /**
     * 测试需求 4.1：在调用 extractText 之前调用 checkUsage
     */
    it('应该在 extractText 前调用 checkUsage', async () => {
      // 创建测试 DOM
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

      // 等待异步操作完成
      await flush();

      // 验证调用顺序：checkUsage 应该在 extractText 之前被调用
      expect(mockCheckUsage).toHaveBeenCalled();
      expect(mockExtractText).toHaveBeenCalled();
      
      // 验证 checkUsage 的调用顺序早于 extractText
      const checkUsageCallOrder = mockCheckUsage.mock.invocationCallOrder[0];
      const extractTextCallOrder = mockExtractText.mock.invocationCallOrder[0];
      expect(checkUsageCallOrder).toBeLessThan(extractTextCallOrder);
    });

    /**
     * 测试需求 4.2：当 allowed: false 时，调用 panel.showLimitReached 并终止流程
     */
    it('应该在 allowed: false 时调用 panel.showLimitReached', async () => {
      // Mock checkUsage 返回 allowed: false
      mockCheckUsage.mockResolvedValue({
        allowed: false,
        reason: 'limit-reached',
        remaining: 0
      });

      // 创建测试 DOM
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

      // 等待异步操作完成
      await flush();

      // 验证调用了 checkUsage
      expect(mockCheckUsage).toHaveBeenCalled();
      
      // 验证调用了 panel.showLimitReached
      expect(panelShowLimitReachedSpy).toHaveBeenCalled();
      
      // 验证没有调用 extractText（流程终止）
      expect(mockExtractText).not.toHaveBeenCalled();
      
      // 验证没有调用 consumeUsage（流程终止）
      expect(mockConsumeUsage).not.toHaveBeenCalled();
    });

    /**
     * 测试需求 4.3：当 allowed: true 时，继续执行 extractText
     */
    it('应该在 allowed: true 时继续执行 extractText', async () => {
      // Mock checkUsage 返回 allowed: true
      mockCheckUsage.mockResolvedValue({
        allowed: true,
        remaining: 15
      });

      // 创建测试 DOM
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

      // 等待异步操作完成
      await flush();

      // 验证调用了 checkUsage
      expect(mockCheckUsage).toHaveBeenCalled();
      
      // 验证调用了 extractText（流程继续）
      expect(mockExtractText).toHaveBeenCalled();
      
      // 验证没有调用 panel.showLimitReached
      expect(panelShowLimitReachedSpy).not.toHaveBeenCalled();
    });

    /**
     * 测试需求 4.4：在成功提取后调用 consumeUsage
     */
    it('应该在成功提取后调用 consumeUsage', async () => {
      // Mock checkUsage 返回 allowed: true
      mockCheckUsage.mockResolvedValue({
        allowed: true,
        remaining: 15
      });
      
      // Mock extractText 返回有效文本
      mockExtractText.mockReturnValue('提取的文本内容');

      // 创建测试 DOM
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

      // 等待异步操作完成
      await flush();

      // 验证调用了 checkUsage
      expect(mockCheckUsage).toHaveBeenCalled();
      
      // 验证调用了 extractText
      expect(mockExtractText).toHaveBeenCalled();
      
      // 验证调用了 panel.show（显示结果）
      expect(panelShowSpy).toHaveBeenCalled();
      
      // 验证调用了 consumeUsage（消耗使用次数）
      expect(mockConsumeUsage).toHaveBeenCalled();
      
      // 验证调用顺序：extractText -> show -> consumeUsage
      const extractTextCallOrder = mockExtractText.mock.invocationCallOrder[0];
      const showCallOrder = panelShowSpy.mock.invocationCallOrder[0];
      const consumeUsageCallOrder = mockConsumeUsage.mock.invocationCallOrder[0];
      
      expect(extractTextCallOrder).toBeLessThan(showCallOrder);
      expect(showCallOrder).toBeLessThan(consumeUsageCallOrder);
    });
  });

  describe('使用限制集成 - 边界情况', () => {
    it('应该在提取到空文本时不调用 consumeUsage', async () => {
      // Mock checkUsage 返回 allowed: true
      mockCheckUsage.mockResolvedValue({
        allowed: true,
        remaining: 15
      });
      
      // Mock extractText 返回空文本
      mockExtractText.mockReturnValue('   '); // 只有空格

      // 创建测试 DOM
      document.body.innerHTML = `
        <div style="position: absolute; left: 50px; top: 50px;"></div>
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

      // 等待异步操作完成
      await flush();

      // 验证调用了 checkUsage
      expect(mockCheckUsage).toHaveBeenCalled();
      
      // 验证调用了 extractText
      expect(mockExtractText).toHaveBeenCalled();
      
      // 验证没有调用 panel.show（因为文本为空）
      expect(panelShowSpy).not.toHaveBeenCalled();
      
      // 验证没有调用 consumeUsage（因为没有成功提取）
      expect(mockConsumeUsage).not.toHaveBeenCalled();
    });

    it('应该在达到限制时不调用 extractText 和 consumeUsage', async () => {
      // Mock checkUsage 返回 allowed: false（达到限制）
      mockCheckUsage.mockResolvedValue({
        allowed: false,
        reason: 'limit-reached',
        remaining: 0
      });

      // 创建测试 DOM
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

      // 等待异步操作完成
      await flush();

      // 验证调用了 checkUsage
      expect(mockCheckUsage).toHaveBeenCalled();
      
      // 验证调用了 panel.showLimitReached
      expect(panelShowLimitReachedSpy).toHaveBeenCalled();
      
      // 验证没有调用 extractText
      expect(mockExtractText).not.toHaveBeenCalled();
      
      // 验证没有调用 panel.show
      expect(panelShowSpy).not.toHaveBeenCalled();
      
      // 验证没有调用 consumeUsage
      expect(mockConsumeUsage).not.toHaveBeenCalled();
    });

    it('应该在剩余次数为 1 时正常工作', async () => {
      // Mock checkUsage 返回 allowed: true，但只剩 1 次
      mockCheckUsage.mockResolvedValue({
        allowed: true,
        remaining: 1
      });
      
      // Mock extractText 返回有效文本
      mockExtractText.mockReturnValue('测试文本');

      // 创建测试 DOM
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

      // 等待异步操作完成
      await flush();

      // 验证正常流程：checkUsage -> extractText -> show -> consumeUsage
      expect(mockCheckUsage).toHaveBeenCalled();
      expect(mockExtractText).toHaveBeenCalled();
      expect(panelShowSpy).toHaveBeenCalled();
      expect(mockConsumeUsage).toHaveBeenCalled();
      
      // 验证没有调用 showLimitReached
      expect(panelShowLimitReachedSpy).not.toHaveBeenCalled();
    });
  });

  describe('使用限制集成 - 多次操作', () => {
    it('应该在每次选择操作时都调用 checkUsage', async () => {
      // Mock checkUsage 返回 allowed: true
      mockCheckUsage.mockResolvedValue({
        allowed: true,
        remaining: 15
      });
      
      // Mock extractText 返回有效文本
      mockExtractText.mockReturnValue('测试文本');

      // 创建测试 DOM
      document.body.innerHTML = `
        <div style="position: absolute; left: 50px; top: 50px;">第一段文本</div>
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

      await flush();

      // 验证第一次调用
      expect(mockCheckUsage).toHaveBeenCalledTimes(1);
      expect(mockExtractText).toHaveBeenCalledTimes(1);
      expect(mockConsumeUsage).toHaveBeenCalledTimes(1);

      // 第二次选择操作
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

      await flush();

      // 验证第二次调用
      expect(mockCheckUsage).toHaveBeenCalledTimes(2);
      expect(mockExtractText).toHaveBeenCalledTimes(2);
      expect(mockConsumeUsage).toHaveBeenCalledTimes(2);
    });

    it('应该在第一次成功后第二次达到限制时正确处理', async () => {
      // 第一次：允许使用
      mockCheckUsage.mockResolvedValueOnce({
        allowed: true,
        remaining: 1
      });
      
      // Mock extractText 返回有效文本
      mockExtractText.mockReturnValue('测试文本');

      // 创建测试 DOM
      document.body.innerHTML = `
        <div style="position: absolute; left: 50px; top: 50px;">第一段文本</div>
        <div style="position: absolute; left: 50px; top: 100px;">第二段文本</div>
      `;

      // 第一次选择操作（成功）
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

      await flush();

      // 验证第一次成功
      expect(mockCheckUsage).toHaveBeenCalledTimes(1);
      expect(mockExtractText).toHaveBeenCalledTimes(1);
      expect(panelShowSpy).toHaveBeenCalledTimes(1);
      expect(mockConsumeUsage).toHaveBeenCalledTimes(1);
      expect(panelShowLimitReachedSpy).not.toHaveBeenCalled();

      // 第二次：达到限制
      mockCheckUsage.mockResolvedValueOnce({
        allowed: false,
        reason: 'limit-reached',
        remaining: 0
      });

      // 第二次选择操作（达到限制）
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

      await flush();

      // 验证第二次被拒绝
      expect(mockCheckUsage).toHaveBeenCalledTimes(2);
      expect(panelShowLimitReachedSpy).toHaveBeenCalledTimes(1);
      
      // extractText 和 consumeUsage 不应该再被调用
      expect(mockExtractText).toHaveBeenCalledTimes(1); // 仍然是 1 次
      expect(mockConsumeUsage).toHaveBeenCalledTimes(1); // 仍然是 1 次
    });
  });

  describe('使用限制集成 - 模块依赖验证', () => {
    it('应该只在 content.ts 中集成 usage 模块', async () => {
      // 这个测试验证 usage 模块只在 content.ts 中被调用
      // 不应该在 extractor 或其他模块中被调用
      
      // Mock checkUsage 返回 allowed: true
      mockCheckUsage.mockResolvedValue({
        allowed: true,
        remaining: 15
      });
      
      // Mock extractText 返回有效文本
      mockExtractText.mockReturnValue('测试文本');

      // 创建测试 DOM
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

      // 等待异步操作完成
      await flush();

      // 验证 usage 模块被调用
      expect(mockCheckUsage).toHaveBeenCalled();
      expect(mockConsumeUsage).toHaveBeenCalled();
      
      // 验证 extractText 被调用（但不应该调用 usage 模块）
      expect(mockExtractText).toHaveBeenCalled();
      
      // extractText 的调用参数不应该包含 usage 相关的信息
      const extractTextArgs = mockExtractText.mock.calls[0];
      expect(extractTextArgs).toBeDefined();
      // 验证参数是 rect 和 options，不包含 usage 相关信息
      expect(extractTextArgs.length).toBe(2);
    });

    it('应该确保 usage 模块不依赖 panel 模块', async () => {
      // 这个测试验证 usage 模块的调用不依赖 panel 的状态
      
      // Mock checkUsage 返回 allowed: false
      mockCheckUsage.mockResolvedValue({
        allowed: false,
        reason: 'limit-reached',
        remaining: 0
      });

      // 创建测试 DOM
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

      // 等待异步操作完成
      await flush();

      // 验证 checkUsage 在 showLimitReached 之前被调用
      expect(mockCheckUsage).toHaveBeenCalled();
      expect(panelShowLimitReachedSpy).toHaveBeenCalled();
      
      // 验证调用顺序
      const checkUsageCallOrder = mockCheckUsage.mock.invocationCallOrder[0];
      const showLimitReachedCallOrder = panelShowLimitReachedSpy.mock.invocationCallOrder[0];
      expect(checkUsageCallOrder).toBeLessThan(showLimitReachedCallOrder);
    });
  });
});
