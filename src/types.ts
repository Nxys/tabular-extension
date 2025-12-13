// 选择区域接口
export interface SelectionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// 文本元素接口
export interface TextElement {
  text: string;
  rect: DOMRect;
  element: Element;
  lineIndex: number;
  columnIndex: number;
}