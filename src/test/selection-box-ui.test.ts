import { SelectionBox } from '../components/SelectionBox.js';

/**
 * 选择框 UI 和样式测试
 */
describe('SelectionBox UI 和样式', () => {
  let selectionBox: SelectionBox;

  beforeEach(() => {
    // 清理 DOM
    document.body.innerHTML = '';
    selectionBox = new SelectionBox();
  });

  afterEach(() => {
    selectionBox.clearSelection();
    document.body.innerHTML = '';
  });

  test('应该创建具有正确样式的选择框元素', () => {
    // 开始选择
    selectionBox.startSelection(100, 100);

    // 检查选择框元素是否被创建
    const selectionElement = document.querySelector('.browser-selection-copy-box') as HTMLElement;
    expect(selectionElement).toBeTruthy();
    expect(selectionElement.tagName).toBe('DIV');

    // 检查关键样式属性
    expect(selectionElement.style.position).toBe('absolute');
    expect(selectionElement.style.border).toBe('2px dashed #007acc');
    expect(selectionElement.style.backgroundColor).toBe('rgba(0, 122, 204, 0.1)');
    expect(selectionElement.style.pointerEvents).toBe('none');
    expect(selectionElement.style.zIndex).toBe('2147483647');
  });

  test('应该正确设置初始位置和尺寸', () => {
    const startX = 150;
    const startY = 200;

    selectionBox.startSelection(startX, startY);

    const selectionElement = document.querySelector('.browser-selection-copy-box') as HTMLElement;
    expect(selectionElement.style.left).toBe(`${startX}px`);
    expect(selectionElement.style.top).toBe(`${startY}px`);
    expect(selectionElement.style.width).toBe('0px');
    expect(selectionElement.style.height).toBe('0px');
  });

  test('应该正确更新选择框的位置和尺寸', () => {
    const startX = 100;
    const startY = 100;
    const currentX = 200;
    const currentY = 150;

    selectionBox.startSelection(startX, startY);
    
    // 检查初始状态
    let selectionElement = document.querySelector('.browser-selection-copy-box') as HTMLElement;
    expect(selectionElement.style.getPropertyValue('left')).toBe('100px');
    expect(selectionElement.style.getPropertyValue('top')).toBe('100px');
    expect(selectionElement.style.getPropertyValue('width')).toBe('0px');
    expect(selectionElement.style.getPropertyValue('height')).toBe('0px');
    
    selectionBox.updateSelection(currentX, currentY);

    selectionElement = document.querySelector('.browser-selection-copy-box') as HTMLElement;
    
    // 计算期望的位置和尺寸
    const expectedLeft = Math.min(startX, currentX); // 100
    const expectedTop = Math.min(startY, currentY);  // 100
    const expectedWidth = Math.abs(currentX - startX); // 100
    const expectedHeight = Math.abs(currentY - startY); // 50

    expect(selectionElement.style.getPropertyValue('left')).toBe(`${expectedLeft}px`);
    expect(selectionElement.style.getPropertyValue('top')).toBe(`${expectedTop}px`);
    expect(selectionElement.style.getPropertyValue('width')).toBe(`${expectedWidth}px`);
    expect(selectionElement.style.getPropertyValue('height')).toBe(`${expectedHeight}px`);
  });

  test('应该处理反向拖拽（从右下到左上）', () => {
    const startX = 200;
    const startY = 200;
    const currentX = 100;
    const currentY = 100;

    selectionBox.startSelection(startX, startY);
    selectionBox.updateSelection(currentX, currentY);

    const selectionElement = document.querySelector('.browser-selection-copy-box') as HTMLElement;
    
    // 反向拖拽时，left 和 top 应该是较小的值
    expect(selectionElement.style.getPropertyValue('left')).toBe('100px');
    expect(selectionElement.style.getPropertyValue('top')).toBe('100px');
    expect(selectionElement.style.getPropertyValue('width')).toBe('100px');
    expect(selectionElement.style.getPropertyValue('height')).toBe('100px');
  });

  test('应该正确清除选择框', () => {
    selectionBox.startSelection(100, 100);
    
    // 确认选择框存在
    let selectionElement = document.querySelector('.browser-selection-copy-box');
    expect(selectionElement).toBeTruthy();

    // 清除选择框
    selectionBox.clearSelection();

    // 确认选择框被移除
    selectionElement = document.querySelector('.browser-selection-copy-box');
    expect(selectionElement).toBeNull();
  });

  test('应该确保选择框在所有页面上都能正确显示（高 z-index）', () => {
    selectionBox.startSelection(100, 100);

    const selectionElement = document.querySelector('.browser-selection-copy-box') as HTMLElement;
    
    // 检查 z-index 是否足够高以确保在所有页面上显示
    expect(selectionElement.style.zIndex).toBe('2147483647'); // 最大 z-index 值
  });

  test('应该使用 important 优先级确保样式不被覆盖', () => {
    selectionBox.startSelection(100, 100);

    const selectionElement = document.querySelector('.browser-selection-copy-box') as HTMLElement;
    
    // 检查关键样式是否使用了 important 优先级
    expect(selectionElement.style.getPropertyPriority('position')).toBe('important');
    expect(selectionElement.style.getPropertyPriority('z-index')).toBe('important');
    expect(selectionElement.style.getPropertyPriority('pointer-events')).toBe('important');
  });
});