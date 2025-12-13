import { SelectionBox } from '../components/SelectionBox.js';
import { SelectionRect } from '../types/index.js';
import * as fc from 'fast-check';

/**
 * 选择框生命周期属性测试
 * **Feature: browser-selection-copy, Property 1: 选择框生命周期完整性**
 * **验证需求: 1.1, 1.2, 1.3, 1.4, 1.5**
 */
describe('SelectionBox 生命周期属性测试', () => {
  let selectionBox: SelectionBox;

  beforeEach(() => {
    // 清理 DOM
    document.body.innerHTML = '';
    selectionBox = new SelectionBox();
  });

  afterEach(() => {
    selectionBox.destroy();
    document.body.innerHTML = '';
  });

  /**
   * 属性 1: 选择框生命周期完整性
   * 对于任何鼠标拖拽操作序列，选择框应该正确响应开始、更新、完成和清除的完整生命周期
   */
  test('属性 1: 选择框生命周期完整性', () => {
    fc.assert(
      fc.property(
        // 生成起始坐标 (0-1000 范围内的整数)
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        // 生成结束坐标 (0-1000 范围内的整数)
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        // 生成更新步骤数 (1-5 步)
        fc.integer({ min: 1, max: 5 }),
        (startX, startY, endX, endY, updateSteps) => {
          // 1. 开始选择 - 验证需求 1.1
          selectionBox.startSelection(startX, startY);
          
          // 验证选择框元素被创建
          let selectionElement = document.querySelector('.browser-selection-copy-box') as HTMLElement;
          expect(selectionElement).toBeTruthy();
          expect(selectionElement.style.left).toBe(`${startX}px`);
          expect(selectionElement.style.top).toBe(`${startY}px`);
          expect(selectionElement.style.width).toBe('0px');
          expect(selectionElement.style.height).toBe('0px');

          // 2. 更新选择框 - 验证需求 1.2
          // 生成中间更新点
          for (let i = 1; i <= updateSteps; i++) {
            const progress = i / updateSteps;
            const currentX = Math.round(startX + (endX - startX) * progress);
            const currentY = Math.round(startY + (endY - startY) * progress);
            
            selectionBox.updateSelection(currentX, currentY);
            
            // 验证选择框尺寸和位置更新
            selectionElement = document.querySelector('.browser-selection-copy-box') as HTMLElement;
            expect(selectionElement).toBeTruthy();
            
            const expectedLeft = Math.min(startX, currentX);
            const expectedTop = Math.min(startY, currentY);
            const expectedWidth = Math.abs(currentX - startX);
            const expectedHeight = Math.abs(currentY - startY);
            
            expect(parseInt(selectionElement.style.left)).toBe(expectedLeft);
            expect(parseInt(selectionElement.style.top)).toBe(expectedTop);
            expect(parseInt(selectionElement.style.width)).toBe(expectedWidth);
            expect(parseInt(selectionElement.style.height)).toBe(expectedHeight);
          }

          // 3. 完成选择 - 验证需求 1.3
          const selectionRect = selectionBox.finishSelection();
          
          // 验证返回的选择区域正确
          const expectedLeft = Math.min(startX, endX);
          const expectedTop = Math.min(startY, endY);
          const expectedRight = Math.max(startX, endX);
          const expectedBottom = Math.max(startY, endY);
          
          expect(selectionRect.left).toBe(expectedLeft);
          expect(selectionRect.top).toBe(expectedTop);
          expect(selectionRect.right).toBe(expectedRight);
          expect(selectionRect.bottom).toBe(expectedBottom);

          // 4. 清除选择框 - 验证需求 1.4, 1.5
          selectionBox.clearSelection();
          
          // 验证选择框元素被移除
          const clearedElement = document.querySelector('.browser-selection-copy-box');
          expect(clearedElement).toBeNull();
        }
      ),
      { numRuns: 100 } // 运行100次迭代以确保充分的随机性覆盖
    );
  });

  /**
   * 属性测试：选择框在鼠标事件序列中的状态一致性
   * 验证通过鼠标事件触发的选择框生命周期
   */
  test('属性测试：鼠标事件驱动的选择框生命周期', () => {
    fc.assert(
      fc.property(
        // 生成有效的坐标范围 (避免过小的选择区域)
        fc.integer({ min: 10, max: 500 }),
        fc.integer({ min: 10, max: 500 }),
        fc.integer({ min: 10, max: 500 }),
        fc.integer({ min: 10, max: 500 }),
        (startX, startY, endX, endY) => {
          // 确保选择区域足够大 (至少5x5像素)
          const width = Math.abs(endX - startX);
          const height = Math.abs(endY - startY);
          fc.pre(width >= 5 && height >= 5);

          let completedRect: SelectionRect | null = null;
          
          // 设置选择完成回调
          selectionBox.setOnSelectionComplete((rect) => {
            completedRect = rect;
          });

          // 1. 模拟鼠标按下事件
          const mouseDownEvent = new MouseEvent('mousedown', {
            button: 0,
            clientX: startX,
            clientY: startY,
            bubbles: true
          });
          Object.defineProperty(mouseDownEvent, 'pageX', { value: startX });
          Object.defineProperty(mouseDownEvent, 'pageY', { value: startY });
          document.dispatchEvent(mouseDownEvent);

          // 验证选择框被创建
          let selectionElement = document.querySelector('.browser-selection-copy-box') as HTMLElement;
          expect(selectionElement).toBeTruthy();

          // 2. 模拟鼠标移动事件
          const mouseMoveEvent = new MouseEvent('mousemove', {
            clientX: endX,
            clientY: endY,
            bubbles: true
          });
          Object.defineProperty(mouseMoveEvent, 'pageX', { value: endX });
          Object.defineProperty(mouseMoveEvent, 'pageY', { value: endY });
          document.dispatchEvent(mouseMoveEvent);

          // 验证选择框尺寸更新
          selectionElement = document.querySelector('.browser-selection-copy-box') as HTMLElement;
          expect(selectionElement).toBeTruthy();
          const actualWidth = parseInt(selectionElement.style.width);
          const actualHeight = parseInt(selectionElement.style.height);
          expect(actualWidth).toBe(width);
          expect(actualHeight).toBe(height);

          // 3. 模拟鼠标释放事件
          const mouseUpEvent = new MouseEvent('mouseup', {
            button: 0,
            bubbles: true
          });
          document.dispatchEvent(mouseUpEvent);

          // 验证选择完成回调被触发
          expect(completedRect).toBeTruthy();
          expect(completedRect!.left).toBe(Math.min(startX, endX));
          expect(completedRect!.top).toBe(Math.min(startY, endY));
          expect(completedRect!.right).toBe(Math.max(startX, endX));
          expect(completedRect!.bottom).toBe(Math.max(startY, endY));

          // 4. 模拟点击其他区域清除选择框
          const clickEvent = new MouseEvent('click', {
            bubbles: true
          });
          document.dispatchEvent(clickEvent);

          // 验证选择框被清除
          const clearedElement = document.querySelector('.browser-selection-copy-box');
          expect(clearedElement).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性测试：选择框样式和显示属性的一致性
   * 验证选择框在所有页面上都能正确显示
   */
  test('属性测试：选择框样式一致性', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        (startX, startY) => {
          // 开始选择
          selectionBox.startSelection(startX, startY);
          
          const selectionElement = document.querySelector('.browser-selection-copy-box') as HTMLElement;
          expect(selectionElement).toBeTruthy();
          
          // 验证关键样式属性确保在所有页面上正确显示
          expect(selectionElement.style.position).toBe('absolute');
          expect(selectionElement.style.zIndex).toBe('2147483647'); // 最大 z-index
          expect(selectionElement.style.pointerEvents).toBe('none');
          expect(selectionElement.style.border).toBe('2px dashed #007acc');
          expect(selectionElement.style.backgroundColor).toBe('rgba(0, 122, 204, 0.1)');
          
          // 验证样式使用了 important 优先级
          expect(selectionElement.style.getPropertyPriority('position')).toBe('important');
          expect(selectionElement.style.getPropertyPriority('z-index')).toBe('important');
          expect(selectionElement.style.getPropertyPriority('pointer-events')).toBe('important');
          
          // 清理
          selectionBox.clearSelection();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性测试：小选择区域的处理
   * 验证选择区域太小时的清除行为
   */
  test('属性测试：小选择区域处理', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 4 }), // 小于5像素的偏移
        fc.integer({ min: 0, max: 4 }),
        (startX, startY, offsetX, offsetY) => {
          const endX = startX + offsetX;
          const endY = startY + offsetY;

          let completedRect: SelectionRect | null = null;
          selectionBox.setOnSelectionComplete((rect) => {
            completedRect = rect;
          });

          // 模拟小范围拖拽
          const mouseDownEvent = new MouseEvent('mousedown', {
            button: 0,
            clientX: startX,
            clientY: startY,
            bubbles: true
          });
          Object.defineProperty(mouseDownEvent, 'pageX', { value: startX });
          Object.defineProperty(mouseDownEvent, 'pageY', { value: startY });
          document.dispatchEvent(mouseDownEvent);

          const mouseMoveEvent = new MouseEvent('mousemove', {
            clientX: endX,
            clientY: endY,
            bubbles: true
          });
          Object.defineProperty(mouseMoveEvent, 'pageX', { value: endX });
          Object.defineProperty(mouseMoveEvent, 'pageY', { value: endY });
          document.dispatchEvent(mouseMoveEvent);

          const mouseUpEvent = new MouseEvent('mouseup', {
            button: 0,
            bubbles: true
          });
          document.dispatchEvent(mouseUpEvent);

          // 验证小选择区域不会触发选择完成回调
          expect(completedRect).toBeNull();
          
          // 验证选择框被清除
          const selectionElement = document.querySelector('.browser-selection-copy-box');
          expect(selectionElement).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});