import type { TextItem } from './collect';

/**
 * 布局选项
 */
export interface LayoutOptions {
  lineThresholdRatio: number;  // 行阈值比例（原 LINE_TOLERANCE）
  minHorizontalGap: number;    // 最小水平间距（用于判断是否插入空格）
}

/**
 * 将文本项按视觉行分组
 * 这是插件的核心技术护城河
 * @param items 文本项数组
 * @param options 布局选项
 * @returns 二维数组，外层为行，内层为该行的文本项
 */
export function layout(items: TextItem[], options: LayoutOptions): TextItem[][] {
  // 空输入处理
  if (items.length === 0) return [];

  // 按行分组
  const lines: TextItem[][] = [];
  
  for (const item of items) {
    const itemTop = item.rect.top;
    let foundLine = false;
    
    // 检查是否属于已有的行
    for (const line of lines) {
      const lineTop = line[0].rect.top;
      // 使用 lineThresholdRatio 判断是否在同一行
      if (Math.abs(itemTop - lineTop) <= options.lineThresholdRatio) {
        line.push(item);
        foundLine = true;
        break;
      }
    }
    
    // 如果不属于任何已有行，创建新行
    if (!foundLine) {
      lines.push([item]);
    }
  }

  // 行内按 X 坐标排序
  for (const line of lines) {
    line.sort((a, b) => a.rect.left - b.rect.left);
  }
  
  // 行间按 Y 坐标排序
  lines.sort((a, b) => a[0].rect.top - b[0].rect.top);
  
  return lines;
}
