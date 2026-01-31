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

import type { ExportFormat } from '../shared/types';
import { advancedClean, basicClean } from './cleaner';
import type { CleaningRules } from './cleaner';

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
  // 添加数据验证
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('导出数据无效或为空');
  }
  
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
      throw new Error(`不支持的导出格式: ${options.format}`);
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
  // 添加数据验证：检查 null、undefined、非数组
  if (!data || !Array.isArray(data)) {
    console.error('Invalid data: data is not an array');
    throw new Error('数据格式无效：必须是数组');
  }
  
  // 处理空数组
  if (data.length === 0) {
    return '';
  }
  
  return data.map(row => {
    // 验证每行也是数组
    if (!Array.isArray(row)) {
      console.warn('Invalid row: not an array', row);
      throw new Error('数据格式无效：每行必须是数组');
    }
    
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
 * 使用制表符分隔（TSV格式），Excel会自动识别为多列
 * 
 * 注意：
 * - 使用制表符（\t）分隔列，Excel会正确识别为多列
 * - 转义单元格中的制表符和换行符，避免破坏格式
 * - 这是一个简化实现，满足基本需求
 * - 后续可以升级为真正的 .xlsx 格式
 * 
 * @param data - 二维数组表格数据
 * @returns Excel Blob 对象（TSV格式）
 */
export function toExcel(data: string[][]): Blob {
  // 使用制表符分隔（Excel会自动识别为多列）
  const tsvContent = data.map(row => {
    return row.map(field => {
      const fieldStr = String(field);
      // 转义制表符和换行符，避免破坏格式
      return fieldStr.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');
    }).join('\t');  // 使用制表符分隔
  }).join('\r\n') + '\r\n';
  
  // 使用 Excel 兼容的 MIME 类型
  return new Blob([tsvContent], { 
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
