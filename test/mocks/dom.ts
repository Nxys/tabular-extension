/**
 * DOM Mock 增强
 * 提供 jsdom 缺失的 DOM API mock
 */

/**
 * Mock Element.getClientRects() 方法
 * @param element - 要 mock 的元素
 * @param rects - 返回的 DOMRect 数组
 */
export function mockGetClientRects(element: Element, rects: DOMRect[]): void {
  Object.defineProperty(element, 'getClientRects', {
    value: () => rects,
    configurable: true,
    writable: true
  });
}

/**
 * Mock Element.getBoundingClientRect() 方法
 * @param element - 要 mock 的元素
 * @param rect - 返回的 DOMRect 对象
 */
export function mockGetBoundingClientRect(element: Element, rect: DOMRect): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => rect,
    configurable: true,
    writable: true
  });
}

/**
 * Mock window.getComputedStyle() 方法
 * @param element - 要 mock 的元素
 * @param styles - 返回的样式对象
 */
export function mockComputedStyle(
  element: Element,
  styles: Partial<CSSStyleDeclaration>
): void {
  const originalGetComputedStyle = window.getComputedStyle;
  
  window.getComputedStyle = ((el: Element) => {
    if (el === element) {
      return styles as CSSStyleDeclaration;
    }
    return originalGetComputedStyle(el);
  }) as typeof window.getComputedStyle;
}

/**
 * 创建一个带有位置信息的 mock 文本节点
 * @param text - 文本内容
 * @param rect - 文本节点的位置信息
 * @returns Mock 文本节点
 */
export function createMockTextNode(text: string, rect: DOMRect): Text {
  const textNode = document.createTextNode(text);
  
  // 为文本节点添加位置信息（通常文本节点没有这些方法）
  Object.defineProperty(textNode, 'getBoundingClientRect', {
    value: () => rect,
    configurable: true,
    writable: true
  });
  
  Object.defineProperty(textNode, 'getClientRects', {
    value: () => [rect],
    configurable: true,
    writable: true
  });
  
  return textNode;
}

/**
 * 创建一个 DOMRect 对象
 * @param x - X 坐标
 * @param y - Y 坐标
 * @param width - 宽度
 * @param height - 高度
 * @returns DOMRect 对象
 */
export function createDOMRect(
  x: number,
  y: number,
  width: number,
  height: number
): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    right: x + width,
    bottom: y + height,
    left: x,
    toJSON: () => ({
      x,
      y,
      width,
      height,
      top: y,
      right: x + width,
      bottom: y + height,
      left: x
    })
  } as DOMRect;
}

/**
 * 创建一个带有位置信息的 mock 元素
 * @param tagName - 标签名
 * @param rect - 元素的位置信息
 * @param textContent - 文本内容（可选）
 * @returns Mock 元素
 */
export function createMockElement(
  tagName: string,
  rect: DOMRect,
  textContent?: string
): HTMLElement {
  const element = document.createElement(tagName);
  
  if (textContent) {
    element.textContent = textContent;
  }
  
  mockGetBoundingClientRect(element, rect);
  mockGetClientRects(element, [rect]);
  
  return element;
}

/**
 * 恢复 window.getComputedStyle 到原始实现
 */
export function restoreComputedStyle(): void {
  // jsdom 会在每个测试后自动重置，这里提供一个显式的恢复方法
  delete (window as any).getComputedStyle;
}
