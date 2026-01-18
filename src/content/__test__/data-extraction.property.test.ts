/**
 * 数据提取属性测试
 * 
 * Feature: table-detection-enhancement
 * Property 7: 文本提取完整性
 * Property 13: 空单元格占位保留
 * Property 14: 合并单元格处理正确性
 * Property 15: 特殊字符处理正确性
 * Property 16: 文本清理一致性
 * 
 * **验证：需求 3.2, 7.1, 7.2, 7.3, 7.4, 7.5**
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import fc from 'fast-check';
import { detectHTMLTable, TableDetectionConfig } from '../detector';

describe('数据提取属性测试', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const defaultConfig: TableDetectionConfig = {
    minRows: 1,
    minCols: 2,
    alignmentThreshold: 5,
    gridGapTolerance: 10,
    detectEmptyTables: true,
    filterAuxiliaryRows: true,
    detectFixedColumns: true,
    penetrateNesting: true
  };

  describe('属性 7：文本提取完整性', () => {
    it('对于任何表格单元格，无论其内部 DOM 结构多复杂，检测器应该提取所有可见文本内容并合并', () => {
      fc.assert(
        fc.property(
          fc.record({
            rows: fc.integer({ min: 2, max: 5 }),
            cols: fc.integer({ min: 2, max: 5 }),
            hasNestedElements: fc.boolean()
          }),
          (spec) => {
            // 创建表格
            const table = document.createElement('table');
            const thead = document.createElement('thead');
            const tbody = document.createElement('tbody');

            // 创建表头
            const headerRow = document.createElement('tr');
            for (let c = 0; c < spec.cols; c++) {
              const th = document.createElement('th');
              th.textContent = `列${c + 1}`;
              headerRow.appendChild(th);
            }
            thead.appendChild(headerRow);

            // 创建数据行
            for (let r = 0; r < spec.rows - 1; r++) {
              const row = document.createElement('tr');
              for (let c = 0; c < spec.cols; c++) {
                const td = document.createElement('td');
                
                if (spec.hasNestedElements) {
                  // 复杂 DOM 结构
                  const span1 = document.createElement('span');
                  span1.textContent = '文本1';
                  const span2 = document.createElement('span');
                  span2.textContent = '文本2';
                  td.appendChild(span1);
                  td.appendChild(span2);
                } else {
                  // 简单文本
                  td.textContent = `数据${r}-${c}`;
                }
                
                row.appendChild(td);
              }
              tbody.appendChild(row);
            }

            table.appendChild(thead);
            table.appendChild(tbody);
            document.body.appendChild(table);

            // 检测表格
            const result = detectHTMLTable(table, defaultConfig);

            // 验证
            expect(result).not.toBeNull();
            if (result) {
              expect(result.rows).toBe(spec.rows);
              expect(result.cols).toBe(spec.cols);
              expect(result.data.length).toBe(spec.rows);

              // 验证每个单元格都有文本（不为 undefined 或 null）
              result.data.forEach(row => {
                expect(row.length).toBe(spec.cols);
                row.forEach(cell => {
                  expect(typeof cell).toBe('string');
                });
              });

              // 如果有嵌套元素，验证文本被合并
              if (spec.hasNestedElements) {
                result.data.slice(1).forEach(row => {
                  row.forEach(cell => {
                    expect(cell).toContain('文本1');
                    expect(cell).toContain('文本2');
                  });
                });
              }
            }

            // 清理
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('属性 13：空单元格占位保留', () => {
    it('对于任何包含空单元格的表格，检测器应该在数据数组中保留空字符串占位，保持列对齐', () => {
      fc.assert(
        fc.property(
          fc.record({
            rows: fc.integer({ min: 2, max: 5 }),
            cols: fc.integer({ min: 2, max: 5 }),
            emptyCellRatio: fc.double({ min: 0, max: 0.5 })
          }),
          (spec) => {
            // 创建表格
            const table = document.createElement('table');
            const thead = document.createElement('thead');
            const tbody = document.createElement('tbody');

            // 创建表头
            const headerRow = document.createElement('tr');
            for (let c = 0; c < spec.cols; c++) {
              const th = document.createElement('th');
              th.textContent = `列${c + 1}`;
              headerRow.appendChild(th);
            }
            thead.appendChild(headerRow);

            // 创建数据行，随机留空一些单元格
            for (let r = 0; r < spec.rows - 1; r++) {
              const row = document.createElement('tr');
              for (let c = 0; c < spec.cols; c++) {
                const td = document.createElement('td');
                
                // 根据比例决定是否留空
                if (Math.random() > spec.emptyCellRatio) {
                  td.textContent = `数据${r}-${c}`;
                }
                // 否则留空（不设置 textContent）
                
                row.appendChild(td);
              }
              tbody.appendChild(row);
            }

            table.appendChild(thead);
            table.appendChild(tbody);
            document.body.appendChild(table);

            // 检测表格
            const result = detectHTMLTable(table, defaultConfig);

            // 验证
            expect(result).not.toBeNull();
            if (result) {
              expect(result.rows).toBe(spec.rows);
              expect(result.cols).toBe(spec.cols);

              // 验证每行的列数一致
              result.data.forEach(row => {
                expect(row.length).toBe(spec.cols);
              });

              // 验证空单元格用空字符串占位
              result.data.forEach(row => {
                row.forEach(cell => {
                  expect(typeof cell).toBe('string');
                  // 空单元格应该是空字符串，不是 undefined 或 null
                });
              });
            }

            // 清理
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('属性 14：合并单元格处理正确性', () => {
    it('对于任何包含 colspan 或 rowspan 的表格，检测器应该正确处理合并单元格的数据提取', () => {
      // 创建包含 colspan 的表格
      const table1 = document.createElement('table');
      table1.innerHTML = `
        <thead>
          <tr>
            <th>列1</th>
            <th>列2</th>
            <th>列3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="2">合并列</td>
            <td>数据3</td>
          </tr>
          <tr>
            <td>数据1</td>
            <td>数据2</td>
            <td>数据3</td>
          </tr>
        </tbody>
      `;
      document.body.appendChild(table1);

      const result1 = detectHTMLTable(table1, defaultConfig);
      expect(result1).not.toBeNull();
      if (result1) {
        expect(result1.rows).toBe(3);
        expect(result1.cols).toBe(3);
        expect(result1.data[1].length).toBe(3);  // 合并列应该填充为 3 列
        expect(result1.data[1][0]).toBe('合并列');
        expect(result1.data[1][1]).toBe('');  // colspan 的额外列用空字符串填充
        expect(result1.data[1][2]).toBe('数据3');
      }

      document.body.innerHTML = '';

      // 创建包含 rowspan 的表格
      const table2 = document.createElement('table');
      table2.innerHTML = `
        <thead>
          <tr>
            <th>列1</th>
            <th>列2</th>
            <th>列3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowspan="2">合并行</td>
            <td>数据2</td>
            <td>数据3</td>
          </tr>
          <tr>
            <td>数据2</td>
            <td>数据3</td>
          </tr>
        </tbody>
      `;
      document.body.appendChild(table2);

      const result2 = detectHTMLTable(table2, defaultConfig);
      expect(result2).not.toBeNull();
      if (result2) {
        expect(result2.rows).toBe(3);
        expect(result2.cols).toBe(3);
        expect(result2.data[1].length).toBe(3);
        expect(result2.data[2].length).toBe(3);
        expect(result2.data[1][0]).toBe('合并行');
        expect(result2.data[2][0]).toBe('合并行');  // rowspan 应该填充到下一行
      }
    });
  });

  describe('属性 15：特殊字符处理正确性', () => {
    it('对于任何包含特殊字符（换行符、制表符）的单元格，检测器应该保留或规范化这些字符', () => {
      fc.assert(
        fc.property(
          fc.record({
            hasNewline: fc.boolean(),
            hasTab: fc.boolean(),
            hasMultipleSpaces: fc.boolean()
          }),
          (spec) => {
            // 创建表格
            const table = document.createElement('table');
            const thead = document.createElement('thead');
            const tbody = document.createElement('tbody');

            // 创建表头（至少2列）
            const headerRow = document.createElement('tr');
            const th1 = document.createElement('th');
            th1.textContent = '列1';
            const th2 = document.createElement('th');
            th2.textContent = '列2';
            headerRow.appendChild(th1);
            headerRow.appendChild(th2);
            thead.appendChild(headerRow);

            // 创建数据行，包含特殊字符
            const row = document.createElement('tr');
            const td1 = document.createElement('td');
            
            let text = '文本内容';  // 确保有实际内容
            if (spec.hasNewline) {
              text += '\n换行';
            }
            if (spec.hasTab) {
              text += '\t制表符';
            }
            if (spec.hasMultipleSpaces) {
              text += '   多个空格';
            }
            
            td1.textContent = text;
            const td2 = document.createElement('td');
            td2.textContent = '数据2';
            row.appendChild(td1);
            row.appendChild(td2);
            tbody.appendChild(row);

            table.appendChild(thead);
            table.appendChild(tbody);
            document.body.appendChild(table);

            // 检测表格
            const result = detectHTMLTable(table, defaultConfig);

            // 验证
            expect(result).not.toBeNull();
            if (result) {
              expect(result.rows).toBe(2);
              expect(result.data[1][0]).toBeTruthy();
              
              // 验证特殊字符被规范化为单个空格
              const cellText = result.data[1][0];
              expect(cellText).not.toContain('\n');
              expect(cellText).not.toContain('\t');
              expect(cellText).not.toMatch(/\s{2,}/);  // 不应该有连续多个空格
            }

            // 清理
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('属性 16：文本清理一致性', () => {
    it('对于任何单元格文本，检测器应该去除首尾空白字符，保持数据整洁', () => {
      fc.assert(
        fc.property(
          fc.record({
            leadingSpaces: fc.integer({ min: 0, max: 5 }),
            trailingSpaces: fc.integer({ min: 0, max: 5 }),
            content: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0)  // 确保有实际内容
          }),
          (spec) => {
            // 创建表格
            const table = document.createElement('table');
            const thead = document.createElement('thead');
            const tbody = document.createElement('tbody');

            // 创建表头（至少2列）
            const headerRow = document.createElement('tr');
            const th1 = document.createElement('th');
            th1.textContent = '列1';
            const th2 = document.createElement('th');
            th2.textContent = '列2';
            headerRow.appendChild(th1);
            headerRow.appendChild(th2);
            thead.appendChild(headerRow);

            // 创建数据行，包含首尾空白
            const row = document.createElement('tr');
            const td1 = document.createElement('td');
            
            const leadingSpaces = ' '.repeat(spec.leadingSpaces);
            const trailingSpaces = ' '.repeat(spec.trailingSpaces);
            td1.textContent = leadingSpaces + spec.content + trailingSpaces;
            
            const td2 = document.createElement('td');
            td2.textContent = '数据2';
            row.appendChild(td1);
            row.appendChild(td2);
            tbody.appendChild(row);

            table.appendChild(thead);
            table.appendChild(tbody);
            document.body.appendChild(table);

            // 检测表格
            const result = detectHTMLTable(table, defaultConfig);

            // 验证
            expect(result).not.toBeNull();
            if (result) {
              expect(result.rows).toBe(2);
              const cellText = result.data[1][0];
              
              // 验证首尾空白被去除
              expect(cellText).toBe(spec.content.trim());
              
              // 验证没有首尾空格
              if (cellText.length > 0) {
                expect(cellText[0]).not.toBe(' ');
                expect(cellText[cellText.length - 1]).not.toBe(' ');
              }
            }

            // 清理
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
