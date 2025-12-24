/**
 * 页面数据提取（核心资产 - 合并版）
 * 
 * 职责：
 * - DOM 信息采集（collect）
 * - 排版结构分析（layout）
 * - 数据格式化（format）
 * - 表格检测、对齐、CSV 导出
 */

import type { TextItem, LayoutOptions, SelectionRect } from '../shared/types';

/**
 * ============================================
 * DOM 信息采集
 * ============================================
 */

/**
 * 采集选择区域内的文本元素
 * 纯事实采集，不包含任何业务逻辑或视觉判断
 */
export function collect(selectionRect: SelectionRect): TextItem[] {
  const items: TextItem[] = [];
  
  // 性能优化：缓存已检查过的元素的可见性
  const visibilityCache = new Map<Element, boolean>();
  
  // 使用 TreeWalker 遍历 DOM TextNode
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // 过滤空文本
        if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
        
        // 过滤不可见元素（使用缓存）
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        // 检查缓存
        let visible = visibilityCache.get(parent);
        if (visible === undefined) {
          visible = isVisible(parent);
          visibilityCache.set(parent, visible);
        }
        
        return visible ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );

  let node: Text | null;
  while ((node = walker.nextNode() as Text)) {
    const parent = node.parentElement!;
    const clientRects = parent.getClientRects();
    
    // 遍历所有 rect，检查是否与选择区域相交
    for (let i = 0; i < clientRects.length; i++) {
      const clientRect = clientRects[i];
      
      // 将 clientRect 转换为绝对坐标
      const elementRect = {
        left: clientRect.left + window.scrollX,
        top: clientRect.top + window.scrollY,
        right: clientRect.right + window.scrollX,
        bottom: clientRect.bottom + window.scrollY
      };

      // 过滤不在选择区域内的 rect
      if (intersects(elementRect, selectionRect)) {
        items.push({
          text: node.textContent || '',
          x: clientRect.left,
          y: clientRect.top,
          width: clientRect.width,
          height: clientRect.height
        });
        break;
      }
    }
  }

  return items;
}

/**
 * 检查元素是否可见
 */
function isVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0';
}

/**
 * 检查两个矩形是否相交
 */
function intersects(
  rect1: { left: number; top: number; right: number; bottom: number },
  rect2: { left: number; top: number; right: number; bottom: number }
): boolean {
  return !(rect1.right < rect2.left || 
           rect1.left > rect2.right ||
           rect1.bottom < rect2.top ||
           rect1.top > rect2.bottom);
}

/**
 * ============================================
 * 排版结构分析
 * ============================================
 */

/**
 * 将文本项按视觉行分组
 * 这是插件的核心技术护城河
 */
export function layout(items: TextItem[], options: LayoutOptions): TextItem[][] {
  // 空输入处理
  if (items.length === 0) return [];

  // 按行分组
  const lines: TextItem[][] = [];
  
  for (const item of items) {
    const itemTop = item.y;
    let foundLine = false;
    
    // 检查是否属于已有的行
    for (const line of lines) {
      const lineTop = line[0].y;
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
    line.sort((a, b) => a.x - b.x);
  }
  
  // 行间按 Y 坐标排序
  lines.sort((a, b) => a[0].y - b[0].y);
  
  return lines;
}

/**
 * ============================================
 * 数据格式化
 * ============================================
 */

/**
 * 将视觉行结构格式化为文本
 */
export function format(lines: TextItem[][]): string {
  // 空输入处理
  if (lines.length === 0) return '';

  try {
    // 防护措施：限制总行数
    const maxLines = 10000;
    const limitedLines = lines.slice(0, maxLines);

    const resultLines: string[] = [];

    // 遍历每一行
    for (const line of limitedLines) {
      if (line.length === 0) continue;

      // 防护措施：限制单行元素数量
      const maxElementsPerLine = 1000;
      const limitedLine = line.slice(0, maxElementsPerLine);

      const lineTexts: string[] = [];

      // 遍历行内的每个文本项
      for (const item of limitedLine) {
        const text = item.text.trim();
        
        // 跳过空文本和过长文本
        if (!text || text.length > 10000) continue;

        lineTexts.push(text);
      }

      // 行内文本拼接
      if (lineTexts.length > 0) {
        try {
          // 使用空格连接行内文本
          const lineText = lineTexts.join(' ');
          
          // 防护措施：限制单行最大长度
          if (lineText.length < 100000) {
            resultLines.push(lineText);
          }
        } catch (e) {
          // 如果 join 失败，使用第一个元素
          if (lineTexts.length > 0) {
            resultLines.push(lineTexts[0]);
          }
        }
      }
    }

    // 行间拼接：使用换行符连接所有行
    try {
      return resultLines.join('\n');
    } catch (e) {
      // 如果最终 join 失败，返回第一行
      return resultLines.length > 0 ? resultLines[0] : '';
    }
  } catch (error) {
    console.warn('文本合并出错:', error);
    return '文本提取出错';
  }
}

/**
 * ============================================
 * 表格检测
 * ============================================
 */

/**
 * 表格单元格
 */
export interface TableCell {
  text: string;
  col: number;
  x?: number;
}

/**
 * 表格结构
 */
export interface Table {
  columns: number;
  rows: TableCell[][];
}

/**
 * 列聚类的阈值（像素）
 */
const COLUMN_THRESHOLD = 50;

/**
 * 检测表格结构
 * 基于 X 轴位置聚类识别列
 */
export function detectTable(lines: TextItem[][]): Table {
  // 边界情况：空输入
  if (lines.length === 0 || lines.every(line => line.length === 0)) {
    return { columns: 0, rows: [] };
  }

  // 1. 收集所有 X 坐标中心点
  const xPositions: number[] = [];
  for (const line of lines) {
    for (const item of line) {
      const centerX = item.x + item.width / 2;
      xPositions.push(centerX);
    }
  }

  if (xPositions.length === 0) {
    return { columns: 0, rows: [] };
  }

  // 2. X 轴聚类
  const clusters = clusterXPositions(xPositions);

  if (clusters.length === 0) {
    return { columns: 0, rows: [] };
  }

  // 3. 分配单元格到列
  const rows: TableCell[][] = [];
  
  for (const line of lines) {
    const row: TableCell[] = [];
    for (const item of line) {
      const centerX = item.x + item.width / 2;
      
      // 找到最近的列
      let closestCol = 0;
      let minDistance = Math.abs(centerX - clusters[0]);
      
      for (let i = 1; i < clusters.length; i++) {
        const distance = Math.abs(centerX - clusters[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestCol = i;
        }
      }
      
      row.push({
        text: item.text,
        col: closestCol,
        x: centerX
      });
    }
    
    if (row.length > 0) {
      rows.push(row);
    }
  }

  return {
    columns: clusters.length,
    rows
  };
}

/**
 * 对 X 坐标进行聚类
 */
function clusterXPositions(xPositions: number[]): number[] {
  if (xPositions.length === 0) return [];

  const sorted = [...xPositions].sort((a, b) => a - b);

  const clusters: number[] = [];
  let clusterSum = sorted[0];
  let clusterCount = 1;

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    
    if (gap <= COLUMN_THRESHOLD) {
      clusterSum += sorted[i];
      clusterCount++;
    } else {
      clusters.push(clusterSum / clusterCount);
      clusterSum = sorted[i];
      clusterCount = 1;
    }
  }

  clusters.push(clusterSum / clusterCount);

  return clusters;
}

/**
 * ============================================
 * 表格对齐
 * ============================================
 */

/**
 * 计算字符串显示宽度
 * 中文字符按 2 个字符计算
 */
export function getDisplayWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += char.charCodeAt(0) > 0x7F ? 2 : 1;
  }
  return width;
}

/**
 * 对齐表格
 * 计算每列最大宽度，使用空格补齐
 */
export function alignTable(table: Table): string[][] {
  if (table.columns === 0 || table.rows.length === 0) {
    return [];
  }

  // 1. 计算每列的最大宽度
  const columnWidths: number[] = new Array(table.columns).fill(0);
  
  for (const row of table.rows) {
    for (const cell of row) {
      const width = getDisplayWidth(cell.text);
      if (width > columnWidths[cell.col]) {
        columnWidths[cell.col] = width;
      }
    }
  }

  // 2. 生成对齐后的文本
  const aligned: string[][] = [];
  
  for (const row of table.rows) {
    const sortedCells = [...row].sort((a, b) => a.col - b.col);
    
    const alignedRow: string[] = [];
    for (let col = 0; col < table.columns; col++) {
      const cell = sortedCells.find(c => c.col === col);
      const text = cell?.text || '';
      const width = getDisplayWidth(text);
      const padding = columnWidths[col] - width;
      
      alignedRow.push(text + ' '.repeat(Math.max(0, padding + 2)));
    }
    
    aligned.push(alignedRow);
  }

  return aligned;
}

/**
 * ============================================
 * CSV 导出
 * ============================================
 */

/**
 * 转义 CSV 字段
 * 遵循 RFC 4180 标准
 */
export function escapeCSVField(text: string): string {
  const needsQuotes = /[",\n\r]/.test(text);
  
  if (needsQuotes) {
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return text;
}

/**
 * 转换为 CSV 格式
 * 遵循 RFC 4180 标准
 */
export function toCSV(table: Table): string {
  if (table.columns === 0 || table.rows.length === 0) {
    return '';
  }

  const lines: string[] = [];
  
  for (const row of table.rows) {
    const sortedCells = [...row].sort((a, b) => a.col - b.col);
    
    const fields: string[] = [];
    for (let col = 0; col < table.columns; col++) {
      const cell = sortedCells.find(c => c.col === col);
      fields.push(escapeCSVField(cell?.text || ''));
    }
    
    lines.push(fields.join(','));
  }
  
  return lines.join('\n');
}

/**
 * ============================================
 * 主接口
 * ============================================
 */

/**
 * 默认布局选项
 */
const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  lineThresholdRatio: 5,
  minHorizontalGap: 10
};

/**
 * 提取选择区域的文本
 * 这是对外的主接口
 */
export function extract(rect: SelectionRect, options: LayoutOptions = DEFAULT_LAYOUT_OPTIONS): string {
  const items = collect(rect);
  const lines = layout(items, options);
  return format(lines);
}
