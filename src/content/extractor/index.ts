// index.ts - Extractor 模块统一对外接口
// 职责：提供统一的对外接口，隐藏内部实现细节

import { collect } from './collect';
import { layout } from './layout';
import { format } from './format';
import type { TextItem } from './collect';
import type { LayoutOptions } from './layout';

/**
 * 默认布局选项
 */
const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  lineThresholdRatio: 5,
  minHorizontalGap: 10
};

/**
 * 提取选择区域内的文本
 * 严格按照 collect → layout → format 的顺序执行
 * @param selectionRect 选择区域
 * @param options 布局选项（可选，使用默认值）
 * @returns 格式化后的文本字符串
 */
export function extractText(
  selectionRect: { left: number; top: number; right: number; bottom: number },
  options: LayoutOptions = DEFAULT_LAYOUT_OPTIONS
): string {
  // 严格按照 pipeline 顺序执行
  const items = collect(selectionRect);
  const lines = layout(items, options);
  const text = format(lines);
  return text;
}

// 重新导出类型供外部使用
export type { TextItem, LayoutOptions };
