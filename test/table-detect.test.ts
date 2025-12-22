/**
 * 表格检测模块的单元测试
 * 
 * 测试边界情况和具体场景
 * 需求：1.4, 1.5, 1.6
 */

import { detectTable } from '../src/content/table/detect';
import { TextItem } from '../src/content/extractor/collect';

/**
 * 创建 DOMRect 辅助函数
 */
function createDOMRect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({})
  } as DOMRect;
}

/**
 * 创建 TextItem 辅助函数
 */
function createTextItem(text: string, x: number, y: number, width: number = 50, height: number = 20): TextItem {
  return {
    text,
    rect: createDOMRect(x, y, width, height)
  };
}

describe('表格检测单元测试', () => {
  describe('边界情况', () => {
    test('空输入：空数组', () => {
      const lines: TextItem[][] = [];
      const table = detectTable(lines);
      
      expect(table.columns).toBe(0);
      expect(table.rows).toEqual([]);
    });

    test('空输入：包含空行的数组', () => {
      const lines: TextItem[][] = [[], [], []];
      const table = detectTable(lines);
      
      expect(table.columns).toBe(0);
      expect(table.rows).toEqual([]);
    });

    test('单列表格：所有文本在同一列', () => {
      const lines: TextItem[][] = [
        [createTextItem('标题', 100, 0)],
        [createTextItem('内容1', 105, 30)],
        [createTextItem('内容2', 95, 60)],
        [createTextItem('内容3', 102, 90)]
      ];
      
      const table = detectTable(lines);
      
      // 应该识别为单列
      expect(table.columns).toBe(1);
      expect(table.rows.length).toBe(4);
      
      // 所有单元格应该在列 0
      for (const row of table.rows) {
        expect(row.length).toBe(1);
        expect(row[0].col).toBe(0);
      }
    });
  });

  describe('多列表格', () => {
    test('两列表格：简单场景', () => {
      const lines: TextItem[][] = [
        [
          createTextItem('姓名', 50, 0),
          createTextItem('年龄', 200, 0)
        ],
        [
          createTextItem('张三', 50, 30),
          createTextItem('25', 200, 30)
        ],
        [
          createTextItem('李四', 50, 60),
          createTextItem('30', 200, 60)
        ]
      ];
      
      const table = detectTable(lines);
      
      expect(table.columns).toBe(2);
      expect(table.rows.length).toBe(3);
      
      // 验证每行有两个单元格
      for (const row of table.rows) {
        expect(row.length).toBe(2);
      }
      
      // 验证列分配正确
      expect(table.rows[0][0].text).toBe('姓名');
      expect(table.rows[0][0].col).toBe(0);
      expect(table.rows[0][1].text).toBe('年龄');
      expect(table.rows[0][1].col).toBe(1);
    });

    test('三列表格', () => {
      const lines: TextItem[][] = [
        [
          createTextItem('姓名', 50, 0),
          createTextItem('年龄', 200, 0),
          createTextItem('城市', 350, 0)
        ],
        [
          createTextItem('张三', 50, 30),
          createTextItem('25', 200, 30),
          createTextItem('北京', 350, 30)
        ]
      ];
      
      const table = detectTable(lines);
      
      expect(table.columns).toBe(3);
      expect(table.rows.length).toBe(2);
      
      // 验证列分配
      expect(table.rows[0][0].col).toBe(0);
      expect(table.rows[0][1].col).toBe(1);
      expect(table.rows[0][2].col).toBe(2);
    });

    test('四列表格', () => {
      const lines: TextItem[][] = [
        [
          createTextItem('A', 50, 0),
          createTextItem('B', 150, 0),
          createTextItem('C', 250, 0),
          createTextItem('D', 350, 0)
        ]
      ];
      
      const table = detectTable(lines);
      
      expect(table.columns).toBe(4);
      expect(table.rows.length).toBe(1);
    });

    test('五列表格', () => {
      const lines: TextItem[][] = [
        [
          createTextItem('A', 50, 0),
          createTextItem('B', 130, 0),
          createTextItem('C', 210, 0),
          createTextItem('D', 290, 0),
          createTextItem('E', 370, 0)
        ]
      ];
      
      const table = detectTable(lines);
      
      expect(table.columns).toBe(5);
      expect(table.rows.length).toBe(1);
    });
  });

  describe('列对齐偏移容差', () => {
    test('列内小偏移（< 20px）应该被识别为同一列', () => {
      const lines: TextItem[][] = [
        [
          createTextItem('姓名', 50, 0),
          createTextItem('年龄', 200, 0)
        ],
        [
          createTextItem('张三', 55, 30),  // X 偏移 +5px
          createTextItem('25', 205, 30)    // X 偏移 +5px
        ],
        [
          createTextItem('李四', 45, 60),  // X 偏移 -5px
          createTextItem('30', 195, 60)    // X 偏移 -5px
        ],
        [
          createTextItem('王五', 52, 90),  // X 偏移 +2px
          createTextItem('28', 198, 90)    // X 偏移 -2px
        ]
      ];
      
      const table = detectTable(lines);
      
      // 应该识别为两列，而不是因为偏移而分裂成更多列
      expect(table.columns).toBe(2);
      expect(table.rows.length).toBe(4);
      
      // 验证每行都有两个单元格
      for (const row of table.rows) {
        expect(row.length).toBe(2);
      }
    });

    test('列内较大偏移（接近 20px）仍应识别为同一列', () => {
      const lines: TextItem[][] = [
        [
          createTextItem('A', 100, 0),
          createTextItem('B', 300, 0)
        ],
        [
          createTextItem('C', 115, 30),  // X 偏移 +15px
          createTextItem('D', 285, 30)   // X 偏移 -15px
        ],
        [
          createTextItem('E', 105, 60),  // X 偏移 +5px
          createTextItem('F', 310, 60)   // X 偏移 +10px
        ]
      ];
      
      const table = detectTable(lines);
      
      expect(table.columns).toBe(2);
      expect(table.rows.length).toBe(3);
    });
  });

  describe('真实场景模拟', () => {
    test('不规则表格：某些行缺少单元格', () => {
      const lines: TextItem[][] = [
        [
          createTextItem('姓名', 50, 0),
          createTextItem('年龄', 200, 0),
          createTextItem('城市', 350, 0)
        ],
        [
          createTextItem('张三', 50, 30),
          createTextItem('25', 200, 30)
          // 缺少城市
        ],
        [
          createTextItem('李四', 50, 60),
          createTextItem('30', 200, 60),
          createTextItem('上海', 350, 60)
        ]
      ];
      
      const table = detectTable(lines);
      
      // 应该识别为三列
      expect(table.columns).toBe(3);
      expect(table.rows.length).toBe(3);
      
      // 第一行和第三行有 3 个单元格
      expect(table.rows[0].length).toBe(3);
      expect(table.rows[2].length).toBe(3);
      
      // 第二行只有 2 个单元格
      expect(table.rows[1].length).toBe(2);
    });

    test('混合宽度的单元格', () => {
      const lines: TextItem[][] = [
        [
          createTextItem('短', 50, 0, 20),
          createTextItem('这是一个很长的标题', 200, 0, 80)  // 减小宽度，使中心点更接近左边缘
        ],
        [
          createTextItem('A', 50, 30, 20),
          createTextItem('内容', 200, 30, 40)
        ]
      ];
      
      const table = detectTable(lines);
      
      expect(table.columns).toBe(2);
      expect(table.rows.length).toBe(2);
    });
  });

  describe('输入不变性', () => {
    test('detectTable 不应修改输入数据', () => {
      const lines: TextItem[][] = [
        [
          createTextItem('A', 50, 0),
          createTextItem('B', 200, 0)
        ],
        [
          createTextItem('C', 50, 30),
          createTextItem('D', 200, 30)
        ]
      ];
      
      // 深度克隆
      const originalLines = JSON.parse(JSON.stringify(lines));
      
      // 执行检测
      detectTable(lines);
      
      // 验证输入未被修改
      expect(JSON.stringify(lines)).toBe(JSON.stringify(originalLines));
    });
  });
});
