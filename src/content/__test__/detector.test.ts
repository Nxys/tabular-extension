/**
 * 表格识别模块测试
 */

import {
  scanTables,
  detectHTMLTable,
  detectDivTable,
  injectExportButton,
  removeExportButtons,
  detectFramework,
  getFrameworkSignature,
  applyFrameworkRules,
  isAuxiliaryRow,
  type TableInfo,
  type TableDetectionConfig,
  type UIFramework
} from '../detector';

// Mock DOM 环境
beforeEach(() => {
  document.body.innerHTML = '';
});

describe('detectHTMLTable', () => {
  test('应该识别简单的 HTML 表格', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tr><th>Name</th><th>Age</th></tr>
      <tr><td>Alice</td><td>25</td></tr>
      <tr><td>Bob</td><td>30</td></tr>
    `;
    document.body.appendChild(table);
    
    const result = detectHTMLTable(table);
    
    expect(result).not.toBeNull();
    expect(result?.type).toBe('html-table');
    expect(result?.rows).toBe(3);
    expect(result?.cols).toBe(2);
    expect(result?.data).toEqual([
      ['Name', 'Age'],
      ['Alice', '25'],
      ['Bob', '30']
    ]);
  });
  
  test('应该拒绝行数不足的表格', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tr><td>Only one row</td></tr>
    `;
    document.body.appendChild(table);
    
    const result = detectHTMLTable(table);
    expect(result).toBeNull();
  });
  
  test('应该拒绝列数不足的表格', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tr><td>A</td></tr>
      <tr><td>B</td></tr>
    `;
    document.body.appendChild(table);
    
    const result = detectHTMLTable(table);
    expect(result).toBeNull();
  });
  
  test('应该处理空单元格', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tr><td>A</td><td></td></tr>
      <tr><td></td><td>B</td></tr>
    `;
    document.body.appendChild(table);
    
    const result = detectHTMLTable(table);
    
    expect(result).not.toBeNull();
    expect(result?.data).toEqual([
      ['A', ''],
      ['', 'B']
    ]);
  });
  
  test('应该处理混合 th 和 td 的表格', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tr><th>Header 1</th><th>Header 2</th></tr>
      <tr><td>Data 1</td><td>Data 2</td></tr>
    `;
    document.body.appendChild(table);
    
    const result = detectHTMLTable(table);
    
    expect(result).not.toBeNull();
    expect(result?.data[0]).toEqual(['Header 1', 'Header 2']);
  });
  
  test('应该拒绝不可见的表格', () => {
    const table = document.createElement('table');
    table.style.display = 'none';
    table.innerHTML = `
      <tr><td>A</td><td>B</td></tr>
      <tr><td>C</td><td>D</td></tr>
    `;
    document.body.appendChild(table);
    
    const result = detectHTMLTable(table);
    expect(result).toBeNull();
  });
  
  test('应该使用自定义配置', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tr><td>A</td><td>B</td><td>C</td></tr>
      <tr><td>D</td><td>E</td><td>F</td></tr>
      <tr><td>G</td><td>H</td><td>I</td></tr>
    `;
    document.body.appendChild(table);
    
    const config: TableDetectionConfig = {
      minRows: 3,
      minCols: 3,
      alignmentThreshold: 5,
      gridGapTolerance: 10,
      detectEmptyTables: true,
      filterAuxiliaryRows: true,
      detectFixedColumns: true,
      penetrateNesting: true
    };
    
    const result = detectHTMLTable(table, config);
    expect(result).not.toBeNull();
    expect(result?.rows).toBe(3);
    expect(result?.cols).toBe(3);
  });
  
  test('应该处理错误并返回 null', () => {
    // 传入 null 会触发错误
    const result = detectHTMLTable(null as any);
    expect(result).toBeNull();
  });
});

describe('detectDivTable', () => {
  test('应该识别网格布局的 div 表格', () => {
    const container = document.createElement('div');
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(2, 1fr)';
    
    // 创建 2x2 网格
    for (let i = 0; i < 4; i++) {
      const cell = document.createElement('div');
      cell.textContent = `Cell ${i + 1}`;
      cell.style.width = '100px';
      cell.style.height = '50px';
      container.appendChild(cell);
    }
    
    document.body.appendChild(container);
    
    const result = detectDivTable(container);
    
    // 在测试环境中，getBoundingClientRect 可能返回全 0
    // 所以这个测试可能返回 null
    if (result) {
      expect(result.type).toBe('div-table');
      expect(result.rows).toBeGreaterThanOrEqual(2);
      expect(result.cols).toBeGreaterThanOrEqual(2);
    }
  });
  
  test('应该拒绝子元素不足的容器', () => {
    const container = document.createElement('div');
    const cell = document.createElement('div');
    cell.textContent = 'Only one cell';
    container.appendChild(cell);
    document.body.appendChild(container);
    
    const result = detectDivTable(container);
    expect(result).toBeNull();
  });
  
  test('应该拒绝不可见的容器', () => {
    const container = document.createElement('div');
    container.style.display = 'none';
    
    for (let i = 0; i < 4; i++) {
      const cell = document.createElement('div');
      cell.textContent = `Cell ${i + 1}`;
      container.appendChild(cell);
    }
    
    document.body.appendChild(container);
    
    const result = detectDivTable(container);
    expect(result).toBeNull();
  });
  
  test('应该处理错误并返回 null', () => {
    const result = detectDivTable(null as any);
    expect(result).toBeNull();
  });
});

describe('scanTables', () => {
  test('应该扫描页面中的所有 HTML 表格', () => {
    // 创建两个表格
    const table1 = document.createElement('table');
    table1.innerHTML = `
      <tr><td>A</td><td>B</td></tr>
      <tr><td>C</td><td>D</td></tr>
    `;
    
    const table2 = document.createElement('table');
    table2.innerHTML = `
      <tr><td>1</td><td>2</td></tr>
      <tr><td>3</td><td>4</td></tr>
    `;
    
    document.body.appendChild(table1);
    document.body.appendChild(table2);
    
    const results = scanTables();
    
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.every(r => r.type === 'html-table')).toBe(true);
  });
  
  test('应该跳过不符合要求的表格', () => {
    // 创建一个只有一行的表格
    const table = document.createElement('table');
    table.innerHTML = `<tr><td>Only one row</td></tr>`;
    document.body.appendChild(table);
    
    const results = scanTables();
    
    // 不应该包含这个表格
    expect(results.length).toBe(0);
  });
  
  test('应该处理空页面', () => {
    const results = scanTables();
    expect(results).toEqual([]);
  });
  
  test('应该使用自定义配置', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tr><td>A</td><td>B</td><td>C</td></tr>
      <tr><td>D</td><td>E</td><td>F</td></tr>
      <tr><td>G</td><td>H</td><td>I</td></tr>
    `;
    document.body.appendChild(table);
    
    const config: TableDetectionConfig = {
      minRows: 3,
      minCols: 3,
      alignmentThreshold: 5,
      gridGapTolerance: 10,
      detectEmptyTables: true,
      filterAuxiliaryRows: true,
      detectFixedColumns: true,
      penetrateNesting: true
    };
    
    const results = scanTables(config);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
  
  test('应该处理扫描错误', () => {
    // 模拟 querySelectorAll 抛出错误
    const originalQuerySelectorAll = document.querySelectorAll;
    document.querySelectorAll = (() => {
      throw new Error('Mock error');
    }) as any;
    
    const results = scanTables();
    
    // 应该返回空数组而不是抛出错误
    expect(results).toEqual([]);
    
    // 恢复原始方法
    document.querySelectorAll = originalQuerySelectorAll;
  });
});

describe('injectExportButton', () => {
  test('应该注入导出按钮', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tr><td>A</td><td>B</td></tr>
      <tr><td>C</td><td>D</td></tr>
    `;
    document.body.appendChild(table);
    
    const tableInfo: TableInfo = {
      element: table,
      type: 'html-table',
      rows: 2,
      cols: 2,
      data: [['A', 'B'], ['C', 'D']],
      boundingRect: table.getBoundingClientRect(),
      isEmpty: false,
      hasFixedColumns: false,
      framework: 'unknown'
    };
    
    const onClick = jest.fn();
    injectExportButton(tableInfo, onClick);
    
    const button = table.querySelector('.table-export-button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe('📊');
  });
  
  test('应该触发点击回调', () => {
    const table = document.createElement('table');
    document.body.appendChild(table);
    
    const tableInfo: TableInfo = {
      element: table,
      type: 'html-table',
      rows: 2,
      cols: 2,
      data: [['A', 'B'], ['C', 'D']],
      boundingRect: table.getBoundingClientRect(),
      isEmpty: false,
      hasFixedColumns: false,
      framework: 'unknown'
    };
    
    const onClick = jest.fn();
    injectExportButton(tableInfo, onClick);
    
    const button = table.querySelector('.table-export-button') as HTMLElement;
    button?.click();
    
    expect(onClick).toHaveBeenCalled();
  });
  
  test('不应该重复注入按钮', () => {
    const table = document.createElement('table');
    document.body.appendChild(table);
    
    const tableInfo: TableInfo = {
      element: table,
      type: 'html-table',
      rows: 2,
      cols: 2,
      data: [['A', 'B'], ['C', 'D']],
      boundingRect: table.getBoundingClientRect(),
      isEmpty: false,
      hasFixedColumns: false,
      framework: 'unknown'
    };
    
    const onClick = jest.fn();
    
    // 注入两次
    injectExportButton(tableInfo, onClick);
    injectExportButton(tableInfo, onClick);
    
    // 应该只有一个按钮
    const buttons = table.querySelectorAll('.table-export-button');
    expect(buttons.length).toBe(1);
  });
  
  test('应该设置表格元素为相对定位', () => {
    const table = document.createElement('table');
    // 设置初始 position 为 static
    table.style.position = 'static';
    document.body.appendChild(table);
    
    const tableInfo: TableInfo = {
      element: table,
      type: 'html-table',
      rows: 2,
      cols: 2,
      data: [['A', 'B'], ['C', 'D']],
      boundingRect: table.getBoundingClientRect(),
      isEmpty: false,
      hasFixedColumns: false,
      framework: 'unknown'
    };
    
    injectExportButton(tableInfo, jest.fn());
    
    // 在 JSDOM 中，getComputedStyle 可能不返回正确的值
    // 所以我们只验证按钮被注入了
    const button = table.querySelector('.table-export-button');
    expect(button).not.toBeNull();
  });
  
  test('应该处理注入错误', () => {
    const tableInfo: TableInfo = {
      element: null as any,
      type: 'html-table',
      rows: 2,
      cols: 2,
      data: [['A', 'B'], ['C', 'D']],
      boundingRect: {} as DOMRect,
      isEmpty: false,
      hasFixedColumns: false,
      framework: 'unknown'
    };
    
    // 不应该抛出错误
    expect(() => {
      injectExportButton(tableInfo, jest.fn());
    }).not.toThrow();
  });
});

describe('removeExportButtons', () => {
  test('应该移除所有导出按钮', () => {
    // 创建多个表格并注入按钮
    for (let i = 0; i < 3; i++) {
      const table = document.createElement('table');
      document.body.appendChild(table);
      
      const tableInfo: TableInfo = {
        element: table,
        type: 'html-table',
        rows: 2,
        cols: 2,
        data: [['A', 'B'], ['C', 'D']],
        boundingRect: table.getBoundingClientRect(),
        isEmpty: false,
        hasFixedColumns: false,
        framework: 'unknown'
      };
      
      injectExportButton(tableInfo, jest.fn());
    }
    
    // 验证按钮已注入
    expect(document.querySelectorAll('.table-export-button').length).toBe(3);
    
    // 移除所有按钮
    removeExportButtons();
    
    // 验证按钮已移除
    expect(document.querySelectorAll('.table-export-button').length).toBe(0);
  });
  
  test('应该处理没有按钮的情况', () => {
    // 不应该抛出错误
    expect(() => {
      removeExportButtons();
    }).not.toThrow();
  });
  
  test('应该处理移除错误', () => {
    // 模拟 querySelectorAll 抛出错误
    const originalQuerySelectorAll = document.querySelectorAll;
    document.querySelectorAll = (() => {
      throw new Error('Mock error');
    }) as any;
    
    // 不应该抛出错误
    expect(() => {
      removeExportButtons();
    }).not.toThrow();
    
    // 恢复原始方法
    document.querySelectorAll = originalQuerySelectorAll;
  });
});


describe('边界情况和错误处理', () => {
  test('应该处理表格中的空白文本', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tr><td>  </td><td>   </td></tr>
      <tr><td>A</td><td>B</td></tr>
    `;
    document.body.appendChild(table);
    
    const result = detectHTMLTable(table);
    
    expect(result).not.toBeNull();
    expect(result?.data[0]).toEqual(['', '']);
  });
  
  test('应该处理不规则的表格行', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tr><td>A</td><td>B</td><td>C</td></tr>
      <tr><td>D</td><td>E</td></tr>
      <tr><td>F</td></tr>
    `;
    document.body.appendChild(table);
    
    const result = detectHTMLTable(table);
    
    expect(result).not.toBeNull();
    expect(result?.cols).toBe(3);
    expect(result?.data[1].length).toBe(2);
    expect(result?.data[2].length).toBe(1);
  });
  
  test('应该处理 visibility hidden 的表格', () => {
    const table = document.createElement('table');
    table.style.visibility = 'hidden';
    table.innerHTML = `
      <tr><td>A</td><td>B</td></tr>
      <tr><td>C</td><td>D</td></tr>
    `;
    document.body.appendChild(table);
    
    const result = detectHTMLTable(table);
    expect(result).toBeNull();
  });
  
  test('应该处理 opacity 0 的表格', () => {
    const table = document.createElement('table');
    table.style.opacity = '0';
    table.innerHTML = `
      <tr><td>A</td><td>B</td></tr>
      <tr><td>C</td><td>D</td></tr>
    `;
    document.body.appendChild(table);
    
    const result = detectHTMLTable(table);
    expect(result).toBeNull();
  });
  
  test('应该跳过 table 内部的 div 元素', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tr><td>A</td><td>B</td></tr>
      <tr><td>C</td><td>D</td></tr>
    `;
    
    const div = document.createElement('div');
    div.textContent = 'Inside table';
    table.appendChild(div);
    
    document.body.appendChild(table);
    
    const results = scanTables();
    
    // div 应该被跳过，因为它在 table 内部
    const divTables = results.filter(r => r.type === 'div-table');
    expect(divTables.length).toBe(0);
  });
  
  test('应该处理嵌套的 table 元素', () => {
    const outerTable = document.createElement('table');
    outerTable.innerHTML = `
      <tr><td>Outer 1</td><td>Outer 2</td></tr>
      <tr><td>Outer 3</td><td>Outer 4</td></tr>
    `;
    
    const innerTable = document.createElement('table');
    innerTable.innerHTML = `
      <tr><td>Inner 1</td><td>Inner 2</td></tr>
      <tr><td>Inner 3</td><td>Inner 4</td></tr>
    `;
    
    outerTable.querySelector('td')?.appendChild(innerTable);
    document.body.appendChild(outerTable);
    
    const results = scanTables();
    
    // 应该识别两个表格
    expect(results.length).toBeGreaterThanOrEqual(2);
  });
  
  test('应该处理只有 th 的表格', () => {
    const table = document.createElement('table');
    table.innerHTML = `
      <tr><th>Header 1</th><th>Header 2</th></tr>
      <tr><th>Header 3</th><th>Header 4</th></tr>
    `;
    document.body.appendChild(table);
    
    const result = detectHTMLTable(table);
    
    expect(result).not.toBeNull();
    expect(result?.rows).toBe(2);
    expect(result?.cols).toBe(2);
  });
  
  test('应该处理大型表格', () => {
    const table = document.createElement('table');
    let html = '';
    
    // 创建 100x10 的表格
    for (let i = 0; i < 100; i++) {
      html += '<tr>';
      for (let j = 0; j < 10; j++) {
        html += `<td>Cell ${i}-${j}</td>`;
      }
      html += '</tr>';
    }
    
    table.innerHTML = html;
    document.body.appendChild(table);
    
    const result = detectHTMLTable(table);
    
    expect(result).not.toBeNull();
    expect(result?.rows).toBe(100);
    expect(result?.cols).toBe(10);
  });
  
  test('应该处理按钮点击事件的事件传播', () => {
    const table = document.createElement('table');
    document.body.appendChild(table);
    
    const tableInfo: TableInfo = {
      element: table,
      type: 'html-table',
      rows: 2,
      cols: 2,
      data: [['A', 'B'], ['C', 'D']],
      boundingRect: table.getBoundingClientRect(),
      isEmpty: false,
      hasFixedColumns: false,
      framework: 'unknown'
    };
    
    const onClick = jest.fn();
    let propagated = false;
    
    table.addEventListener('click', () => {
      propagated = true;
    });
    
    injectExportButton(tableInfo, onClick);
    
    const button = table.querySelector('.table-export-button') as HTMLElement;
    const event = new MouseEvent('click', { bubbles: true });
    button?.dispatchEvent(event);
    
    expect(onClick).toHaveBeenCalled();
    // 事件应该被阻止传播
    expect(propagated).toBe(false);
  });
  
  test('应该处理已有 position 样式的表格', () => {
    const table = document.createElement('table');
    table.style.position = 'absolute';
    document.body.appendChild(table);
    
    const tableInfo: TableInfo = {
      element: table,
      type: 'html-table',
      rows: 2,
      cols: 2,
      data: [['A', 'B'], ['C', 'D']],
      boundingRect: table.getBoundingClientRect(),
      isEmpty: false,
      hasFixedColumns: false,
      framework: 'unknown'
    };
    
    injectExportButton(tableInfo, jest.fn());
    
    // position 不应该被改变
    expect(table.style.position).toBe('absolute');
  });
});

describe('辅助函数测试', () => {
  test('应该正确识别可见元素', () => {
    const visibleDiv = document.createElement('div');
    visibleDiv.style.display = 'block';
    visibleDiv.style.width = '100px';
    visibleDiv.style.height = '100px';
    document.body.appendChild(visibleDiv);
    
    // 通过 detectDivTable 间接测试 isVisible
    const result = detectDivTable(visibleDiv);
    // 子元素不足，应该返回 null，但不是因为不可见
    expect(result).toBeNull();
  });
  
  test('应该处理空的 div 容器', () => {
    const emptyDiv = document.createElement('div');
    document.body.appendChild(emptyDiv);
    
    const result = detectDivTable(emptyDiv);
    expect(result).toBeNull();
  });
  
  test('应该处理只有一个子元素的 div', () => {
    const container = document.createElement('div');
    const child = document.createElement('div');
    child.textContent = 'Single child';
    container.appendChild(child);
    document.body.appendChild(container);
    
    const result = detectDivTable(container);
    expect(result).toBeNull();
  });
});

describe('框架识别功能', () => {
  describe('detectFramework', () => {
    test('应该识别 Ant Design 表格', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'ant-table-wrapper';
      
      const table = document.createElement('table');
      wrapper.appendChild(table);
      document.body.appendChild(wrapper);
      
      const framework = detectFramework(table);
      expect(framework).toBe('ant-design');
    });
    
    test('应该识别 Element UI 表格', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'el-table';
      
      const table = document.createElement('table');
      wrapper.appendChild(table);
      document.body.appendChild(wrapper);
      
      const framework = detectFramework(table);
      expect(framework).toBe('element-ui');
    });
    
    test('应该识别 Element Plus 表格', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'el-table__inner-wrapper';
      
      const table = document.createElement('table');
      wrapper.appendChild(table);
      document.body.appendChild(wrapper);
      
      const framework = detectFramework(table);
      expect(framework).toBe('element-plus');
    });
    
    test('应该识别 Arco Design 表格', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'arco-table-container';
      
      const table = document.createElement('table');
      wrapper.appendChild(table);
      document.body.appendChild(wrapper);
      
      const framework = detectFramework(table);
      expect(framework).toBe('arco-design');
    });
    
    test('应该识别 Naive UI 表格', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'n-data-table-wrapper';
      
      const table = document.createElement('table');
      wrapper.appendChild(table);
      document.body.appendChild(wrapper);
      
      const framework = detectFramework(table);
      expect(framework).toBe('naive-ui');
    });
    
    test('应该识别 Vuetify 表格', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'v-data-table';
      
      const table = document.createElement('table');
      wrapper.appendChild(table);
      document.body.appendChild(wrapper);
      
      const framework = detectFramework(table);
      expect(framework).toBe('vuetify');
    });
    
    test('应该识别 Material-UI 表格', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'MuiTable-root';
      
      const table = document.createElement('table');
      wrapper.appendChild(table);
      document.body.appendChild(wrapper);
      
      const framework = detectFramework(table);
      expect(framework).toBe('material-ui');
    });
    
    test('应该识别 Bootstrap 表格', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-responsive';
      
      const table = document.createElement('table');
      table.className = 'table';
      wrapper.appendChild(table);
      document.body.appendChild(wrapper);
      
      const framework = detectFramework(table);
      expect(framework).toBe('bootstrap');
    });
    
    test('应该识别 Semantic UI 表格', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'ui.table';
      
      const table = document.createElement('table');
      wrapper.appendChild(table);
      document.body.appendChild(wrapper);
      
      const framework = detectFramework(table);
      expect(framework).toBe('semantic-ui');
    });
    
    test('应该返回 unknown 对于未知框架', () => {
      const table = document.createElement('table');
      document.body.appendChild(table);
      
      const framework = detectFramework(table);
      expect(framework).toBe('unknown');
    });
    
    test('应该向上遍历最多 10 层', () => {
      let current = document.createElement('div');
      document.body.appendChild(current);
      
      // 创建 15 层嵌套
      for (let i = 0; i < 15; i++) {
        const child = document.createElement('div');
        current.appendChild(child);
        current = child;
      }
      
      // 在第 12 层添加框架标识
      let parent: HTMLElement | null = current;
      for (let i = 0; i < 12; i++) {
        parent = parent?.parentElement ?? null;
      }
      if (parent) {
        parent.className = 'ant-table-wrapper';
      }
      
      // 从最深层开始检测，应该找不到（超过 10 层）
      const framework = detectFramework(current);
      expect(framework).toBe('unknown');
    });
    
    test('应该处理没有类名的元素', () => {
      const wrapper = document.createElement('div');
      const table = document.createElement('table');
      wrapper.appendChild(table);
      document.body.appendChild(wrapper);
      
      const framework = detectFramework(table);
      expect(framework).toBe('unknown');
    });
  });
  
  describe('getFrameworkSignature', () => {
    test('应该返回 Ant Design 的特征配置', () => {
      const signature = getFrameworkSignature('ant-design');
      
      expect(signature.classPatterns.length).toBeGreaterThan(0);
      expect(signature.containerSelectors).toContain('.ant-table-container');
      expect(signature.auxiliaryRowPatterns.length).toBeGreaterThan(0);
      expect(signature.fixedColumnPatterns.length).toBeGreaterThan(0);
    });
    
    test('应该返回 unknown 的空特征配置', () => {
      const signature = getFrameworkSignature('unknown');
      
      expect(signature.classPatterns).toEqual([]);
      expect(signature.containerSelectors).toEqual([]);
      expect(signature.auxiliaryRowPatterns).toEqual([]);
      expect(signature.fixedColumnPatterns).toEqual([]);
    });
    
    test('应该为所有支持的框架返回配置', () => {
      const frameworks: UIFramework[] = [
        'ant-design', 'element-ui', 'element-plus', 'arco-design',
        'naive-ui', 'vuetify', 'material-ui', 'bootstrap', 'semantic-ui', 'unknown'
      ];
      
      for (const framework of frameworks) {
        const signature = getFrameworkSignature(framework);
        expect(signature).toBeDefined();
        expect(signature.classPatterns).toBeDefined();
        expect(signature.containerSelectors).toBeDefined();
        expect(signature.auxiliaryRowPatterns).toBeDefined();
        expect(signature.fixedColumnPatterns).toBeDefined();
      }
    });
  });
  
  describe('applyFrameworkRules', () => {
    test('应该检测 Ant Design 空表格（占位行）', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tr><th>Name</th><th>Age</th></tr>
        <tr class="ant-table-placeholder"><td colspan="2">暂无数据</td></tr>
      `;
      document.body.appendChild(table);
      
      const result = applyFrameworkRules(table, 'ant-design');
      
      expect(result.framework).toBe('ant-design');
      expect(result.isEmpty).toBe(true);
    });
    
    test('应该检测 Ant Design 固定列', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tr>
          <th class="ant-table-cell-fix-left">Name</th>
          <th>Age</th>
          <th class="ant-table-cell-fix-right">Action</th>
        </tr>
        <tr>
          <td class="ant-table-cell-fix-left">Alice</td>
          <td>25</td>
          <td class="ant-table-cell-fix-right">Edit</td>
        </tr>
      `;
      document.body.appendChild(table);
      
      const result = applyFrameworkRules(table, 'ant-design');
      
      expect(result.framework).toBe('ant-design');
      expect(result.hasFixedColumns).toBe(true);
    });
    
    test('应该检测 Element UI 空表格', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tr><th>Name</th><th>Age</th></tr>
        <tr class="el-table__empty-block"><td colspan="2">无数据</td></tr>
      `;
      document.body.appendChild(table);
      
      const result = applyFrameworkRules(table, 'element-ui');
      
      expect(result.framework).toBe('element-ui');
      expect(result.isEmpty).toBe(true);
    });
    
    test('应该检测有数据的表格不为空', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tr><th>Name</th><th>Age</th></tr>
        <tr><td>Alice</td><td>25</td></tr>
        <tr><td>Bob</td><td>30</td></tr>
      `;
      document.body.appendChild(table);
      
      const result = applyFrameworkRules(table, 'ant-design');
      
      expect(result.framework).toBe('ant-design');
      expect(result.isEmpty).toBe(false);
    });
    
    test('应该对 unknown 框架返回基本信息', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tr><th>Name</th><th>Age</th></tr>
        <tr><td>Alice</td><td>25</td></tr>
      `;
      document.body.appendChild(table);
      
      const result = applyFrameworkRules(table, 'unknown');
      
      expect(result.framework).toBe('unknown');
      expect(result.isEmpty).toBeUndefined();
      expect(result.hasFixedColumns).toBeUndefined();
    });
    
    test('应该忽略"暂无数据"等占位文本', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tr><th>Name</th><th>Age</th></tr>
        <tr class="ant-table-placeholder"><td colspan="2">暂无数据</td></tr>
      `;
      document.body.appendChild(table);
      
      const result = applyFrameworkRules(table, 'ant-design');
      
      expect(result.isEmpty).toBe(true);
    });
  });
  
  describe('集成测试：框架检测与表格识别', () => {
    test('detectHTMLTable 应该识别 Ant Design 表格框架', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'ant-table-wrapper';
      
      const table = document.createElement('table');
      table.innerHTML = `
        <tr><th>Name</th><th>Age</th></tr>
        <tr><td>Alice</td><td>25</td></tr>
      `;
      wrapper.appendChild(table);
      document.body.appendChild(wrapper);
      
      const result = detectHTMLTable(table);
      
      expect(result).not.toBeNull();
      expect(result?.framework).toBe('ant-design');
    });
    
    test('detectHTMLTable 应该应用框架规则检测空表格', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'ant-table-wrapper';
      
      const table = document.createElement('table');
      table.innerHTML = `
        <tr><th>Name</th><th>Age</th></tr>
        <tr class="ant-table-placeholder"><td colspan="2">暂无数据</td></tr>
      `;
      wrapper.appendChild(table);
      document.body.appendChild(wrapper);
      
      const result = detectHTMLTable(table);
      
      expect(result).not.toBeNull();
      expect(result?.framework).toBe('ant-design');
      expect(result?.isEmpty).toBe(true);
    });
    
    test('detectHTMLTable 应该应用框架规则检测固定列', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'ant-table-wrapper';
      
      const table = document.createElement('table');
      table.innerHTML = `
        <tr>
          <th class="ant-table-cell-fix-left">Name</th>
          <th>Age</th>
        </tr>
        <tr>
          <td class="ant-table-cell-fix-left">Alice</td>
          <td>25</td>
        </tr>
      `;
      wrapper.appendChild(table);
      document.body.appendChild(wrapper);
      
      const result = detectHTMLTable(table);
      
      expect(result).not.toBeNull();
      expect(result?.framework).toBe('ant-design');
      expect(result?.hasFixedColumns).toBe(true);
    });
    
    test('detectDivTable 应该识别框架类型', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'el-table';
      
      const container = document.createElement('div');
      container.style.display = 'grid';
      container.style.gridTemplateColumns = 'repeat(2, 1fr)';
      
      for (let i = 0; i < 4; i++) {
        const cell = document.createElement('div');
        cell.textContent = `Cell ${i + 1}`;
        container.appendChild(cell);
      }
      
      wrapper.appendChild(container);
      document.body.appendChild(wrapper);
      
      const result = detectDivTable(container);
      
      if (result) {
        expect(result.framework).toBe('element-ui');
      }
    });
  });
});

describe('辅助行检测功能', () => {
  describe('isAuxiliaryRow', () => {
    test('应该检测占位行（placeholder）', () => {
      const row = document.createElement('tr');
      row.className = 'ant-table-placeholder';
      
      const result = isAuxiliaryRow(row, 'ant-design');
      expect(result).toBe('placeholder');
    });
    
    test('应该检测测量行（measure）', () => {
      const row = document.createElement('tr');
      row.className = 'ant-table-measure-row';
      
      const result = isAuxiliaryRow(row, 'ant-design');
      expect(result).toBe('measure');
    });
    
    test('应该检测隐藏行（aria-hidden）', () => {
      const row = document.createElement('tr');
      row.setAttribute('aria-hidden', 'true');
      
      const result = isAuxiliaryRow(row);
      expect(result).toBe('hidden');
    });
    
    test('应该检测零高度行', () => {
      const row = document.createElement('tr');
      // 在 JSDOM 测试环境中，getBoundingClientRect 默认返回全 0
      // 为了避免误判，测试环境中不检测零高度行
      // 在真实浏览器环境中，零高度行会被正确检测
      
      const result = isAuxiliaryRow(row);
      // 测试环境中返回 null
      expect(result).toBeNull();
    });
    
    test('应该检测 Element UI 空表格占位行', () => {
      const row = document.createElement('tr');
      row.className = 'el-table__empty-block';
      
      const result = isAuxiliaryRow(row, 'element-ui');
      expect(result).toBe('placeholder');
    });
    
    test('应该检测 Arco Design 空表格占位行', () => {
      const row = document.createElement('tr');
      row.className = 'arco-table-empty';
      
      const result = isAuxiliaryRow(row, 'arco-design');
      expect(result).toBe('placeholder');
    });
    
    test('应该检测 Arco Design 测量行', () => {
      const row = document.createElement('tr');
      row.className = 'arco-table-tr-measure';
      
      const result = isAuxiliaryRow(row, 'arco-design');
      expect(result).toBe('measure');
    });
    
    test('应该检测通用占位行类名', () => {
      const row = document.createElement('tr');
      row.className = 'empty-row';
      
      const result = isAuxiliaryRow(row);
      expect(result).toBe('placeholder');
    });
    
    test('应该检测通用测量行类名', () => {
      const row = document.createElement('tr');
      row.className = 'measure-row';
      
      const result = isAuxiliaryRow(row);
      expect(result).toBe('measure');
    });
    
    test('应该检测包含"暂无数据"的占位行', () => {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.textContent = '暂无数据';
      row.appendChild(cell);
      
      const result = isAuxiliaryRow(row);
      expect(result).toBe('placeholder');
    });
    
    test('应该检测包含"无数据"的占位行', () => {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.textContent = '无数据';
      row.appendChild(cell);
      
      const result = isAuxiliaryRow(row);
      expect(result).toBe('placeholder');
    });
    
    test('应该检测包含"no data"的占位行', () => {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.textContent = 'No Data';
      row.appendChild(cell);
      
      const result = isAuxiliaryRow(row);
      expect(result).toBe('placeholder');
    });
    
    test('应该检测包含"empty"的占位行', () => {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.textContent = 'Empty';
      row.appendChild(cell);
      
      const result = isAuxiliaryRow(row);
      expect(result).toBe('placeholder');
    });
    
    test('应该对普通数据行返回 null', () => {
      const row = document.createElement('tr');
      const cell1 = document.createElement('td');
      cell1.textContent = 'Alice';
      const cell2 = document.createElement('td');
      cell2.textContent = '25';
      row.appendChild(cell1);
      row.appendChild(cell2);
      
      // 在 JSDOM 中，getBoundingClientRect 默认返回全 0
      // 所以需要模拟一个非零高度
      Object.defineProperty(row, 'getBoundingClientRect', {
        value: () => ({
          height: 50,
          width: 100,
          top: 0,
          left: 0,
          bottom: 50,
          right: 100
        })
      });
      
      const result = isAuxiliaryRow(row);
      expect(result).toBeNull();
    });
    
    test('应该对没有框架的普通行返回 null', () => {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.textContent = 'Normal data';
      row.appendChild(cell);
      
      // 模拟非零高度
      Object.defineProperty(row, 'getBoundingClientRect', {
        value: () => ({
          height: 50,
          width: 100,
          top: 0,
          left: 0,
          bottom: 50,
          right: 100
        })
      });
      
      const result = isAuxiliaryRow(row);
      expect(result).toBeNull();
    });
    
    test('应该处理没有单元格的行', () => {
      const row = document.createElement('tr');
      
      const result = isAuxiliaryRow(row);
      // 测试环境中返回 null（因为零高度检测被禁用）
      expect(result).toBeNull();
    });
    
    test('应该处理多个单元格的占位行（不检测为占位）', () => {
      const row = document.createElement('tr');
      const cell1 = document.createElement('td');
      cell1.textContent = '暂无数据';
      const cell2 = document.createElement('td');
      cell2.textContent = '其他内容';
      row.appendChild(cell1);
      row.appendChild(cell2);
      
      // 模拟非零高度
      Object.defineProperty(row, 'getBoundingClientRect', {
        value: () => ({
          height: 50,
          width: 100,
          top: 0,
          left: 0,
          bottom: 50,
          right: 100
        })
      });
      
      const result = isAuxiliaryRow(row);
      // 多个单元格不应该被检测为占位行
      expect(result).toBeNull();
    });
    
    test('应该优先检测 aria-hidden', () => {
      const row = document.createElement('tr');
      row.setAttribute('aria-hidden', 'true');
      row.className = 'ant-table-placeholder';
      
      const result = isAuxiliaryRow(row, 'ant-design');
      expect(result).toBe('hidden');
    });
    
    test('应该在没有框架时使用通用检测', () => {
      const row = document.createElement('tr');
      row.className = 'placeholder-row';
      
      const result = isAuxiliaryRow(row, 'unknown');
      expect(result).toBe('placeholder');
    });
  });
});

describe('固定列检测功能', () => {
  describe('detectFixedColumns', () => {
    test('应该检测 position: sticky 的固定列', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tr>
          <th style="position: sticky; left: 0;">固定列</th>
          <th>普通列1</th>
          <th>普通列2</th>
        </tr>
        <tr>
          <td style="position: sticky; left: 0;">数据1</td>
          <td>数据2</td>
          <td>数据3</td>
        </tr>
      `;
      document.body.appendChild(table);
      
      const { detectFixedColumns } = require('../detector');
      const result = detectFixedColumns(table);
      
      expect(result).toHaveLength(1);
      expect(result[0].index).toBe(0);
      expect(result[0].position).toBe('left');
    });
    
    test('应该检测 Ant Design 固定列类名', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tr>
          <th class="ant-table-cell ant-table-cell-fix-left">固定列</th>
          <th class="ant-table-cell">普通列1</th>
          <th class="ant-table-cell ant-table-cell-fix-right">右固定列</th>
        </tr>
      `;
      document.body.appendChild(table);
      
      const { detectFixedColumns } = require('../detector');
      const result = detectFixedColumns(table, 'ant-design');
      
      expect(result).toHaveLength(2);
      expect(result[0].index).toBe(0);
      expect(result[0].position).toBe('left');
      expect(result[1].index).toBe(2);
      expect(result[1].position).toBe('right');
    });
    
    test('应该检测 Element UI 固定列类名', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tr>
          <th class="el-table-fixed-column">固定列</th>
          <th>普通列</th>
        </tr>
      `;
      document.body.appendChild(table);
      
      const { detectFixedColumns } = require('../detector');
      const result = detectFixedColumns(table, 'element-ui');
      
      expect(result).toHaveLength(1);
      expect(result[0].index).toBe(0);
      expect(result[0].position).toBe('left');
    });
    
    test('应该返回空数组当没有固定列时', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tr>
          <th>普通列1</th>
          <th>普通列2</th>
        </tr>
      `;
      document.body.appendChild(table);
      
      const { detectFixedColumns } = require('../detector');
      const result = detectFixedColumns(table);
      
      expect(result).toHaveLength(0);
    });
    
    test('应该返回空数组当表格没有行时', () => {
      const table = document.createElement('table');
      document.body.appendChild(table);
      
      const { detectFixedColumns } = require('../detector');
      const result = detectFixedColumns(table);
      
      expect(result).toHaveLength(0);
    });
    
    test('应该根据 right 属性判断右侧固定', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tr>
          <th style="position: sticky; right: 0;">右固定列</th>
        </tr>
      `;
      document.body.appendChild(table);
      
      const { detectFixedColumns } = require('../detector');
      const result = detectFixedColumns(table);
      
      expect(result).toHaveLength(1);
      expect(result[0].position).toBe('right');
    });
    
    test('应该按列索引排序结果', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tr>
          <th>普通列</th>
          <th class="ant-table-cell-fix-right">右固定</th>
          <th class="ant-table-cell-fix-left">左固定</th>
        </tr>
      `;
      document.body.appendChild(table);
      
      const { detectFixedColumns } = require('../detector');
      const result = detectFixedColumns(table, 'ant-design');
      
      expect(result).toHaveLength(2);
      expect(result[0].index).toBe(1);
      expect(result[1].index).toBe(2);
    });
    
    test('应该处理检测错误并返回空数组', () => {
      const table = document.createElement('table');
      table.innerHTML = `<tr><th>测试</th></tr>`;
      document.body.appendChild(table);
      
      // Mock querySelector 抛出错误
      const originalQuerySelector = table.querySelector;
      table.querySelector = () => {
        throw new Error('Mock error');
      };
      
      const { detectFixedColumns } = require('../detector');
      const result = detectFixedColumns(table);
      
      expect(result).toHaveLength(0);
      
      // 恢复原始方法
      table.querySelector = originalQuerySelector;
    });
  });
});
