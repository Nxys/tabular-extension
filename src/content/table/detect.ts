import type { TextItem } from '../extractor/collect';

/**
 * 表格单元格
 */
export interface TableCell {
  /** 单元格文本 */
  text: string;
  /** 所属列索引 */
  col: number;
  /** 原始 X 坐标（用于调试） */
  x?: number;
}

/**
 * 表格结构
 */
export interface Table {
  /** 列数量 */
  columns: number;
  /** 行数据，每行是一个单元格数组 */
  rows: TableCell[][];
}

/**
 * 列聚类的阈值（像素）
 * X 坐标差距小于此值的文本项会被合并到同一列
 */
const COLUMN_THRESHOLD = 30;

/**
 * 检测表格结构
 * 
 * 基于 X 轴位置聚类识别列
 * 不依赖 DOM 元素类型（table/tr/td）
 * 
 * @param lines 视觉行数组（来自 layout 输出）
 * @returns 表格结构
 */
export function detectTable(lines: TextItem[][]): Table {
  // 边界情况：空输入
  if (lines.length === 0 || lines.every(line => line.length === 0)) {
    return {
      columns: 0,
      rows: []
    };
  }

  // 1. 收集所有 X 坐标中心点
  const xPositions: number[] = [];
  for (const line of lines) {
    for (const item of line) {
      const centerX = item.rect.left + item.rect.width / 2;
      xPositions.push(centerX);
    }
  }

  // 边界情况：没有有效的 X 坐标
  if (xPositions.length === 0) {
    return {
      columns: 0,
      rows: []
    };
  }

  // 2. X 轴聚类：合并接近的坐标
  const clusters = clusterXPositions(xPositions);

  // 边界情况：单列表格
  if (clusters.length === 0) {
    return {
      columns: 0,
      rows: []
    };
  }

  // 3. 分配单元格到列
  const rows: TableCell[][] = [];
  
  for (const line of lines) {
    const row: TableCell[] = [];
    for (const item of line) {
      const centerX = item.rect.left + item.rect.width / 2;
      
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
    
    // 只添加非空行
    if (row.length > 0) {
      rows.push(row);
    }
  }

  // 4. 返回表格结构
  return {
    columns: clusters.length,
    rows
  };
}

/**
 * 对 X 坐标进行聚类
 * 
 * 使用改进的聚类算法：
 * 1. 对坐标排序
 * 2. 使用滑动窗口，检查当前聚类的范围（最大值 - 最小值）
 * 3. 如果添加新坐标后范围仍在阈值内，则加入当前聚类
 * 4. 否则开始新聚类
 * 5. 返回每个聚类的中心点
 * 
 * @param xPositions X 坐标数组
 * @returns 聚类中心点数组
 */
function clusterXPositions(xPositions: number[]): number[] {
  if (xPositions.length === 0) {
    return [];
  }

  // 排序
  const sorted = [...xPositions].sort((a, b) => a - b);

  // 聚类：使用范围判断
  const clusters: number[] = [];
  let clusterStart = sorted[0];
  let clusterSum = sorted[0];
  let clusterCount = 1;

  for (let i = 1; i < sorted.length; i++) {
    // 检查如果加入当前坐标，聚类的范围是否仍在阈值内
    const potentialRange = sorted[i] - clusterStart;
    
    if (potentialRange <= COLUMN_THRESHOLD) {
      // 范围在阈值内，加入当前聚类
      clusterSum += sorted[i];
      clusterCount++;
    } else {
      // 范围超出阈值，保存当前聚类，开始新聚类
      clusters.push(clusterSum / clusterCount);
      clusterStart = sorted[i];
      clusterSum = sorted[i];
      clusterCount = 1;
    }
  }

  // 保存最后一个聚类
  clusters.push(clusterSum / clusterCount);

  return clusters;
}
