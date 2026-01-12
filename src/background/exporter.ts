/**
 * 数据导出模块
 * 
 * 职责：
 * - 支持多种格式的数据导出（CSV、Excel）
 * - 遵循 RFC 4180 标准实现 CSV 导出
 * - 支持应用清洗规则
 * - 为后续扩展更多导出格式预留接口
 * 
 * 架构约束：
 * - 业务逻辑层，不涉及 UI
 * - 纯函数实现，无副作用
 */

import { advancedClean, basicClean } from './cleaner.js';
import type { CleaningRules } from './cleaner.js';

/**
 * 导出格式类型
 */
export type ExportFormat = 'csv' | 'excel';

/**
 * 导出选项接口
 */
export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  cleaningRules?: CleaningRules;
}

/**
 * 导出数据主函数
 * 
 * 功能：
 * - 根据格式选择导出方法
 * - 支持应用清洗规则
 * - 返回可下载的 Blob 对象
 * 
 * @param data - 二维数组表格数据
 * @param options - 导出选项
 * @returns Blob 对象
 */
export async function exportData(
  data: string[][],
  options: ExportOptions
): Promise<Blob> {
  // 应用清洗规则（如果提供）
  let processedData = data;
  if (options.cleaningRules) {
    processedData = data.map(row => 
      advancedClean(row, options.cleaningRules!)
    );
  } else {
    processedData = data.map(row => basicClean(row));
  }

  // 根据格式导出
  switch (options.format) {
    case 'csv':
      return toCSVBlob(processedData);
    case 'excel':
      return toExcelBlob(processedData);
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

/**
 * 转换为 CSV 格式字符串
 * 
 * 遵循 RFC 4180 标准：
 * 1. 字段用逗号分隔
 * 2. 包含逗号、双引号或换行符的字段需要用双引号包裹
 * 3. 字段内的双引号需要转义为两个双引号
 * 4. 每行以 CRLF 结尾
 * 
 * @param data - 二维数组表格数据
 * @returns CSV 格式字符串
 */
export function toCSV(data: string[][]): string {
  // 处理空数组
  if (data.length === 0) {
    return '';
  }
  
  return data.map(row => {
    return row.map(field => {
      // 转换为字符串
      const fieldStr = String(field);
      
      // 检查是否需要引号包裹
      const needsQuotes = 
        fieldStr.includes(',') || 
        fieldStr.includes('"') || 
        fieldStr.includes('\n') ||
        fieldStr.includes('\r');
      
      if (needsQuotes) {
        // 转义双引号（双引号变为两个双引号）
        const escaped = fieldStr.replace(/"/g, '""');
        return `"${escaped}"`;
      }
      
      return fieldStr;
    }).join(',');
  }).join('\r\n') + '\r\n'; // 在末尾添加 CRLF，确保最后一行也有结束符
}

/**
 * 转换为 CSV Blob
 * 
 * @param data - 二维数组表格数据
 * @returns CSV Blob 对象
 */
function toCSVBlob(data: string[][]): Blob {
  const csvContent = toCSV(data);
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * 转换为 Excel 格式
 * 
 * 当前实现：使用 CSV 格式作为简化实现
 * 未来扩展：集成 SheetJS 或类似库实现真正的 Excel 格式
 * 
 * 注意：
 * - Excel 可以打开 CSV 文件
 * - 这是一个简化实现，满足基本需求
 * - 后续可以升级为真正的 .xlsx 格式
 * 
 * @param data - 二维数组表格数据
 * @returns Excel Blob 对象（当前为 CSV 格式）
 */
export function toExcel(data: string[][]): Blob {
  // 当前简化实现：使用 CSV 格式
  // Excel 可以直接打开 CSV 文件
  const csvContent = toCSV(data);
  
  // 使用 Excel 兼容的 MIME 类型
  return new Blob([csvContent], { 
    type: 'application/vnd.ms-excel;charset=utf-8;' 
  });
}

/**
 * 转换为 Excel Blob
 * 
 * @param data - 二维数组表格数据
 * @returns Excel Blob 对象
 */
function toExcelBlob(data: string[][]): Blob {
  return toExcel(data);
}
