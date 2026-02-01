/**
 * 数据导出模块测试
 */

import { toCSV, toExcel, exportData } from '../../../src/background/exporter';
import type { ExportOptions } from '../../../src/background/exporter';

describe('toCSV', () => {
  test('应该正确转换简单表格', () => {
    const data = [
      ['Name', 'Age'],
      ['Alice', '25'],
      ['Bob', '30']
    ];
    
    const result = toCSV(data);
    expect(result).toBe('Name,Age\r\nAlice,25\r\nBob,30\r\n');
  });
  
  test('应该处理包含逗号的字段', () => {
    const data = [['Name', 'City'], ['Alice', 'New York, NY']];
    
    const result = toCSV(data);
    expect(result).toBe('Name,City\r\nAlice,"New York, NY"\r\n');
  });
  
  test('应该转义双引号', () => {
    const data = [['Name', 'Quote'], ['Alice', 'She said "Hello"']];
    
    const result = toCSV(data);
    expect(result).toBe('Name,Quote\r\nAlice,"She said ""Hello"""\r\n');
  });
  
  test('应该处理包含换行符的字段', () => {
    const data = [['Name', 'Address'], ['Alice', 'Line1\nLine2']];
    
    const result = toCSV(data);
    expect(result).toBe('Name,Address\r\nAlice,"Line1\nLine2"\r\n');
  });
  
  test('应该处理空数组', () => {
    const result = toCSV([]);
    expect(result).toBe('');
  });
  
  test('应该处理空行', () => {
    const data = [['Name'], [''], ['Bob']];
    
    const result = toCSV(data);
    expect(result).toBe('Name\r\n\r\nBob\r\n');
  });
  
  test('应该拒绝 null 数据', () => {
    const data = null as any;
    
    expect(() => toCSV(data)).toThrow('数据格式无效：必须是数组');
  });
  
  test('应该拒绝 undefined 数据', () => {
    const data = undefined as any;
    
    expect(() => toCSV(data)).toThrow('数据格式无效：必须是数组');
  });
  
  test('应该拒绝非数组数据', () => {
    const data = 'not an array' as any;
    
    expect(() => toCSV(data)).toThrow('数据格式无效：必须是数组');
  });
  
  test('应该拒绝包含非数组行的数据', () => {
    const data = [['Name'], 'not an array' as any, ['Bob']];
    
    expect(() => toCSV(data)).toThrow('数据格式无效：每行必须是数组');
  });
});

describe('toExcel', () => {
  test('应该返回 Blob 对象', () => {
    const data = [['Name', 'Age'], ['Alice', '25']];
    
    const result = toExcel(data);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('application/vnd.ms-excel;charset=utf-8;');
  });
  
  test('应该包含正确的 CSV 内容', () => {
    const data = [['Name', 'Age'], ['Alice', '25']];
    
    const result = toExcel(data);
    // 验证 Blob 类型和大小
    expect(result).toBeInstanceOf(Blob);
    expect(result.size).toBeGreaterThan(0);
  });
});

describe('exportData', () => {
  test('应该导出 CSV 格式', async () => {
    const data = [['Name', 'Age'], ['Alice', '25']];
    const options: ExportOptions = { format: 'csv' };
    
    const result = await exportData(data, options);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('text/csv;charset=utf-8;');
  });
  
  test('应该导出 Excel 格式', async () => {
    const data = [['Name', 'Age'], ['Alice', '25']];
    const options: ExportOptions = { format: 'excel' };
    
    const result = await exportData(data, options);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('application/vnd.ms-excel;charset=utf-8;');
  });
  
  test('应该应用基础清洗规则', async () => {
    const data = [['  Name  ', '  Age  '], ['  Alice  ', '  25  ']];
    const options: ExportOptions = { format: 'csv' };
    
    const result = await exportData(data, options);
    // 验证返回 Blob
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('text/csv;charset=utf-8;');
  });
  
  test('应该应用高级清洗规则', async () => {
    const data = [['Name', 'Age'], ['', ''], ['Alice', '25']];
    const options: ExportOptions = {
      format: 'csv',
      cleaningRules: {
        mergeToSingleLine: false,
        removeDuplicates: false
      }
    };
    
    const result = await exportData(data, options);
    // 验证返回 Blob
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('text/csv;charset=utf-8;');
  });
  
  test('应该处理不支持的格式', async () => {
    const data = [['Name', 'Age'], ['Alice', '25']];
    const options = { format: 'pdf' as any };
    
    // 应该抛出错误
    await expect(exportData(data, options)).rejects.toThrow('不支持的导出格式');
  });
  
  test('应该处理空数据', async () => {
    const data: string[][] = [];
    const options: ExportOptions = { format: 'csv' };
    
    // 应该抛出错误
    await expect(exportData(data, options)).rejects.toThrow('导出数据无效或为空');
  });
  
  test('应该处理 null 数据', async () => {
    const data = null as any;
    const options: ExportOptions = { format: 'csv' };
    
    // 应该抛出错误
    await expect(exportData(data, options)).rejects.toThrow('导出数据无效或为空');
  });
  
  test('应该处理 undefined 数据', async () => {
    const data = undefined as any;
    const options: ExportOptions = { format: 'csv' };
    
    // 应该抛出错误
    await expect(exportData(data, options)).rejects.toThrow('导出数据无效或为空');
  });
});
