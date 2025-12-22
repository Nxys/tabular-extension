/**
 * CSV 导出模块的单元测试
 * 
 * 测试边界情况和具体场景
 * 需求：3.3, 3.4, 3.5
 */

import { toCSV, escapeCSVField } from '../src/content/table/csv';
import type { Table } from '../src/content/table/detect';

/**
 * 创建简单表格的辅助函数
 */
function createTable(data: string[][]): Table {
  const columns = data[0]?.length || 0;
  const rows = data.map((rowData) => {
    return rowData.map((text, colIndex) => ({
      text,
      col: colIndex
    }));
  });
  
  return {
    columns,
    rows
  };
}

describe('CSV 导出单元测试', () => {
  describe('边界情况', () => {
    test('空表格：列数为 0', () => {
      const table: Table = {
        columns: 0,
        rows: []
      };
      
      const csv = toCSV(table);
      
      expect(csv).toBe('');
    });

    test('空表格：行数为 0', () => {
      const table: Table = {
        columns: 3,
        rows: []
      };
      
      const csv = toCSV(table);
      
      expect(csv).toBe('');
    });

    test('单行单列表格', () => {
      const table = createTable([
        ['单元格']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('单元格');
    });

    test('单行多列表格', () => {
      const table = createTable([
        ['A', 'B', 'C']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('A,B,C');
    });

    test('多行单列表格', () => {
      const table = createTable([
        ['A'],
        ['B'],
        ['C']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('A\nB\nC');
    });
  });

  describe('简单文本导出', () => {
    test('两行两列表格', () => {
      const table = createTable([
        ['姓名', '年龄'],
        ['张三', '25']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('姓名,年龄\n张三,25');
    });

    test('三行三列表格', () => {
      const table = createTable([
        ['姓名', '年龄', '城市'],
        ['张三', '25', '北京'],
        ['李四', '30', '上海']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('姓名,年龄,城市\n张三,25,北京\n李四,30,上海');
    });

    test('包含空字符串的表格', () => {
      const table = createTable([
        ['A', '', 'C'],
        ['', 'B', ''],
        ['X', 'Y', 'Z']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('A,,C\n,B,\nX,Y,Z');
    });

    test('包含数字的表格', () => {
      const table = createTable([
        ['产品', '价格', '数量'],
        ['苹果', '5.5', '10'],
        ['香蕉', '3.2', '20']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('产品,价格,数量\n苹果,5.5,10\n香蕉,3.2,20');
    });
  });

  describe('引号转义', () => {
    test('字段包含单个引号', () => {
      const field = 'He said "Hello"';
      const escaped = escapeCSVField(field);
      
      expect(escaped).toBe('"He said ""Hello"""');
    });

    test('字段包含多个引号', () => {
      const field = '"A" and "B" and "C"';
      const escaped = escapeCSVField(field);
      
      expect(escaped).toBe('"""A"" and ""B"" and ""C"""');
    });

    test('表格中包含引号的字段', () => {
      const table = createTable([
        ['标题', '内容'],
        ['引用', 'He said "Hello"'],
        ['对话', '"Yes" or "No"']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('标题,内容\n引用,"He said ""Hello"""\n对话,"""Yes"" or ""No"""');
    });

    test('字段只包含引号', () => {
      const field = '"';
      const escaped = escapeCSVField(field);
      
      expect(escaped).toBe('""""');
    });

    test('字段包含连续引号', () => {
      const field = '""';
      const escaped = escapeCSVField(field);
      
      expect(escaped).toBe('""""""');
    });
  });

  describe('逗号处理', () => {
    test('字段包含单个逗号', () => {
      const field = 'A,B';
      const escaped = escapeCSVField(field);
      
      expect(escaped).toBe('"A,B"');
    });

    test('字段包含多个逗号', () => {
      const field = 'A,B,C,D';
      const escaped = escapeCSVField(field);
      
      expect(escaped).toBe('"A,B,C,D"');
    });

    test('表格中包含逗号的字段', () => {
      const table = createTable([
        ['名称', '标签'],
        ['产品A', 'tag1,tag2,tag3'],
        ['产品B', 'red,blue']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('名称,标签\n产品A,"tag1,tag2,tag3"\n产品B,"red,blue"');
    });

    test('字段只包含逗号', () => {
      const field = ',';
      const escaped = escapeCSVField(field);
      
      expect(escaped).toBe('","');
    });
  });

  describe('换行符处理', () => {
    test('字段包含 \\n 换行符', () => {
      const field = 'Line1\nLine2';
      const escaped = escapeCSVField(field);
      
      expect(escaped).toBe('"Line1\nLine2"');
    });

    test('字段包含 \\r\\n 换行符', () => {
      const field = 'Line1\r\nLine2';
      const escaped = escapeCSVField(field);
      
      expect(escaped).toBe('"Line1\r\nLine2"');
    });

    test('字段包含 \\r 换行符', () => {
      const field = 'Line1\rLine2';
      const escaped = escapeCSVField(field);
      
      expect(escaped).toBe('"Line1\rLine2"');
    });

    test('表格中包含换行符的字段', () => {
      const table = createTable([
        ['标题', '描述'],
        ['产品A', '第一行\n第二行'],
        ['产品B', '单行']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('标题,描述\n产品A,"第一行\n第二行"\n产品B,单行');
    });

    test('字段包含多个换行符', () => {
      const field = 'A\nB\nC\nD';
      const escaped = escapeCSVField(field);
      
      expect(escaped).toBe('"A\nB\nC\nD"');
    });
  });

  describe('混合特殊字符', () => {
    test('字段同时包含引号和逗号', () => {
      const field = 'He said "Hello", then left';
      const escaped = escapeCSVField(field);
      
      expect(escaped).toBe('"He said ""Hello"", then left"');
    });

    test('字段同时包含引号和换行符', () => {
      const field = 'He said "Hello"\nThen left';
      const escaped = escapeCSVField(field);
      
      expect(escaped).toBe('"He said ""Hello""\nThen left"');
    });

    test('字段同时包含逗号和换行符', () => {
      const field = 'A,B\nC,D';
      const escaped = escapeCSVField(field);
      
      expect(escaped).toBe('"A,B\nC,D"');
    });

    test('字段包含所有特殊字符', () => {
      const field = 'He said "Hello", then\nleft';
      const escaped = escapeCSVField(field);
      
      expect(escaped).toBe('"He said ""Hello"", then\nleft"');
    });

    test('表格中包含多种特殊字符', () => {
      const table = createTable([
        ['名称', '描述', '标签'],
        ['产品A', 'He said "Hello"', 'tag1,tag2'],
        ['产品B', '第一行\n第二行', 'red'],
        ['产品C', 'Quote: "X", Line\nBreak', 'a,b,c']
      ]);
      
      const csv = toCSV(table);
      
      const expected = [
        '名称,描述,标签',
        '产品A,"He said ""Hello""","tag1,tag2"',
        '产品B,"第一行\n第二行",red',
        '产品C,"Quote: ""X"", Line\nBreak","a,b,c"'
      ].join('\n');
      
      expect(csv).toBe(expected);
    });
  });

  describe('中文字符处理', () => {
    test('纯中文表格', () => {
      const table = createTable([
        ['姓名', '年龄', '城市'],
        ['张三', '二十五', '北京'],
        ['李四', '三十', '上海']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('姓名,年龄,城市\n张三,二十五,北京\n李四,三十,上海');
    });

    test('中英文混合表格', () => {
      const table = createTable([
        ['Name', '姓名', 'Age', '年龄'],
        ['Zhang San', '张三', '25', '二十五'],
        ['Li Si', '李四', '30', '三十']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('Name,姓名,Age,年龄\nZhang San,张三,25,二十五\nLi Si,李四,30,三十');
    });

    test('中文字段包含特殊字符', () => {
      const table = createTable([
        ['标题', '内容'],
        ['引用', '他说"你好"'],
        ['列表', '苹果,香蕉,橙子'],
        ['多行', '第一行\n第二行']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('标题,内容\n引用,"他说""你好"""\n列表,"苹果,香蕉,橙子"\n多行,"第一行\n第二行"');
    });
  });

  describe('不规则表格', () => {
    test('某些行缺少单元格', () => {
      const table: Table = {
        columns: 3,
        rows: [
          [
            { text: 'A', col: 0 },
            { text: 'B', col: 1 },
            { text: 'C', col: 2 }
          ],
          [
            { text: 'X', col: 0 },
            { text: 'Y', col: 1 }
            // 缺少列 2
          ],
          [
            { text: 'P', col: 0 },
            { text: 'Q', col: 1 },
            { text: 'R', col: 2 }
          ]
        ]
      };
      
      const csv = toCSV(table);
      
      expect(csv).toBe('A,B,C\nX,Y,\nP,Q,R');
    });

    test('单元格顺序不按列索引排列', () => {
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
      
      const csv = toCSV(table);
      
      // 应该按列索引排序
      expect(csv).toBe('A,B,C');
    });
  });

  describe('RFC 4180 标准符合性', () => {
    test('标准示例 1：简单字段', () => {
      const table = createTable([
        ['aaa', 'bbb', 'ccc'],
        ['zzz', 'yyy', 'xxx']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('aaa,bbb,ccc\nzzz,yyy,xxx');
    });

    test('标准示例 2：包含逗号的字段', () => {
      const table = createTable([
        ['aaa', 'b,bb', 'ccc']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('aaa,"b,bb",ccc');
    });

    test('标准示例 3：包含换行符的字段', () => {
      const table = createTable([
        ['aaa', 'b\nbb', 'ccc']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('aaa,"b\nbb",ccc');
    });

    test('标准示例 4：包含引号的字段', () => {
      const table = createTable([
        ['aaa', 'b"bb', 'ccc']
      ]);
      
      const csv = toCSV(table);
      
      expect(csv).toBe('aaa,"b""bb",ccc');
    });
  });
});
