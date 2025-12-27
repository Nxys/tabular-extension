/**
 * extractor.ts 单元测试
 * 测试文本提取、布局分析、格式化和表格功能
 */

import { collect, layout, format, detectTable, alignTable, toCSV, escapeCSVField } from '../extractor';
import type { TextItem, LayoutOptions, SelectionRect } from '../../shared/types';
import { createDOMRect, mockGetClientRects, mockComputedStyle } from '../../__test__/mocks/dom';

describe('extractor.ts - collect()', () => {
  beforeEach(() => {
    // 清理 DOM
    document.body.innerHTML = '';
  });

  describe('空输入处理', () => {
    it('应该返回空数组当选择区域内没有文本时', () => {
      // Arrange
      const selectionRect: SelectionRect = {
        left: 0,
        top: 0,
        right: 100,
        bottom: 100
      };

      // Act
      const result = collect(selectionRect);

      // Assert
      expect(result).toEqual([]);
    });

    it('应该返回空数组当选择区域外没有元素时', () => {
      // Arrange
      const div = document.createElement('div');
      div.textContent = 'Test';
      document.body.appendChild(div);

      // Mock 元素位置在选择区域外
      const rect = createDOMRect(200, 200, 50, 20);
      mockGetClientRects(div, [rect]);
      mockComputedStyle(div, {
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      } as CSSStyleDeclaration);

      const selectionRect: SelectionRect = {
        left: 0,
        top: 0,
        right: 100,
        bottom: 100
      };

      // Act
      const result = collect(selectionRect);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('单个文本元素', () => {
    it('应该采集单个文本元素', () => {
      // Arrange
      const div = document.createElement('div');
      div.textContent = 'Hello World';
      document.body.appendChild(div);

      // Mock 元素位置
      const rect = createDOMRect(10, 10, 100, 20);
      mockGetClientRects(div, [rect]);
      mockComputedStyle(div, {
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      } as CSSStyleDeclaration);

      const selectionRect: SelectionRect = {
        left: 0,
        top: 0,
        right: 200,
        bottom: 200
      };

      // Act
      const result = collect(selectionRect);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        text: 'Hello World',
        x: 10,
        y: 10,
        width: 100,
        height: 20
      });
    });
  });

  describe('多个文本元素', () => {
    it('应该采集多个文本元素', () => {
      // Arrange
      const div1 = document.createElement('div');
      div1.textContent = 'First';
      const div2 = document.createElement('div');
      div2.textContent = 'Second';
      const div3 = document.createElement('div');
      div3.textContent = 'Third';

      document.body.appendChild(div1);
      document.body.appendChild(div2);
      document.body.appendChild(div3);

      // Mock 元素位置
      const rect1 = createDOMRect(10, 10, 50, 20);
      const rect2 = createDOMRect(10, 40, 60, 20);
      const rect3 = createDOMRect(10, 70, 55, 20);

      mockGetClientRects(div1, [rect1]);
      mockGetClientRects(div2, [rect2]);
      mockGetClientRects(div3, [rect3]);

      mockComputedStyle(div1, {
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      } as CSSStyleDeclaration);
      mockComputedStyle(div2, {
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      } as CSSStyleDeclaration);
      mockComputedStyle(div3, {
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      } as CSSStyleDeclaration);

      const selectionRect: SelectionRect = {
        left: 0,
        top: 0,
        right: 200,
        bottom: 200
      };

      // Act
      const result = collect(selectionRect);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].text).toBe('First');
      expect(result[1].text).toBe('Second');
      expect(result[2].text).toBe('Third');
    });
  });

  describe('过滤不可见元素', () => {
    it('应该过滤 display:none 的元素', () => {
      // Arrange
      const div1 = document.createElement('div');
      div1.textContent = 'Visible';
      const div2 = document.createElement('div');
      div2.textContent = 'Hidden';

      document.body.appendChild(div1);
      document.body.appendChild(div2);

      const rect1 = createDOMRect(10, 10, 50, 20);
      const rect2 = createDOMRect(10, 40, 50, 20);

      mockGetClientRects(div1, [rect1]);
      mockGetClientRects(div2, [rect2]);

      mockComputedStyle(div1, {
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      } as CSSStyleDeclaration);
      mockComputedStyle(div2, {
        display: 'none',
        visibility: 'visible',
        opacity: '1'
      } as CSSStyleDeclaration);

      const selectionRect: SelectionRect = {
        left: 0,
        top: 0,
        right: 200,
        bottom: 200
      };

      // Act
      const result = collect(selectionRect);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Visible');
    });

    it('应该过滤 visibility:hidden 的元素', () => {
      // Arrange
      const div1 = document.createElement('div');
      div1.textContent = 'Visible';
      const div2 = document.createElement('div');
      div2.textContent = 'Hidden';

      document.body.appendChild(div1);
      document.body.appendChild(div2);

      const rect1 = createDOMRect(10, 10, 50, 20);
      const rect2 = createDOMRect(10, 40, 50, 20);

      mockGetClientRects(div1, [rect1]);
      mockGetClientRects(div2, [rect2]);

      mockComputedStyle(div1, {
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      } as CSSStyleDeclaration);
      mockComputedStyle(div2, {
        display: 'block',
        visibility: 'hidden',
        opacity: '1'
      } as CSSStyleDeclaration);

      const selectionRect: SelectionRect = {
        left: 0,
        top: 0,
        right: 200,
        bottom: 200
      };

      // Act
      const result = collect(selectionRect);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Visible');
    });

    it('应该过滤 opacity:0 的元素', () => {
      // Arrange
      const div1 = document.createElement('div');
      div1.textContent = 'Visible';
      const div2 = document.createElement('div');
      div2.textContent = 'Hidden';

      document.body.appendChild(div1);
      document.body.appendChild(div2);

      const rect1 = createDOMRect(10, 10, 50, 20);
      const rect2 = createDOMRect(10, 40, 50, 20);

      mockGetClientRects(div1, [rect1]);
      mockGetClientRects(div2, [rect2]);

      mockComputedStyle(div1, {
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      } as CSSStyleDeclaration);
      mockComputedStyle(div2, {
        display: 'block',
        visibility: 'visible',
        opacity: '0'
      } as CSSStyleDeclaration);

      const selectionRect: SelectionRect = {
        left: 0,
        top: 0,
        right: 200,
        bottom: 200
      };

      // Act
      const result = collect(selectionRect);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Visible');
    });

    it('应该过滤空文本节点', () => {
      // Arrange
      const div1 = document.createElement('div');
      div1.textContent = 'Content';
      const div2 = document.createElement('div');
      div2.textContent = '   '; // 只有空格

      document.body.appendChild(div1);
      document.body.appendChild(div2);

      const rect1 = createDOMRect(10, 10, 50, 20);
      const rect2 = createDOMRect(10, 40, 50, 20);

      mockGetClientRects(div1, [rect1]);
      mockGetClientRects(div2, [rect2]);

      mockComputedStyle(div1, {
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      } as CSSStyleDeclaration);
      mockComputedStyle(div2, {
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      } as CSSStyleDeclaration);

      const selectionRect: SelectionRect = {
        left: 0,
        top: 0,
        right: 200,
        bottom: 200
      };

      // Act
      const result = collect(selectionRect);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Content');
    });
  });
});


describe('extractor.ts - layout()', () => {
  describe('空输入处理', () => {
    it('应该返回空数组当输入为空数组时', () => {
      // Arrange
      const items: TextItem[] = [];
      const options: LayoutOptions = {
        lineThresholdRatio: 5,
        minHorizontalGap: 10
      };

      // Act
      const result = layout(items, options);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('单行文本', () => {
    it('应该将单个文本项放入一行', () => {
      // Arrange
      const items: TextItem[] = [
        { text: 'Hello', x: 10, y: 10, width: 50, height: 20 }
      ];
      const options: LayoutOptions = {
        lineThresholdRatio: 5,
        minHorizontalGap: 10
      };

      // Act
      const result = layout(items, options);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].text).toBe('Hello');
    });

    it('应该将同一行的多个文本项放入一行', () => {
      // Arrange
      const items: TextItem[] = [
        { text: 'Hello', x: 10, y: 10, width: 50, height: 20 },
        { text: 'World', x: 70, y: 12, width: 50, height: 20 }, // Y 坐标差异在阈值内
        { text: '!', x: 130, y: 11, width: 10, height: 20 }
      ];
      const options: LayoutOptions = {
        lineThresholdRatio: 5,
        minHorizontalGap: 10
      };

      // Act
      const result = layout(items, options);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(3);
      expect(result[0].map(item => item.text)).toEqual(['Hello', 'World', '!']);
    });
  });

  describe('多行文本', () => {
    it('应该将不同行的文本项分组到不同行', () => {
      // Arrange
      const items: TextItem[] = [
        { text: 'Line 1', x: 10, y: 10, width: 50, height: 20 },
        { text: 'Line 2', x: 10, y: 40, width: 50, height: 20 },
        { text: 'Line 3', x: 10, y: 70, width: 50, height: 20 }
      ];
      const options: LayoutOptions = {
        lineThresholdRatio: 5,
        minHorizontalGap: 10
      };

      // Act
      const result = layout(items, options);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0][0].text).toBe('Line 1');
      expect(result[1][0].text).toBe('Line 2');
      expect(result[2][0].text).toBe('Line 3');
    });

    it('应该正确处理混合的单行和多行文本', () => {
      // Arrange
      const items: TextItem[] = [
        { text: 'First', x: 10, y: 10, width: 50, height: 20 },
        { text: 'Line', x: 70, y: 12, width: 40, height: 20 },
        { text: 'Second', x: 10, y: 40, width: 60, height: 20 },
        { text: 'Third', x: 10, y: 70, width: 50, height: 20 },
        { text: 'Line', x: 70, y: 71, width: 40, height: 20 }
      ];
      const options: LayoutOptions = {
        lineThresholdRatio: 5,
        minHorizontalGap: 10
      };

      // Act
      const result = layout(items, options);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(2);
      expect(result[1]).toHaveLength(1);
      expect(result[2]).toHaveLength(2);
    });
  });

  describe('行内排序', () => {
    it('应该按 X 坐标对行内元素排序', () => {
      // Arrange - 故意打乱顺序
      const items: TextItem[] = [
        { text: 'Third', x: 130, y: 10, width: 50, height: 20 },
        { text: 'First', x: 10, y: 10, width: 50, height: 20 },
        { text: 'Second', x: 70, y: 10, width: 50, height: 20 }
      ];
      const options: LayoutOptions = {
        lineThresholdRatio: 5,
        minHorizontalGap: 10
      };

      // Act
      const result = layout(items, options);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].map(item => item.text)).toEqual(['First', 'Second', 'Third']);
    });
  });

  describe('行间排序', () => {
    it('应该按 Y 坐标对行排序', () => {
      // Arrange - 故意打乱顺序
      const items: TextItem[] = [
        { text: 'Line 3', x: 10, y: 70, width: 50, height: 20 },
        { text: 'Line 1', x: 10, y: 10, width: 50, height: 20 },
        { text: 'Line 2', x: 10, y: 40, width: 50, height: 20 }
      ];
      const options: LayoutOptions = {
        lineThresholdRatio: 5,
        minHorizontalGap: 10
      };

      // Act
      const result = layout(items, options);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0][0].text).toBe('Line 1');
      expect(result[1][0].text).toBe('Line 2');
      expect(result[2][0].text).toBe('Line 3');
    });

    it('应该同时正确处理行内和行间排序', () => {
      // Arrange - 完全打乱的顺序
      const items: TextItem[] = [
        { text: 'L2-B', x: 70, y: 40, width: 50, height: 20 },
        { text: 'L3-A', x: 10, y: 70, width: 50, height: 20 },
        { text: 'L1-C', x: 130, y: 10, width: 50, height: 20 },
        { text: 'L1-A', x: 10, y: 10, width: 50, height: 20 },
        { text: 'L2-A', x: 10, y: 40, width: 50, height: 20 },
        { text: 'L1-B', x: 70, y: 10, width: 50, height: 20 }
      ];
      const options: LayoutOptions = {
        lineThresholdRatio: 5,
        minHorizontalGap: 10
      };

      // Act
      const result = layout(items, options);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].map(item => item.text)).toEqual(['L1-A', 'L1-B', 'L1-C']);
      expect(result[1].map(item => item.text)).toEqual(['L2-A', 'L2-B']);
      expect(result[2].map(item => item.text)).toEqual(['L3-A']);
    });
  });
});


describe('extractor.ts - format()', () => {
  describe('空输入处理', () => {
    it('应该返回空字符串当输入为空数组时', () => {
      // Arrange
      const lines: TextItem[][] = [];

      // Act
      const result = format(lines);

      // Assert
      expect(result).toBe('');
    });

    it('应该跳过空行', () => {
      // Arrange
      const lines: TextItem[][] = [
        [],
        [{ text: 'Content', x: 10, y: 10, width: 50, height: 20 }],
        []
      ];

      // Act
      const result = format(lines);

      // Assert
      expect(result).toBe('Content');
    });
  });

  describe('单行格式化', () => {
    it('应该格式化单个文本项', () => {
      // Arrange
      const lines: TextItem[][] = [
        [{ text: 'Hello', x: 10, y: 10, width: 50, height: 20 }]
      ];

      // Act
      const result = format(lines);

      // Assert
      expect(result).toBe('Hello');
    });

    it('应该使用空格连接行内多个文本项', () => {
      // Arrange
      const lines: TextItem[][] = [
        [
          { text: 'Hello', x: 10, y: 10, width: 50, height: 20 },
          { text: 'World', x: 70, y: 10, width: 50, height: 20 },
          { text: '!', x: 130, y: 10, width: 10, height: 20 }
        ]
      ];

      // Act
      const result = format(lines);

      // Assert
      expect(result).toBe('Hello World !');
    });

    it('应该去除文本项的前后空格', () => {
      // Arrange
      const lines: TextItem[][] = [
        [
          { text: '  Hello  ', x: 10, y: 10, width: 50, height: 20 },
          { text: '  World  ', x: 70, y: 10, width: 50, height: 20 }
        ]
      ];

      // Act
      const result = format(lines);

      // Assert
      expect(result).toBe('Hello World');
    });

    it('应该跳过空文本项', () => {
      // Arrange
      const lines: TextItem[][] = [
        [
          { text: 'Hello', x: 10, y: 10, width: 50, height: 20 },
          { text: '   ', x: 70, y: 10, width: 50, height: 20 },
          { text: 'World', x: 130, y: 10, width: 50, height: 20 }
        ]
      ];

      // Act
      const result = format(lines);

      // Assert
      expect(result).toBe('Hello World');
    });
  });

  describe('多行格式化', () => {
    it('应该使用换行符连接多行', () => {
      // Arrange
      const lines: TextItem[][] = [
        [{ text: 'Line 1', x: 10, y: 10, width: 50, height: 20 }],
        [{ text: 'Line 2', x: 10, y: 40, width: 50, height: 20 }],
        [{ text: 'Line 3', x: 10, y: 70, width: 50, height: 20 }]
      ];

      // Act
      const result = format(lines);

      // Assert
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('应该正确格式化混合的单行和多行文本', () => {
      // Arrange
      const lines: TextItem[][] = [
        [
          { text: 'First', x: 10, y: 10, width: 50, height: 20 },
          { text: 'Line', x: 70, y: 10, width: 40, height: 20 }
        ],
        [{ text: 'Second', x: 10, y: 40, width: 60, height: 20 }],
        [
          { text: 'Third', x: 10, y: 70, width: 50, height: 20 },
          { text: 'Line', x: 70, y: 70, width: 40, height: 20 }
        ]
      ];

      // Act
      const result = format(lines);

      // Assert
      expect(result).toBe('First Line\nSecond\nThird Line');
    });
  });

  describe('空格连接', () => {
    it('应该在行内文本项之间添加空格', () => {
      // Arrange
      const lines: TextItem[][] = [
        [
          { text: 'A', x: 10, y: 10, width: 10, height: 20 },
          { text: 'B', x: 30, y: 10, width: 10, height: 20 },
          { text: 'C', x: 50, y: 10, width: 10, height: 20 }
        ]
      ];

      // Act
      const result = format(lines);

      // Assert
      expect(result).toBe('A B C');
    });

    it('应该处理包含空格的文本项', () => {
      // Arrange
      const lines: TextItem[][] = [
        [
          { text: 'Hello World', x: 10, y: 10, width: 100, height: 20 },
          { text: 'Foo Bar', x: 120, y: 10, width: 80, height: 20 }
        ]
      ];

      // Act
      const result = format(lines);

      // Assert
      expect(result).toBe('Hello World Foo Bar');
    });
  });
});


describe('extractor.ts - 表格功能', () => {
  describe('detectTable() - 空输入处理', () => {
    it('应该返回空表格当输入为空数组时', () => {
      // Arrange
      const lines: TextItem[][] = [];

      // Act
      const result = detectTable(lines);

      // Assert
      expect(result).toEqual({
        columns: 0,
        rows: []
      });
    });

    it('应该返回空表格当所有行都为空时', () => {
      // Arrange
      const lines: TextItem[][] = [[], [], []];

      // Act
      const result = detectTable(lines);

      // Assert
      expect(result).toEqual({
        columns: 0,
        rows: []
      });
    });
  });

  describe('detectTable() - 列聚类', () => {
    it('应该识别单列表格', () => {
      // Arrange
      const lines: TextItem[][] = [
        [{ text: 'A1', x: 10, y: 10, width: 50, height: 20 }],
        [{ text: 'A2', x: 12, y: 40, width: 50, height: 20 }],
        [{ text: 'A3', x: 11, y: 70, width: 50, height: 20 }]
      ];

      // Act
      const result = detectTable(lines);

      // Assert
      expect(result.columns).toBe(1);
      expect(result.rows).toHaveLength(3);
    });

    it('应该识别多列表格', () => {
      // Arrange
      const lines: TextItem[][] = [
        [
          { text: 'A1', x: 10, y: 10, width: 50, height: 20 },
          { text: 'B1', x: 100, y: 10, width: 50, height: 20 },
          { text: 'C1', x: 200, y: 10, width: 50, height: 20 }
        ],
        [
          { text: 'A2', x: 12, y: 40, width: 50, height: 20 },
          { text: 'B2', x: 102, y: 40, width: 50, height: 20 },
          { text: 'C2', x: 198, y: 40, width: 50, height: 20 }
        ]
      ];

      // Act
      const result = detectTable(lines);

      // Assert
      expect(result.columns).toBe(3);
      expect(result.rows).toHaveLength(2);
    });

    it('应该正确分配单元格到列', () => {
      // Arrange
      const lines: TextItem[][] = [
        [
          { text: 'A1', x: 10, y: 10, width: 50, height: 20 },
          { text: 'B1', x: 100, y: 10, width: 50, height: 20 }
        ],
        [
          { text: 'A2', x: 12, y: 40, width: 50, height: 20 },
          { text: 'B2', x: 102, y: 40, width: 50, height: 20 }
        ]
      ];

      // Act
      const result = detectTable(lines);

      // Assert
      expect(result.rows[0][0].col).toBe(0);
      expect(result.rows[0][1].col).toBe(1);
      expect(result.rows[1][0].col).toBe(0);
      expect(result.rows[1][1].col).toBe(1);
    });
  });

  describe('alignTable() - 列对齐计算', () => {
    it('应该返回空数组当表格为空时', () => {
      // Arrange
      const table = {
        columns: 0,
        rows: []
      };

      // Act
      const result = alignTable(table);

      // Assert
      expect(result).toEqual([]);
    });

    it('应该对齐单列表格', () => {
      // Arrange
      const table = {
        columns: 1,
        rows: [
          [{ text: 'Short', col: 0 }],
          [{ text: 'LongerText', col: 0 }],
          [{ text: 'Mid', col: 0 }]
        ]
      };

      // Act
      const result = alignTable(table);

      // Assert
      expect(result).toHaveLength(3);
      // 所有行应该对齐到最长的文本
      expect(result[0][0]).toContain('Short');
      expect(result[1][0]).toContain('LongerText');
      expect(result[2][0]).toContain('Mid');
    });

    it('应该对齐多列表格', () => {
      // Arrange
      const table = {
        columns: 2,
        rows: [
          [
            { text: 'A', col: 0 },
            { text: 'B', col: 1 }
          ],
          [
            { text: 'LongA', col: 0 },
            { text: 'LongB', col: 1 }
          ]
        ]
      };

      // Act
      const result = alignTable(table);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(2);
      expect(result[1]).toHaveLength(2);
      // 第一列应该对齐到 'LongA' 的宽度
      expect(result[0][0].length).toBeGreaterThan('A'.length);
    });

    it('应该处理缺失的单元格', () => {
      // Arrange
      const table = {
        columns: 3,
        rows: [
          [
            { text: 'A1', col: 0 },
            { text: 'B1', col: 1 }
            // 缺少 C1
          ],
          [
            { text: 'A2', col: 0 },
            { text: 'B2', col: 1 },
            { text: 'C2', col: 2 }
          ]
        ]
      };

      // Act
      const result = alignTable(table);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(3);
      expect(result[1]).toHaveLength(3);
      // 缺失的单元格应该用空格填充
      expect(result[0][2].trim()).toBe('');
    });
  });

  describe('escapeCSVField() - CSV 转义', () => {
    it('应该不转义普通文本', () => {
      // Arrange
      const text = 'Normal text';

      // Act
      const result = escapeCSVField(text);

      // Assert
      expect(result).toBe('Normal text');
    });

    it('应该转义包含逗号的文本', () => {
      // Arrange
      const text = 'Text, with comma';

      // Act
      const result = escapeCSVField(text);

      // Assert
      expect(result).toBe('"Text, with comma"');
    });

    it('应该转义包含双引号的文本', () => {
      // Arrange
      const text = 'Text with "quotes"';

      // Act
      const result = escapeCSVField(text);

      // Assert
      expect(result).toBe('"Text with ""quotes"""');
    });

    it('应该转义包含换行符的文本', () => {
      // Arrange
      const text = 'Text\nwith\nnewlines';

      // Act
      const result = escapeCSVField(text);

      // Assert
      expect(result).toBe('"Text\nwith\nnewlines"');
    });

    it('应该转义包含回车符的文本', () => {
      // Arrange
      const text = 'Text\rwith\rcarriage';

      // Act
      const result = escapeCSVField(text);

      // Assert
      expect(result).toBe('"Text\rwith\rcarriage"');
    });

    it('应该转义包含多种特殊字符的文本', () => {
      // Arrange
      const text = 'Complex, "text"\nwith all';

      // Act
      const result = escapeCSVField(text);

      // Assert
      expect(result).toBe('"Complex, ""text""\nwith all"');
    });
  });

  describe('toCSV() - 格式化', () => {
    it('应该返回空字符串当表格为空时', () => {
      // Arrange
      const table = {
        columns: 0,
        rows: []
      };

      // Act
      const result = toCSV(table);

      // Assert
      expect(result).toBe('');
    });

    it('应该格式化单行单列表格', () => {
      // Arrange
      const table = {
        columns: 1,
        rows: [
          [{ text: 'A1', col: 0 }]
        ]
      };

      // Act
      const result = toCSV(table);

      // Assert
      expect(result).toBe('A1');
    });

    it('应该格式化多行单列表格', () => {
      // Arrange
      const table = {
        columns: 1,
        rows: [
          [{ text: 'A1', col: 0 }],
          [{ text: 'A2', col: 0 }],
          [{ text: 'A3', col: 0 }]
        ]
      };

      // Act
      const result = toCSV(table);

      // Assert
      expect(result).toBe('A1\nA2\nA3');
    });

    it('应该格式化多行多列表格', () => {
      // Arrange
      const table = {
        columns: 3,
        rows: [
          [
            { text: 'A1', col: 0 },
            { text: 'B1', col: 1 },
            { text: 'C1', col: 2 }
          ],
          [
            { text: 'A2', col: 0 },
            { text: 'B2', col: 1 },
            { text: 'C2', col: 2 }
          ]
        ]
      };

      // Act
      const result = toCSV(table);

      // Assert
      expect(result).toBe('A1,B1,C1\nA2,B2,C2');
    });

    it('应该正确转义特殊字符', () => {
      // Arrange
      const table = {
        columns: 2,
        rows: [
          [
            { text: 'Normal', col: 0 },
            { text: 'With, comma', col: 1 }
          ],
          [
            { text: 'With "quotes"', col: 0 },
            { text: 'With\nnewline', col: 1 }
          ]
        ]
      };

      // Act
      const result = toCSV(table);

      // Assert
      expect(result).toBe('Normal,"With, comma"\n"With ""quotes""","With\nnewline"');
    });

    it('应该处理缺失的单元格', () => {
      // Arrange
      const table = {
        columns: 3,
        rows: [
          [
            { text: 'A1', col: 0 },
            { text: 'B1', col: 1 }
            // 缺少 C1
          ],
          [
            { text: 'A2', col: 0 },
            { text: 'B2', col: 1 },
            { text: 'C2', col: 2 }
          ]
        ]
      };

      // Act
      const result = toCSV(table);

      // Assert
      expect(result).toBe('A1,B1,\nA2,B2,C2');
    });
  });
});
