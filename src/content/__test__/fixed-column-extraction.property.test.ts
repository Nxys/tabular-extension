/**
 * 固定列数据提取和去重的属性测试
 * 
 * Feature: table-detection-enhancement
 * 
 * 测试固定列检测、数据提取和去重的正确性属性
 */

import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';
import { detectHTMLTable, detectFixedColumns, type UIFramework } from '../detector';

// 设置 JSDOM 环境
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document as unknown as Document;
global.window = dom.window as unknown as Window & typeof globalThis;

describe('固定列检测和数据提取属性测试', () => {
  /**
   * 属性 4：固定列识别完整性
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3**
   * 
   * 对于任何包含固定列（position: sticky 或固定列类名）的表格，
   * 检测器应该识别所有列包括固定列，并按视觉顺序排列。
   */
  test('属性 4：固定列识别完整性', () => {
    // 生成器：创建包含固定列的表格规格
    const arbitraryTableWithFixedColumns = fc.record({
      normalCols: fc.integer({ min: 1, max: 5 }),  // 普通列数
      fixedLeftCols: fc.integer({ min: 1, max: 3 }),  // 左固定列数
      fixedRightCols: fc.integer({ min: 0, max: 2 }),  // 右固定列数
      rows: fc.integer({ min: 2, max: 5 }),  // 行数
      framework: fc.constantFrom<UIFramework>('ant-design', 'element-ui', 'unknown')
    });

    fc.assert(
      fc.property(arbitraryTableWithFixedColumns, (spec) => {
        // 创建表格
        const table = document.createElement('table');
        const totalCols = spec.fixedLeftCols + spec.normalCols + spec.fixedRightCols;
        
        // 创建表头
        const headerRow = document.createElement('tr');
        
        // 左固定列
        for (let i = 0; i < spec.fixedLeftCols; i++) {
          const th = document.createElement('th');
          th.textContent = `左固定${i + 1}`;
          
          if (spec.framework === 'ant-design') {
            th.className = 'ant-table-cell ant-table-cell-fix-left';
          } else if (spec.framework === 'element-ui') {
            th.className = 'el-table-fixed-column';
          } else {
            th.style.position = 'sticky';
            th.style.left = `${i * 100}px`;
          }
          
          headerRow.appendChild(th);
        }
        
        // 普通列
        for (let i = 0; i < spec.normalCols; i++) {
          const th = document.createElement('th');
          th.textContent = `普通${i + 1}`;
          headerRow.appendChild(th);
        }
        
        // 右固定列
        for (let i = 0; i < spec.fixedRightCols; i++) {
          const th = document.createElement('th');
          th.textContent = `右固定${i + 1}`;
          
          if (spec.framework === 'ant-design') {
            th.className = 'ant-table-cell ant-table-cell-fix-right';
          } else {
            th.style.position = 'sticky';
            th.style.right = `${i * 100}px`;
          }
          
          headerRow.appendChild(th);
        }
        
        table.appendChild(headerRow);
        
        // 创建数据行
        for (let r = 0; r < spec.rows; r++) {
          const row = document.createElement('tr');
          
          for (let c = 0; c < totalCols; c++) {
            const td = document.createElement('td');
            td.textContent = `数据${r + 1}-${c + 1}`;
            
            // 复制表头的固定列样式
            if (c < spec.fixedLeftCols) {
              if (spec.framework === 'ant-design') {
                td.className = 'ant-table-cell ant-table-cell-fix-left';
              } else if (spec.framework === 'element-ui') {
                td.className = 'el-table-fixed-column';
              } else {
                td.style.position = 'sticky';
                td.style.left = `${c * 100}px`;
              }
            } else if (c >= spec.fixedLeftCols + spec.normalCols) {
              if (spec.framework === 'ant-design') {
                td.className = 'ant-table-cell ant-table-cell-fix-right';
              } else {
                td.style.position = 'sticky';
                td.style.right = `${(totalCols - c - 1) * 100}px`;
              }
            }
            
            row.appendChild(td);
          }
          
          table.appendChild(row);
        }
        
        document.body.appendChild(table);
        
        try {
          // 检测固定列
          const fixedColumns = detectFixedColumns(table, spec.framework);
          
          // 属性 1：应该识别所有固定列
          const expectedFixedCount = spec.fixedLeftCols + spec.fixedRightCols;
          expect(fixedColumns.length).toBe(expectedFixedCount);
          
          // 属性 2：固定列索引应该正确
          const leftIndices = fixedColumns
            .filter(fc => fc.position === 'left')
            .map(fc => fc.index);
          const rightIndices = fixedColumns
            .filter(fc => fc.position === 'right')
            .map(fc => fc.index);
          
          // 左固定列应该在前面
          leftIndices.forEach(idx => {
            expect(idx).toBeLessThan(spec.fixedLeftCols);
          });
          
          // 右固定列应该在后面
          rightIndices.forEach(idx => {
            expect(idx).toBeGreaterThanOrEqual(spec.fixedLeftCols + spec.normalCols);
          });
          
          // 检测表格
          const tableInfo = detectHTMLTable(table);
          
          if (tableInfo) {
            // 属性 3：应该标记为包含固定列
            expect(tableInfo.hasFixedColumns).toBe(true);
            
            // 属性 4：总列数应该正确
            expect(tableInfo.cols).toBe(totalCols);
            
            // 属性 5：数据应该按视觉顺序排列（从左到右）
            // 表头应该是：左固定列 -> 普通列 -> 右固定列
            const headerData = tableInfo.data[0];
            expect(headerData.length).toBe(totalCols);
            
            // 验证列顺序（通过文本内容）
            for (let i = 0; i < spec.fixedLeftCols; i++) {
              expect(headerData[i]).toContain('左固定');
            }
            
            for (let i = spec.fixedLeftCols; i < spec.fixedLeftCols + spec.normalCols; i++) {
              expect(headerData[i]).toContain('普通');
            }
            
            for (let i = spec.fixedLeftCols + spec.normalCols; i < totalCols; i++) {
              expect(headerData[i]).toContain('右固定');
            }
          }
        } finally {
          document.body.removeChild(table);
        }
      }),
      { numRuns: 50 }  // 运行 50 次测试
    );
  });

  /**
   * 属性 5：固定列去重正确性
   * 
   * **Validates: Requirements 2.4, 2.5**
   * 
   * 对于任何包含重叠固定列的表格，检测器应该去重并保留唯一的列数据，
   * 总列数计算正确。
   */
  test('属性 5：固定列去重正确性', () => {
    // 生成器：创建包含重叠固定列的表格规格
    const arbitraryTableWithOverlappingColumns = fc.integer({ min: 2, max: 5 }).chain(uniqueCols =>
      fc.record({
        uniqueCols: fc.constant(uniqueCols),
        duplicateCount: fc.integer({ min: 1, max: uniqueCols }),  // 重复列数不超过唯一列数
        rows: fc.integer({ min: 2, max: 5 })
      })
    );

    fc.assert(
      fc.property(arbitraryTableWithOverlappingColumns, (spec) => {
        // 创建表格，模拟固定列和普通列重叠的情况
        const table = document.createElement('table');
        
        // 创建表头
        const headerRow = document.createElement('tr');
        
        // 添加唯一列
        for (let i = 0; i < spec.uniqueCols; i++) {
          const th = document.createElement('th');
          th.textContent = `列${i + 1}`;
          
          // 前几列设置为固定列
          if (i < spec.duplicateCount) {
            th.className = 'ant-table-cell ant-table-cell-fix-left';
            th.style.position = 'sticky';
            th.style.left = `${i * 100}px`;
            
            // 模拟 X 坐标
            Object.defineProperty(th, 'getBoundingClientRect', {
              value: () => ({
                left: i * 100,
                top: 0,
                width: 100,
                height: 40,
                right: (i + 1) * 100,
                bottom: 40
              }),
              configurable: true
            });
          } else {
            // 模拟 X 坐标
            Object.defineProperty(th, 'getBoundingClientRect', {
              value: () => ({
                left: i * 100,
                top: 0,
                width: 100,
                height: 40,
                right: (i + 1) * 100,
                bottom: 40
              }),
              configurable: true
            });
          }
          
          headerRow.appendChild(th);
        }
        
        // 添加重复的固定列（模拟 DOM 中存在重复元素）
        for (let i = 0; i < spec.duplicateCount; i++) {
          const th = document.createElement('th');
          th.textContent = `列${i + 1}`;  // 与前面的列文本相同
          th.className = 'ant-table-cell ant-table-cell-fix-left';
          th.style.position = 'sticky';
          th.style.left = `${i * 100}px`;
          
          // 模拟相同的 X 坐标（重叠）
          Object.defineProperty(th, 'getBoundingClientRect', {
            value: () => ({
              left: i * 100,  // 与前面的列 X 坐标相同
              top: 0,
              width: 100,
              height: 40,
              right: (i + 1) * 100,
              bottom: 40
            }),
            configurable: true
          });
          
          headerRow.appendChild(th);
        }
        
        table.appendChild(headerRow);
        
        // 创建数据行
        for (let r = 0; r < spec.rows; r++) {
          const row = document.createElement('tr');
          
          // 唯一列
          for (let c = 0; c < spec.uniqueCols; c++) {
            const td = document.createElement('td');
            td.textContent = `数据${r + 1}-${c + 1}`;
            
            if (c < spec.duplicateCount) {
              td.className = 'ant-table-cell ant-table-cell-fix-left';
              td.style.position = 'sticky';
              td.style.left = `${c * 100}px`;
              
              Object.defineProperty(td, 'getBoundingClientRect', {
                value: () => ({
                  left: c * 100,
                  top: (r + 1) * 40,
                  width: 100,
                  height: 40,
                  right: (c + 1) * 100,
                  bottom: (r + 2) * 40
                }),
                configurable: true
              });
            } else {
              Object.defineProperty(td, 'getBoundingClientRect', {
                value: () => ({
                  left: c * 100,
                  top: (r + 1) * 40,
                  width: 100,
                  height: 40,
                  right: (c + 1) * 100,
                  bottom: (r + 2) * 40
                }),
                configurable: true
              });
            }
            
            row.appendChild(td);
          }
          
          // 重复列
          for (let c = 0; c < spec.duplicateCount; c++) {
            const td = document.createElement('td');
            td.textContent = `数据${r + 1}-${c + 1}`;  // 与前面的列文本相同
            td.className = 'ant-table-cell ant-table-cell-fix-left';
            td.style.position = 'sticky';
            td.style.left = `${c * 100}px`;
            
            Object.defineProperty(td, 'getBoundingClientRect', {
              value: () => ({
                left: c * 100,  // 与前面的列 X 坐标相同
                top: (r + 1) * 40,
                width: 100,
                height: 40,
                right: (c + 1) * 100,
                bottom: (r + 2) * 40
              }),
              configurable: true
            });
            
            row.appendChild(td);
          }
          
          table.appendChild(row);
        }
        
        document.body.appendChild(table);
        
        try {
          // 检测表格
          const tableInfo = detectHTMLTable(table);
          
          if (tableInfo) {
            // 属性 1：去重后的列数应该等于唯一列数
            expect(tableInfo.cols).toBe(spec.uniqueCols);
            
            // 属性 2：每行的数据长度应该等于唯一列数
            tableInfo.data.forEach(row => {
              expect(row.length).toBe(spec.uniqueCols);
            });
            
            // 属性 3：不应该有重复的列数据
            const headerData = tableInfo.data[0];
            const uniqueHeaders = new Set(headerData);
            expect(uniqueHeaders.size).toBe(spec.uniqueCols);
            
            // 属性 4：列应该按 X 坐标排序（从左到右）
            for (let i = 1; i < headerData.length; i++) {
              const prevColNum = parseInt(headerData[i - 1].match(/\d+/)?.[0] || '0');
              const currColNum = parseInt(headerData[i].match(/\d+/)?.[0] || '0');
              expect(currColNum).toBeGreaterThanOrEqual(prevColNum);
            }
          }
        } finally {
          document.body.removeChild(table);
        }
      }),
      { numRuns: 50 }  // 运行 50 次测试
    );
  });

  /**
   * 单元测试：验证固定列数据提取的具体场景
   */
  describe('固定列数据提取单元测试', () => {
    test('应该正确提取包含左固定列的表格数据', () => {
      const table = document.createElement('table');
      const headerRow = document.createElement('tr');
      
      // 创建表头
      const th1 = document.createElement('th');
      th1.className = 'ant-table-cell-fix-left';
      th1.textContent = '姓名';
      const th2 = document.createElement('th');
      th2.textContent = '年龄';
      const th3 = document.createElement('th');
      th3.textContent = '城市';
      
      headerRow.appendChild(th1);
      headerRow.appendChild(th2);
      headerRow.appendChild(th3);
      table.appendChild(headerRow);
      
      // 创建数据行
      const row1 = document.createElement('tr');
      const td11 = document.createElement('td');
      td11.className = 'ant-table-cell-fix-left';
      td11.textContent = 'Alice';
      const td12 = document.createElement('td');
      td12.textContent = '25';
      const td13 = document.createElement('td');
      td13.textContent = '北京';
      row1.appendChild(td11);
      row1.appendChild(td12);
      row1.appendChild(td13);
      table.appendChild(row1);
      
      const row2 = document.createElement('tr');
      const td21 = document.createElement('td');
      td21.className = 'ant-table-cell-fix-left';
      td21.textContent = 'Bob';
      const td22 = document.createElement('td');
      td22.textContent = '30';
      const td23 = document.createElement('td');
      td23.textContent = '上海';
      row2.appendChild(td21);
      row2.appendChild(td22);
      row2.appendChild(td23);
      table.appendChild(row2);
      
      document.body.appendChild(table);
      
      try {
        // 调试：检查固定列检测
        const fixedCols = detectFixedColumns(table, 'ant-design');
        console.log('Fixed columns detected:', fixedCols);
        
        const result = detectHTMLTable(table);
        console.log('Table info:', result);
        
        expect(result).not.toBeNull();
        expect(result!.hasFixedColumns).toBe(true);
        expect(result!.cols).toBe(3);
        expect(result!.rows).toBe(3);
        
        // 验证数据顺序
        expect(result!.data[0]).toEqual(['姓名', '年龄', '城市']);
        expect(result!.data[1]).toEqual(['Alice', '25', '北京']);
        expect(result!.data[2]).toEqual(['Bob', '30', '上海']);
      } finally {
        document.body.removeChild(table);
      }
    });

    test('应该正确提取包含左右固定列的表格数据', () => {
      const table = document.createElement('table');
      const headerRow = document.createElement('tr');
      
      // 创建表头
      const th1 = document.createElement('th');
      th1.className = 'ant-table-cell-fix-left';
      th1.textContent = '姓名';
      const th2 = document.createElement('th');
      th2.textContent = '年龄';
      const th3 = document.createElement('th');
      th3.textContent = '城市';
      const th4 = document.createElement('th');
      th4.className = 'ant-table-cell-fix-right';
      th4.textContent = '操作';
      
      headerRow.appendChild(th1);
      headerRow.appendChild(th2);
      headerRow.appendChild(th3);
      headerRow.appendChild(th4);
      table.appendChild(headerRow);
      
      // 创建数据行
      const row1 = document.createElement('tr');
      const td11 = document.createElement('td');
      td11.className = 'ant-table-cell-fix-left';
      td11.textContent = 'Alice';
      const td12 = document.createElement('td');
      td12.textContent = '25';
      const td13 = document.createElement('td');
      td13.textContent = '北京';
      const td14 = document.createElement('td');
      td14.className = 'ant-table-cell-fix-right';
      td14.textContent = '编辑';
      row1.appendChild(td11);
      row1.appendChild(td12);
      row1.appendChild(td13);
      row1.appendChild(td14);
      table.appendChild(row1);
      
      document.body.appendChild(table);
      
      try {
        const result = detectHTMLTable(table);
        
        expect(result).not.toBeNull();
        expect(result!.hasFixedColumns).toBe(true);
        expect(result!.cols).toBe(4);
        
        // 验证数据顺序（左固定 -> 普通 -> 右固定）
        expect(result!.data[0]).toEqual(['姓名', '年龄', '城市', '操作']);
        expect(result!.data[1]).toEqual(['Alice', '25', '北京', '编辑']);
      } finally {
        document.body.removeChild(table);
      }
    });

    test('应该正确处理没有固定列的表格', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tr>
          <th>姓名</th>
          <th>年龄</th>
        </tr>
        <tr>
          <td>Alice</td>
          <td>25</td>
        </tr>
      `;
      document.body.appendChild(table);
      
      try {
        const result = detectHTMLTable(table);
        
        expect(result).not.toBeNull();
        expect(result!.hasFixedColumns).toBe(false);
        expect(result!.cols).toBe(2);
        expect(result!.data[0]).toEqual(['姓名', '年龄']);
        expect(result!.data[1]).toEqual(['Alice', '25']);
      } finally {
        document.body.removeChild(table);
      }
    });
  });
});
