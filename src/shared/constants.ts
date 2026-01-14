/**
 * Shared 常量定义模块
 * 
 * 职责：
 * - 跨模块共享的常量定义
 * - 配置常量
 * 
 * 注意：
 * - 业务常量应定义在对应的业务模块中（如 usage.ts 中的 maxPerDay）
 * - 只存储真正跨模块共享的常量
 */

import type { LayoutOptions } from './types';

/**
 * CSS 类名前缀
 * 用于所有插件相关的 DOM 元素
 */
export const CSS_CLASS_PREFIX = 'tabular-extension';

/**
 * 需要忽略的交互元素标签名
 * 在这些元素上不触发框选功能
 */
export const IGNORED_TAGS: readonly string[] = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];

/**
 * 默认布局选项
 * 用于文本提取时的布局分析
 */
export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  lineThresholdRatio: 5,
  minHorizontalGap: 10
};

/**
 * 最小有效选择区域尺寸（像素）
 */
export const MIN_SELECTION_SIZE = 5;
