import { SelectionBox } from '../components/SelectionBox.js';

/**
 * 选择框鼠标事件处理测试
 */
describe('SelectionBox 鼠标事件处理', () => {
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

  test('应该响应鼠标按下事件开始选择', () => {
    const startX = 100;
    const startY = 100;

    // 模拟鼠标按下事件
    const mouseDownEvent = new MouseEvent('mousedown', {
      button: 0, // 左键
      clientX: startX,
      clientY: startY,
      bubbles: true
    });

    // 手动设置 pageX 和 pageY
    Object.defineProperty(mouseDownEvent, 'pageX', { value: startX });
    Object.defineProperty(mouseDownEvent, 'pageY', { value: startY });

    document.dispatchEvent(mouseDownEvent);

    // 检查选择框是否被创建
    const selectionElement = document.querySelector('.browser-selection-copy-box');
    expect(selectionElement).toBeTruthy();
  });

  test('应该响应鼠标移动事件更新选择框', () => {
    const startX = 100;
    const startY = 100;
    const moveX = 200;
    const moveY = 150;

    // 模拟鼠标按下
    const mouseDownEvent = new MouseEvent('mousedown', {
      button: 0,
      clientX: startX,
      clientY: startY,
      bubbles: true
    });
    Object.defineProperty(mouseDownEvent, 'pageX', { value: startX });
    Object.defineProperty(mouseDownEvent, 'pageY', { value: startY });
    document.dispatchEvent(mouseDownEvent);

    // 模拟鼠标移动
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: moveX,
      clientY: moveY,
      bubbles: true
    });
    Object.defineProperty(mouseMoveEvent, 'pageX', { value: moveX });
    Object.defineProperty(mouseMoveEvent, 'pageY', { value: moveY });
    document.dispatchEvent(mouseMoveEvent);

    // 检查选择框尺寸是否更新
    const selectionElement = document.querySelector('.browser-selection-copy-box') as HTMLElement;
    expect(selectionElement.style.getPropertyValue('width')).toBe('100px');
    expect(selectionElement.style.getPropertyValue('height')).toBe('50px');
  });

  test('应该响应鼠标释放事件完成选择', () => {
    let completedRect: any = null;
    
    // 设置选择完成回调
    selectionBox.setOnSelectionComplete((rect) => {
      completedRect = rect;
    });

    const startX = 100;
    const startY = 100;
    const endX = 200;
    const endY = 150;

    // 模拟完整的拖拽操作
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

    document.dispatchEvent(new MouseEvent('mouseup', {
      button: 0,
      bubbles: true
    }));

    // 检查是否触发了选择完成回调
    expect(completedRect).toBeTruthy();
    expect(completedRect.left).toBeCloseTo(startX, 0);
    expect(completedRect.top).toBeCloseTo(startY, 0);
  });

  test('应该忽略非左键点击', () => {
    // 模拟右键点击
    const rightClickEvent = new MouseEvent('mousedown', {
      button: 2, // 右键
      clientX: 100,
      clientY: 100,
      bubbles: true
    });
    Object.defineProperty(rightClickEvent, 'pageX', { value: 100 });
    Object.defineProperty(rightClickEvent, 'pageY', { value: 100 });

    document.dispatchEvent(rightClickEvent);

    // 检查选择框不应该被创建
    const selectionElement = document.querySelector('.browser-selection-copy-box');
    expect(selectionElement).toBeNull();
  });

  test('应该在选择区域太小时清除选择框', () => {
    const startX = 100;
    const startY = 100;
    const endX = 102; // 只移动2像素，小于最小尺寸5px

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
      clientY: startY,
      bubbles: true
    });
    Object.defineProperty(mouseMoveEvent, 'pageX', { value: endX });
    Object.defineProperty(mouseMoveEvent, 'pageY', { value: startY });
    document.dispatchEvent(mouseMoveEvent);

    document.dispatchEvent(new MouseEvent('mouseup', {
      button: 0,
      bubbles: true
    }));

    // 检查选择框应该被清除
    const selectionElement = document.querySelector('.browser-selection-copy-box');
    expect(selectionElement).toBeNull();
  });

  test('应该在点击其他区域时清除选择框', () => {
    // 先创建一个选择框
    selectionBox.startSelection(100, 100);
    selectionBox.updateSelection(200, 150);
    selectionBox.finishSelection();

    // 确认选择框存在且已完成
    let selectionElement = document.querySelector('.browser-selection-copy-box');
    expect(selectionElement).toBeTruthy();
    expect(selectionBox.isSelectionCompleted()).toBe(true);

    // 模拟点击其他区域
    const clickEvent = new MouseEvent('click', {
      bubbles: true
    });
    document.dispatchEvent(clickEvent);

    // 检查选择框是否被清除
    selectionElement = document.querySelector('.browser-selection-copy-box');
    expect(selectionElement).toBeNull();
    expect(selectionBox.isSelectionCompleted()).toBe(false);
  });

  test('应该在选择完成后正确管理状态', () => {
    // 开始选择
    selectionBox.startSelection(100, 100);
    expect(selectionBox.isCurrentlySelecting()).toBe(true);
    expect(selectionBox.isSelectionCompleted()).toBe(false);
    expect(selectionBox.hasActiveSelection()).toBe(true);

    // 更新选择
    selectionBox.updateSelection(200, 150);
    expect(selectionBox.isCurrentlySelecting()).toBe(true);
    expect(selectionBox.isSelectionCompleted()).toBe(false);

    // 完成选择
    selectionBox.finishSelection();
    expect(selectionBox.isCurrentlySelecting()).toBe(false);
    expect(selectionBox.isSelectionCompleted()).toBe(true);
    expect(selectionBox.hasActiveSelection()).toBe(true);

    // 清除选择
    selectionBox.clearSelection();
    expect(selectionBox.isCurrentlySelecting()).toBe(false);
    expect(selectionBox.isSelectionCompleted()).toBe(false);
    expect(selectionBox.hasActiveSelection()).toBe(false);
  });

  test('应该在开始新选择时清除之前完成的选择框', () => {
    // 创建第一个选择框并完成
    selectionBox.startSelection(100, 100);
    selectionBox.updateSelection(200, 150);
    selectionBox.finishSelection();

    // 确认第一个选择框存在且已完成
    let selectionElement = document.querySelector('.browser-selection-copy-box');
    expect(selectionElement).toBeTruthy();
    expect(selectionBox.isSelectionCompleted()).toBe(true);

    // 开始新的选择（模拟鼠标按下）
    const mouseDownEvent = new MouseEvent('mousedown', {
      button: 0,
      clientX: 300,
      clientY: 300,
      bubbles: true
    });
    Object.defineProperty(mouseDownEvent, 'pageX', { value: 300 });
    Object.defineProperty(mouseDownEvent, 'pageY', { value: 300 });
    document.dispatchEvent(mouseDownEvent);

    // 检查状态：应该清除之前的选择并开始新选择
    expect(selectionBox.isCurrentlySelecting()).toBe(true);
    expect(selectionBox.isSelectionCompleted()).toBe(false);
    
    // 应该有新的选择框
    const newSelectionElement = document.querySelector('.browser-selection-copy-box') as HTMLElement;
    expect(newSelectionElement).toBeTruthy();
    expect(newSelectionElement.style.left).toBe('300px');
    expect(newSelectionElement.style.top).toBe('300px');
  });

  test('destroy 方法应该清理所有资源', () => {
    // 创建选择框
    selectionBox.startSelection(100, 100);
    
    // 确认选择框存在
    let selectionElement = document.querySelector('.browser-selection-copy-box');
    expect(selectionElement).toBeTruthy();

    // 销毁组件
    selectionBox.destroy();

    // 检查选择框是否被清除
    selectionElement = document.querySelector('.browser-selection-copy-box');
    expect(selectionElement).toBeNull();
  });
});