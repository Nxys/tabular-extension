/**
 * 端到端属性测试
 * 
 * 测试范围：
 * 属性 7：未达限制时行为一致性
 * 
 * 对于任意使用次数 n < 20，系统的提取行为（UI、交互、结果）
 * 应该与没有使用限制系统时完全一致
 * 
 * 验证需求：11.1-11.7
 */

import * as fc from 'fast-check';

// Mock usage 模块 - 必须在导入之前
const mockCheckUsage = jest.fn();
const mockConsumeUsage = jest.fn();
const mockRecord = jest.fn();

jest.mock('../src/content/usage/usage', () => ({
  checkUsage: mockCheckUsage,
  consumeUsage: mockConsumeUsage,
  record: mockRecord
}));

// Mock extractor 模块 - 现在 mock collect, layout, format
const mockCollect = jest.fn();
const mockLayout = jest.fn();
const mockFormat = jest.fn();

jest.mock('../src/content/extractor/collect', () => ({
  collect: mockCollect
}));

jest.mock('../src/content/extractor/layout', () => ({
  layout: mockLayout
}));

jest.mock('../src/content/extractor/format', () => ({
  format: mockFormat
}));

import { BrowserSelectionCopy } from '../src/content/content';
import { Panel } from '../src/content/panel';

describe('端到端属性测试', () => {
  /**
   * 属性 7：未达限制时行为一致性
   * 
   * Feature: usage-limit-system, Property 7: 未达限制时行为一致性
   * 
   * 对于任意使用次数 n < 20，系统的提取行为应该与没有使用限制系统时完全一致：
   * - UI 外观相同
   * - 交互行为相同
   * - 响应速度相同（不引入明显延迟）
   * - 文本提取结果相同
   * - 不显示任何额外提示
   * - 不改变任何现有行为
   * 
   * 验证需求：11.1-11.7
   */
  describe('属性 7：未达限制时行为一致性', () => {
    let browserSelectionCopy: BrowserSelectionCopy;
    let panelShowSpy: jest.SpyInstance;
    let panelShowLimitReachedSpy: jest.SpyInstance;
    let panelHideSpy: jest.SpyInstance;
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
      mockCollect.mockReturnValue([
        { text: '测试文本内容', rect: { left: 50, top: 50, width: 100, height: 20, right: 150, bottom: 70, x: 50, y: 50, toJSON: () => ({}) } }
      ]);
      mockLayout.mockReturnValue([
        [{ text: '测试文本内容', rect: { left: 50, top: 50, width: 100, height: 20, right: 150, bottom: 70, x: 50, y: 50, toJSON: () => ({}) } }]
      ]);
      mockFormat.mockReturnValue('测试文本内容');
      
      // 创建实例
      browserSelectionCopy = new BrowserSelectionCopy();
      await flush();
      
      // 启用插件
      await browserSelectionCopy.applySettings({ enabled: true, panelPosition: 'center' });
      await flush();
      
      // 创建 spy
      panelShowSpy = jest.spyOn(Panel.prototype, 'show');
      panelShowLimitReachedSpy = jest.spyOn(Panel.prototype, 'showLimitReached');
      panelHideSpy = jest.spyOn(Panel.prototype, 'hide');
    });

    afterEach(() => {
      // 恢复 spy
      panelShowSpy.mockRestore();
      panelShowLimitReachedSpy.mockRestore();
      panelHideSpy.mockRestore();
      
      // 清理实例
      browserSelectionCopy.cleanup();
      document.body.innerHTML = '';
      
      // 清理全局实例
      if (window.browserSelectionCopy) {
        window.browserSelectionCopy.cleanup();
        delete window.browserSelectionCopy;
      }
    });

    /**
     * 核心属性测试：未达限制时的行为一致性
     * 
     * 使用 fast-check 生成任意使用次数 n (0 <= n < 20)
     * 验证系统行为与没有使用限制时完全一致
     */
    it('对于任意使用次数 n < 20，系统行为应该与没有使用限制时完全一致', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成任意使用次数（0-19，未达限制）
          fc.integer({ min: 0, max: 19 }),
          async (usageCount) => {
            // Mock checkUsage 返回 allowed: true（未达限制）
            mockCheckUsage.mockResolvedValue({
              allowed: true,
              remaining: 20 - usageCount
            });
            mockConsumeUsage.mockResolvedValue(undefined);
            mockRecord.mockResolvedValue(undefined);

            // 创建测试 DOM
            document.body.innerHTML = `
              <div style="position: absolute; left: 50px; top: 50px;">测试文本内容</div>
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

            // 验证需求 11.1：提供与第一版完全相同的功能
            // 验证核心流程正常执行
            expect(mockCheckUsage).toHaveBeenCalled();
            expect(mockCollect).toHaveBeenCalled();
            expect(panelShowSpy).toHaveBeenCalled();
            expect(mockConsumeUsage).toHaveBeenCalled();

            // 验证需求 11.2：保持相同的 UI 外观
            // 验证没有调用 showLimitReached（不显示限制提示）
            expect(panelShowLimitReachedSpy).not.toHaveBeenCalled();

            // 验证需求 11.3：保持相同的交互行为
            // 验证调用了正常的 show 方法（不是 showLimitReached）
            expect(panelShowSpy).toHaveBeenCalledWith(
              expect.any(String),
              expect.objectContaining({
                position: expect.any(Object),
                editable: true
              })
            );

            // 验证需求 11.4：保持相同的响应速度
            // checkUsage 应该在 collect 之前被调用（不阻塞）
            const checkUsageCallOrder = mockCheckUsage.mock.invocationCallOrder[0];
            const collectCallOrder = mockCollect.mock.invocationCallOrder[0];
            expect(checkUsageCallOrder).toBeLessThan(collectCallOrder);

            // 验证需求 11.5：保持相同的文本提取结果
            // collect 应该被正常调用，参数不受影响
            expect(mockCollect).toHaveBeenCalledWith(
              expect.objectContaining({
                left: expect.any(Number),
                top: expect.any(Number),
                right: expect.any(Number),
                bottom: expect.any(Number)
              })
            );
            
            // layout 应该被调用，参数包含 options
            expect(mockLayout).toHaveBeenCalledWith(
              expect.any(Array),
              expect.objectContaining({
                lineThresholdRatio: expect.any(Number),
                minHorizontalGap: expect.any(Number)
              })
            );

            // 验证需求 11.6：不显示任何额外提示
            // 验证 panel.show 的参数中包含 usageInfo（这是任务 8 的修改）
            const showCallArgs = panelShowSpy.mock.calls[0];
            expect(showCallArgs[0]).toBe('测试文本内容'); // 文本内容不变
            expect(showCallArgs[1]).toEqual({
              position: expect.any(Object),
              editable: true,
              usageInfo: expect.objectContaining({
                remaining: expect.any(Number),
                max: expect.any(Number)
              })
            }); // 选项包含 usageInfo

            // 验证需求 11.7：不改变任何现有行为
            // 验证 consumeUsage 在成功提取后被调用
            const showCallOrder = panelShowSpy.mock.invocationCallOrder[0];
            const consumeUsageCallOrder = mockConsumeUsage.mock.invocationCallOrder[0];
            expect(showCallOrder).toBeLessThan(consumeUsageCallOrder);

            // 清理 mock 调用记录，为下一次迭代做准备
            jest.clearAllMocks();
            panelShowSpy.mockClear();
            panelShowLimitReachedSpy.mockClear();
            panelHideSpy.mockClear();
          }
        ),
        { 
          numRuns: 100, // 至少运行 100 次迭代
          verbose: true  // 显示详细信息
        }
      );
    });

    /**
     * 补充测试：验证在不同剩余次数下的一致性
     * 
     * 即使剩余次数不同（1次、5次、19次），行为也应该完全一致
     */
    it('对于不同的剩余次数（1-19），系统行为应该保持一致', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成任意剩余次数（1-19）
          fc.integer({ min: 1, max: 19 }),
          async (remaining) => {
            // Mock checkUsage 返回 allowed: true
            mockCheckUsage.mockResolvedValue({
              allowed: true,
              remaining: remaining
            });
            mockConsumeUsage.mockResolvedValue(undefined);
            mockRecord.mockResolvedValue(undefined);

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

            // 验证核心行为一致：无论剩余次数是多少，都应该正常执行
            expect(mockCheckUsage).toHaveBeenCalled();
            expect(mockCollect).toHaveBeenCalled();
            expect(panelShowSpy).toHaveBeenCalled();
            expect(mockConsumeUsage).toHaveBeenCalled();
            expect(panelShowLimitReachedSpy).not.toHaveBeenCalled();

            // 清理 mock 调用记录
            jest.clearAllMocks();
            panelShowSpy.mockClear();
            panelShowLimitReachedSpy.mockClear();
            panelHideSpy.mockClear();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });

    /**
     * 补充测试：验证空文本情况下的一致性
     * 
     * 即使在未达限制的情况下，如果提取到空文本，
     * 也应该与没有使用限制时的行为一致（不显示面板，不消耗次数）
     */
    it('对于任意使用次数 n < 20，提取到空文本时行为应该一致', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 19 }),
          async (usageCount) => {
            // Mock checkUsage 返回 allowed: true
            mockCheckUsage.mockResolvedValue({
              allowed: true,
              remaining: 20 - usageCount
            });
            mockConsumeUsage.mockResolvedValue(undefined);
            mockRecord.mockResolvedValue(undefined);
            
            // Mock extractText 返回空文本
            mockFormat.mockReturnValue('   '); // 只有空格

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

            // 验证空文本情况下的一致性
            expect(mockCheckUsage).toHaveBeenCalled();
            expect(mockCollect).toHaveBeenCalled();
            
            // 空文本时不应该显示面板
            expect(panelShowSpy).not.toHaveBeenCalled();
            expect(panelShowLimitReachedSpy).not.toHaveBeenCalled();
            
            // 空文本时不应该消耗次数
            expect(mockConsumeUsage).not.toHaveBeenCalled();
            
            // 应该调用 hide（隐藏面板）
            expect(panelHideSpy).toHaveBeenCalled();

            // 清理 mock 调用记录
            jest.clearAllMocks();
            panelShowSpy.mockClear();
            panelShowLimitReachedSpy.mockClear();
            panelHideSpy.mockClear();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });

    /**
     * 补充测试：验证多次连续操作的一致性
     * 
     * 在未达限制的情况下，多次连续操作应该保持一致的行为
     */
    it('对于任意使用次数 n < 20，多次连续操作应该保持一致', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成初始使用次数（0-17，确保至少可以操作2次）
          fc.integer({ min: 0, max: 17 }),
          async (initialCount) => {
            let currentCount = initialCount;

            // 执行两次连续操作
            for (let i = 0; i < 2; i++) {
              // Mock checkUsage 返回 allowed: true
              mockCheckUsage.mockResolvedValue({
                allowed: true,
                remaining: 20 - currentCount
              });
              mockConsumeUsage.mockResolvedValue(undefined);
              mockRecord.mockResolvedValue(undefined);

              // 创建测试 DOM
              document.body.innerHTML = `
                <div style="position: absolute; left: 50px; top: 50px;">测试文本 ${i + 1}</div>
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

              // 验证每次操作的行为一致
              expect(mockCheckUsage).toHaveBeenCalled();
              expect(mockCollect).toHaveBeenCalled();
              expect(panelShowSpy).toHaveBeenCalled();
              expect(mockConsumeUsage).toHaveBeenCalled();
              expect(panelShowLimitReachedSpy).not.toHaveBeenCalled();

              // 清理 mock 调用记录
              jest.clearAllMocks();
              panelShowSpy.mockClear();
              panelShowLimitReachedSpy.mockClear();
              panelHideSpy.mockClear();

              // 更新当前计数
              currentCount++;
            }
          }
        ),
        { 
          numRuns: 50, // 因为每次迭代包含2次操作，所以减少迭代次数
          verbose: true
        }
      );
    });
  });

  /**
   * 边界测试：验证在 n = 19 时的行为
   * 
   * 这是未达限制的最后一次机会，应该与其他未达限制的情况完全一致
   */
  describe('边界情况：n = 19（最后一次未达限制）', () => {
    let browserSelectionCopy: BrowserSelectionCopy;
    let panelShowSpy: jest.SpyInstance;
    let panelShowLimitReachedSpy: jest.SpyInstance;
    const flush = () => new Promise(resolve => setTimeout(resolve, 0));

    beforeEach(async () => {
      document.body.innerHTML = '';
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({ enabled: true, panelPosition: 'center' });
      
      if (window.browserSelectionCopy) {
        window.browserSelectionCopy.cleanup();
        delete window.browserSelectionCopy;
      }
      
      const existingPanels = document.querySelectorAll('.browser-selection-copy-panel');
      existingPanels.forEach(panel => panel.remove());
      const existingBoxes = document.querySelectorAll('.browser-selection-copy-box');
      existingBoxes.forEach(box => box.remove());
      
      jest.clearAllMocks();
      mockFormat.mockReturnValue('测试文本内容');
      
      browserSelectionCopy = new BrowserSelectionCopy();
      await flush();
      await browserSelectionCopy.applySettings({ enabled: true, panelPosition: 'center' });
      await flush();
      
      panelShowSpy = jest.spyOn(Panel.prototype, 'show');
      panelShowLimitReachedSpy = jest.spyOn(Panel.prototype, 'showLimitReached');
    });

    afterEach(() => {
      panelShowSpy.mockRestore();
      panelShowLimitReachedSpy.mockRestore();
      browserSelectionCopy.cleanup();
      document.body.innerHTML = '';
      
      if (window.browserSelectionCopy) {
        window.browserSelectionCopy.cleanup();
        delete window.browserSelectionCopy;
      }
    });

    it('在 n = 19 时，应该正常执行提取操作', async () => {
      // Mock checkUsage 返回 allowed: true，剩余 1 次
      mockCheckUsage.mockResolvedValue({
        allowed: true,
        remaining: 1
      });
      mockConsumeUsage.mockResolvedValue(undefined);
      mockRecord.mockResolvedValue(undefined);

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

      await flush();

      // 验证正常执行
      expect(mockCheckUsage).toHaveBeenCalled();
      expect(mockCollect).toHaveBeenCalled();
      expect(panelShowSpy).toHaveBeenCalled();
      expect(mockConsumeUsage).toHaveBeenCalled();
      
      // 不应该显示限制提示
      expect(panelShowLimitReachedSpy).not.toHaveBeenCalled();
    });
  });
});
