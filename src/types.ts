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

// 面板位置配置
export type PanelPosition = 'center' | 'mouse' | 'none';

// 插件配置
export interface PluginSettings {
  enabled: boolean;
  panelPosition: PanelPosition;
}
