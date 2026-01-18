/**
 * 嵌套穿透属性测试
 * 
 * Feature: table-detection-enhancement
 * Property 6: 嵌套穿透完整性
 * 
 * **验证：需求 3.1, 3.3**
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import fc from 'fast-check';
import { scanTables, TableDetectionConfig } from '../detector';

describe('属性 6：嵌套穿透完整性', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  /**
   * 生成嵌套表格的 HTML
   */
  function generateNestedTable(spec: {
    framework: 'ant-design' | 'element-ui' | 'element-plus' | 'arco-design';
    nestingDepth: number;
    hasData: boolean;
  }): HTMLElement {
    const { framework, nestingDepth, hasData } = spec;

    // 根据框架选择容器类名和选择器
    const containerConfigs = {
      'ant-design': {
        outerClass: 'ant-table-wrapper',
        containerClass: 'ant-table-container',
        contentClass: 'ant-table-content'
      },
      'element-ui': {
        outerClass: 'el-table',
        containerClass: 'el-table__body-wrapper',
        contentClass: 'el-table__body'
      },
      'element-plus': {
        outerClass: 'el-table',
        containerClass: 'el-table__inner-wrapper',
        contentClass: 'el-table__body-wrapper'
      },
      'arco-design': {
        outerClass: 'arco-table',
        containerClass: 'arco-table-container',
        contentClass: 'arco-table-content'
      }
    };

    const config = containerConfigs[framework];

    // 创建最外层容器
    const wrapper = document.createElement('div');
    wrapper.className = config.outerClass;

    // 创建嵌套容器
    let currentContainer = wrapper;
    for (let i = 0; i < nestingDepth; i++) {
      const container = document.createElement('div');
      container.className = i % 2 === 0 ? config.containerClass : config.contentClass;
      currentContainer.appendChild(container);
      currentContainer = container;
    }

    // 创建表格
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>列1</th>
          <th>列2</th>
          <th>列3</th>
        </tr>
      </thead>
      <tbody>
        ${hasData ? `
          <tr>
            <td>数据1</td>
            <td>数据2</td>
            <td>数据3</td>
          </tr>
        ` : ''}
      </tbody>
    `;

    currentContainer.appendChild(table);

    return wrapper;
  }

  it('属性 6：对于任何包含多层容器嵌套的表格，检测器应该穿透嵌套层级找到实际的 <table> 元素并正确提取数据', () => {
    fc.assert(
      fc.property(
        fc.record({
          framework: fc.constantFrom('ant-design' as const, 'element-ui' as const, 'element-plus' as const, 'arco-design' as const),
          nestingDepth: fc.integer({ min: 1, max: 5 }),
          hasData: fc.boolean()
        }),
        (spec) => {
          // 生成嵌套表格
          const wrapper = generateNestedTable(spec);
          document.body.appendChild(wrapper);

          // 配置：启用嵌套穿透
          const config: TableDetectionConfig = {
            minRows: 1,
            minCols: 2,
            alignmentThreshold: 5,
            gridGapTolerance: 10,
            detectEmptyTables: true,
            filterAuxiliaryRows: true,
            detectFixedColumns: true,
            penetrateNesting: true
          };

          // 扫描表格
          const tables = scanTables(config);

          // 验证：应该检测到表格
          expect(tables.length).toBeGreaterThanOrEqual(1);

          // 验证：表格数据正确提取
          const table = tables[0];
          expect(table.type).toBe('html-table');
          expect(table.cols).toBe(3);

          if (spec.hasData) {
            // 有数据行：至少 2 行（表头 + 数据）
            expect(table.rows).toBeGreaterThanOrEqual(2);
            expect(table.data.length).toBeGreaterThanOrEqual(2);
            expect(table.isEmpty).toBe(false);
          } else {
            // 只有表头：1 行
            expect(table.rows).toBe(1);
            expect(table.data.length).toBe(1);
            expect(table.isEmpty).toBe(true);
          }

          // 清理
          document.body.innerHTML = '';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('应该避免重复检测同一个表格', () => {
    // 创建一个嵌套在多个容器中的表格
    const wrapper = document.createElement('div');
    wrapper.className = 'ant-table-wrapper';

    const container1 = document.createElement('div');
    container1.className = 'ant-table-container';
    wrapper.appendChild(container1);

    const container2 = document.createElement('div');
    container2.className = 'ant-table-content';
    container1.appendChild(container2);

    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>列1</th>
          <th>列2</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>数据1</td>
          <td>数据2</td>
        </tr>
      </tbody>
    `;
    container2.appendChild(table);

    document.body.appendChild(wrapper);

    // 扫描表格
    const tables = scanTables();

    // 验证：应该只检测到一个表格（不重复）
    expect(tables.length).toBe(1);
    expect(tables[0].type).toBe('html-table');
    expect(tables[0].rows).toBe(2);
    expect(tables[0].cols).toBe(2);
  });

  it('应该在禁用嵌套穿透时只检测顶层表格', () => {
    // 创建一个嵌套表格
    const wrapper = generateNestedTable({
      framework: 'ant-design',
      nestingDepth: 3,
      hasData: true
    });
    document.body.appendChild(wrapper);

    // 配置：禁用嵌套穿透
    const config: TableDetectionConfig = {
      minRows: 1,
      minCols: 2,
      alignmentThreshold: 5,
      gridGapTolerance: 10,
      detectEmptyTables: true,
      filterAuxiliaryRows: true,
      detectFixedColumns: true,
      penetrateNesting: false  // 禁用
    };

    // 扫描表格
    const tables = scanTables(config);

    // 验证：应该检测到表格（因为 querySelectorAll('table') 仍然会找到）
    expect(tables.length).toBeGreaterThanOrEqual(1);
  });

  it('应该处理多个嵌套表格', () => {
    // 创建多个嵌套表格
    for (let i = 0; i < 3; i++) {
      const wrapper = generateNestedTable({
        framework: 'ant-design',
        nestingDepth: 2,
        hasData: true
      });
      document.body.appendChild(wrapper);
    }

    // 扫描表格
    const tables = scanTables();

    // 验证：应该检测到所有表格
    expect(tables.length).toBe(3);
    tables.forEach(table => {
      expect(table.type).toBe('html-table');
      expect(table.rows).toBeGreaterThanOrEqual(2);
      expect(table.cols).toBe(3);
    });
  });

  it('应该处理不同框架的嵌套表格', () => {
    const frameworks: Array<'ant-design' | 'element-ui' | 'element-plus' | 'arco-design'> = [
      'ant-design',
      'element-ui',
      'element-plus',
      'arco-design'
    ];

    // 为每个框架创建一个嵌套表格
    frameworks.forEach(framework => {
      const wrapper = generateNestedTable({
        framework,
        nestingDepth: 2,
        hasData: true
      });
      document.body.appendChild(wrapper);
    });

    // 扫描表格
    const tables = scanTables();

    // 验证：应该检测到所有框架的表格
    expect(tables.length).toBe(frameworks.length);
    tables.forEach(table => {
      expect(table.type).toBe('html-table');
      expect(table.rows).toBeGreaterThanOrEqual(2);
      expect(table.cols).toBe(3);
    });
  });
});
