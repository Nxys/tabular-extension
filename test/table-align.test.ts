/**
 * 列对齐模块的单元测试
 * 
 * 验证：需求 2.4, 2.8
 */

import { alignTable, getDisplayWidth } from '../src/content/table/align';
import type { Table } from '../src/content/table/detect';

describe('列对齐单元测试', () => {
  describe('getDisplayWidth', () => {
    test('应该正确计算 ASCII 字符宽度', () => {
      expect(getDisplayWidth('a')).toBe(1);
      expect(getDisplayWidth('abc')).toBe(3);
      expect(getDisplayWidth('hello')).toBe(5);
      expect(getDisplayWidth('123')).toBe(3);
    });

    test('应该正确计算中文字符宽度', () => {
      expect(getDisplayWidth('中')).toBe(2);
      expect(getDisplayWidth('中文')).toBe(4);
      expect(getDisplayWidth('测试')).toBe(4);
      expect(getDisplayWidth('你好世界')).toBe(8);
    });

    test('应该正确计算混合中英文宽度', () => {
      expect(getDisplayWidth('a中')).toBe(3);
      expect(getDisplayWidth('hello世界')).toBe(9);
      expect(getDisplayWidth('测试abc')).toBe(7);
      expect(getDisplayWidth('中文test测试')).toBe(12);
    });

    test('应该正确处理空字符串', () => {
      expect(getDisplayWidth('')).toBe(0);
    });

    test('应该正确处理特殊字符', () => {
      expect(getDisplayWidth('!@#')).toBe(3);
      expect(getDisplayWidth('，。！')).toBe(6); // 中文标点
    });
  });

  describe('alignTable', () => {
    test('应该正确处理空表格', () => {
      const emptyTable1: Table = { columns: 0, rows: [] };
      const emptyTable2: Table = { columns: 3, rows: [] };
      
      expect(alignTable(emptyTable1)).toEqual([]);
      expect(alignTable(emptyTable2)).toEqual([]);
    });

    test('应该正确对齐纯 ASCII 文本表格', () => {
      const table: Table = {
        columns: 3,
        rows: [
          [
            { text: 'Name', col: 0 },
            { text: 'Age', col: 1 },
            { text: 'City', col: 2 }
          ],
          [
            { text: 'Alice', col: 0 },
            { text: '25', col: 1 },
            { text: 'NYC', col: 2 }
          ],
          [
            { text: 'Bob', col: 0 },
            { text: '30', col: 1 },
            { text: 'LA', col: 2 }
          ]
        ]
      };

      const aligned = alignTable(table);

      // 验证行数
      expect(aligned.length).toBe(3);

      // 验证每行列数
      expect(aligned[0].length).toBe(3);
      expect(aligned[1].length).toBe(3);
      expect(aligned[2].length).toBe(3);

      // 验证第一列宽度一致
      const col0Width = getDisplayWidth(aligned[0][0]);
      expect(getDisplayWidth(aligned[1][0])).toBe(col0Width);
      expect(getDisplayWidth(aligned[2][0])).toBe(col0Width);

      // 验证第二列宽度一致
      const col1Width = getDisplayWidth(aligned[0][1]);
      expect(getDisplayWidth(aligned[1][1])).toBe(col1Width);
      expect(getDisplayWidth(aligned[2][1])).toBe(col1Width);

      // 验证第三列宽度一致
      const col2Width = getDisplayWidth(aligned[0][2]);
      expect(getDisplayWidth(aligned[1][2])).toBe(col2Width);
      expect(getDisplayWidth(aligned[2][2])).toBe(col2Width);

      // 验证内容正确（去除空格后）
      expect(aligned[0][0].trim()).toBe('Name');
      expect(aligned[1][0].trim()).toBe('Alice');
      expect(aligned[2][0].trim()).toBe('Bob');
    });

    test('应该正确对齐中文字符表格', () => {
      const table: Table = {
        columns: 3,
        rows: [
          [
            { text: '姓名', col: 0 },
            { text: '年龄', col: 1 },
            { text: '城市', col: 2 }
          ],
          [
            { text: '张三', col: 0 },
            { text: '25', col: 1 },
            { text: '北京', col: 2 }
          ],
          [
            { text: '李四', col: 0 },
            { text: '30', col: 1 },
            { text: '上海', col: 2 }
          ]
        ]
      };

      const aligned = alignTable(table);

      // 验证行数和列数
      expect(aligned.length).toBe(3);
      expect(aligned[0].length).toBe(3);

      // 验证每列宽度一致
      const col0Width = getDisplayWidth(aligned[0][0]);
      expect(getDisplayWidth(aligned[1][0])).toBe(col0Width);
      expect(getDisplayWidth(aligned[2][0])).toBe(col0Width);

      // 验证中文字符宽度计算正确
      // "姓名" 应该占 4 个字符宽度
      expect(getDisplayWidth('姓名')).toBe(4);
      
      // 验证内容正确
      expect(aligned[0][0].trim()).toBe('姓名');
      expect(aligned[1][0].trim()).toBe('张三');
      expect(aligned[2][0].trim()).toBe('李四');
    });

    test('应该正确对齐混合中英文表格', () => {
      const table: Table = {
        columns: 3,
        rows: [
          [
            { text: 'Name', col: 0 },
            { text: '年龄', col: 1 },
            { text: 'City', col: 2 }
          ],
          [
            { text: '张三', col: 0 },
            { text: '25', col: 1 },
            { text: '北京', col: 2 }
          ],
          [
            { text: 'Bob', col: 0 },
            { text: '30', col: 1 },
            { text: 'LA', col: 2 }
          ]
        ]
      };

      const aligned = alignTable(table);

      // 验证行数和列数
      expect(aligned.length).toBe(3);
      expect(aligned[0].length).toBe(3);

      // 验证每列宽度一致
      for (let col = 0; col < 3; col++) {
        const colWidth = getDisplayWidth(aligned[0][col]);
        expect(getDisplayWidth(aligned[1][col])).toBe(colWidth);
        expect(getDisplayWidth(aligned[2][col])).toBe(colWidth);
      }

      // 验证内容正确
      expect(aligned[0][0].trim()).toBe('Name');
      expect(aligned[1][0].trim()).toBe('张三');
      expect(aligned[2][0].trim()).toBe('Bob');
    });

    test('应该在列之间添加适当的间距', () => {
      const table: Table = {
        columns: 2,
        rows: [
          [
            { text: 'A', col: 0 },
            { text: 'B', col: 1 }
          ]
        ]
      };

      const aligned = alignTable(table);

      // 验证第一列末尾至少有 2 个空格（列间距）
      expect(aligned[0][0].endsWith('  ')).toBe(true);
    });

    test('应该正确处理单列表格', () => {
      const table: Table = {
        columns: 1,
        rows: [
          [{ text: 'A', col: 0 }],
          [{ text: 'BB', col: 0 }],
          [{ text: 'CCC', col: 0 }]
        ]
      };

      const aligned = alignTable(table);

      // 验证行数和列数
      expect(aligned.length).toBe(3);
      expect(aligned[0].length).toBe(1);

      // 验证所有行的宽度一致
      const width = getDisplayWidth(aligned[0][0]);
      expect(getDisplayWidth(aligned[1][0])).toBe(width);
      expect(getDisplayWidth(aligned[2][0])).toBe(width);
    });

    test('应该正确处理单行表格', () => {
      const table: Table = {
        columns: 3,
        rows: [
          [
            { text: 'A', col: 0 },
            { text: 'B', col: 1 },
            { text: 'C', col: 2 }
          ]
        ]
      };

      const aligned = alignTable(table);

      // 验证行数和列数
      expect(aligned.length).toBe(1);
      expect(aligned[0].length).toBe(3);

      // 验证内容正确
      expect(aligned[0][0].trim()).toBe('A');
      expect(aligned[0][1].trim()).toBe('B');
      expect(aligned[0][2].trim()).toBe('C');
    });

    test('应该正确处理缺失单元格的行', () => {
      const table: Table = {
        columns: 3,
        rows: [
          [
            { text: 'A', col: 0 },
            { text: 'B', col: 1 },
            { text: 'C', col: 2 }
          ],
          [
            { text: 'D', col: 0 },
            // 缺失 col: 1
            { text: 'F', col: 2 }
          ]
        ]
      };

      const aligned = alignTable(table);

      // 验证行数和列数
      expect(aligned.length).toBe(2);
      expect(aligned[0].length).toBe(3);
      expect(aligned[1].length).toBe(3);

      // 验证缺失的单元格被填充为空字符串
      expect(aligned[1][1].trim()).toBe('');

      // 验证每列宽度一致
      for (let col = 0; col < 3; col++) {
        const colWidth = getDisplayWidth(aligned[0][col]);
        expect(getDisplayWidth(aligned[1][col])).toBe(colWidth);
      }
    });

    test('应该正确处理乱序的列索引', () => {
      const table: Table = {
        columns: 3,
        rows: [
          [
            { text: 'C', col: 2 },
            { text: 'A', col: 0 },
            { text: 'B', col: 1 }
          ]
        ]
      };

      const aligned = alignTable(table);

      // 验证列被正确排序
      expect(aligned[0][0].trim()).toBe('A');
      expect(aligned[0][1].trim()).toBe('B');
      expect(aligned[0][2].trim()).toBe('C');
    });
  });
});
