/**
 * Shared 类型定义模块（合并版）
 * 
 * 职责：
 * - 消息协议定义
 * - 枚举类型定义
 * - 跨层纯类型定义
 * 
 * 禁止：
 * - 不得包含业务逻辑
 * - 不得包含状态管理
 * - 不得包含 usage、pro、policy、strategy 相关定义
 */

/**
 * ============================================
 * 消息协议
 * ============================================
 */

/**
 * Content → Background: 请求执行操作
 */
export interface RequestActionMessage {
  type: 'REQUEST_ACTION';
  payload: {
    action: ActionType;
    data?: unknown;
  };
}

/**
 * Background → Content: 操作结果
 */
export interface ActionResultMessage {
  type: 'ACTION_RESULT';
  payload: {
    status: ActionStatus;
    uiAction: UIAction;
    data?: unknown;
    uiData?: {
      text?: string;
      table?: string[][];
      csv?: string;
      message?: string;  // 由 background 生成的完整文案
    };
  };
}

/**
 * 所有消息类型的联合
 */
export type ExtensionMessage =
  | RequestActionMessage
  | ActionResultMessage;

/**
 * ============================================
 * 枚举类型
 * ============================================
 */

/**
 * 操作类型
 */
export type ActionType =
  | 'text-extract'      // 文本提取
  | 'table-detect'      // 表格检测
  | 'column-align'      // 列对齐
  | 'csv-export';       // CSV 导出

/**
 * UI 动作枚举
 */
export type UIAction =
  | 'SHOW_RESULT_PANEL'    // 显示结果面板
  | 'SHOW_LIMIT_PANEL'     // 显示限制提示
  | 'SHOW_PRO_PANEL';      // 显示 Pro 升级提示

/**
 * 操作状态
 */
export type ActionStatus = 'ok' | 'limited' | 'blocked';

/**
 * ============================================
 * 跨层纯类型
 * ============================================
 */

/**
 * 选择区域
 */
export interface SelectionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * 面板位置类型
 */
export type PanelPosition = 'center' | 'mouse' | 'none';

/**
 * 插件设置
 */
export interface PluginSettings {
  enabled: boolean;
  panelPosition: PanelPosition;
}

/**
 * 文本项（extractor 使用）
 */
export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 布局选项（extractor 使用）
 */
export interface LayoutOptions {
  lineThresholdRatio: number;
  minHorizontalGap: number;
}
