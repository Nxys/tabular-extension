/**
 * 集成场景测试：真实场景的表格检测
 * 
 * 测试目标：
 * - 使用真实的 Ant Design 空表格 HTML
 * - 测试各种框架的表格
 * - 测试空表格 + 固定列组合
 * - 测试深度嵌套 + 占位行组合
 */

import {
  scanTables,
  type TableDetectionConfig
} from '../detector';

// 默认配置
const DEFAULT_CONFIG: TableDetectionConfig = {
  minRows: 1,
  minCols: 2,
  alignmentThreshold: 5,
  gridGapTolerance: 10,
  detectEmptyTables: true,
  filterAuxiliaryRows: true,
  detectFixedColumns: true,
  penetrateNesting: true
};

// 清理 DOM
function cleanupDOM(): void {
  document.body.innerHTML = '';
}

describe('真实场景：Ant Design 空表格', () => {
  afterEach(cleanupDOM);

  test('应该检测 Ant Design 空表格（只有表头）', () => {
    // 真实的 Ant Design 空表格 HTML
    document.body.innerHTML = `
      <div class="ant-table-wrapper">
        <div class="ant-table">
          <div class="ant-table-container">
            <div class="ant-table-content">
              <table>
                <thead class="ant-table-thead">
                  <tr>
                    <th class="ant-table-cell">姓名</th>
                    <th class="ant-table-cell">年龄</th>
                    <th class="ant-table-cell">地址</th>
                  </tr>
                </thead>
                <tbody class="ant-table-tbody">
                  <tr class="ant-table-placeholder">
                    <td colspan="3" class="ant-table-cell">
                      <div class="ant-empty ant-empty-normal">
                        <div class="ant-empty-image">
                          <svg>...</svg>
                        </div>
                        <div class="ant-empty-description">暂无数据</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    const tables = scanTables(DEFAULT_CONFIG);

    expect(tables.length).toBe(1);
    expect(tables[0].framework).toBe('ant-design');
    expect(tables[0].isEmpty).toBe(true);
    expect(tables[0].rows).toBe(1);  // 只有表头
    expect(tables[0].cols).toBe(3);
    expect(tables[0].data).toEqual([['姓名', '年龄', '地址']]);
  });

  test('应该检测 Ant Design 空表格（带测量行）', () => {
    document.body.innerHTML = `
      <div class="ant-table-wrapper">
        <div class="ant-table">
          <div class="ant-table-container">
            <div class="ant-table-content">
              <table>
                <colgroup>
                  <col style="width: 100px;">
                  <col style="width: 100px;">
                </colgroup>
                <thead class="ant-table-thead">
                  <tr>
                    <th class="ant-table-cell">名称</th>
                    <th class="ant-table-cell">状态</th>
                  </tr>
                </thead>
                <tbody class="ant-table-tbody">
                  <tr aria-hidden="true" class="ant-table-measure-row" style="height: 0px; font-size: 0px;">
                    <td style="padding: 0px; border: 0px; height: 0px;"></td>
                    <td style="padding: 0px; border: 0px; height: 0px;"></td>
                  </tr>
                  <tr class="ant-table-placeholder">
                    <td colspan="2" class="ant-table-cell">
                      <div class="ant-empty-description">暂无数据</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    const tables = scanTables(DEFAULT_CONFIG);

    expect(tables.length).toBe(1);
    expect(tables[0].framework).toBe('ant-design');
    expect(tables[0].isEmpty).toBe(true);
    expect(tables[0].rows).toBe(1);  // 只有表头（测量行和占位行被过滤）
    expect(tables[0].cols).toBe(2);
    expect(tables[0].data).toEqual([['名称', '状态']]);
  });
});

describe('真实场景：Ant Design 固定列表格', () => {
  afterEach(cleanupDOM);

  test('应该检测 Ant Design 固定列表格（左侧固定）', () => {
    document.body.innerHTML = `
      <div class="ant-table-wrapper">
        <div class="ant-table">
          <div class="ant-table-container">
            <div class="ant-table-content">
              <table>
                <thead class="ant-table-thead">
                  <tr>
                    <th class="ant-table-cell ant-table-cell-fix-left">姓名</th>
                    <th class="ant-table-cell">年龄</th>
                    <th class="ant-table-cell">地址</th>
                  </tr>
                </thead>
                <tbody class="ant-table-tbody">
                  <tr>
                    <td class="ant-table-cell ant-table-cell-fix-left">张三</td>
                    <td class="ant-table-cell">25</td>
                    <td class="ant-table-cell">北京</td>
                  </tr>
                  <tr>
                    <td class="ant-table-cell ant-table-cell-fix-left">李四</td>
                    <td class="ant-table-cell">30</td>
                    <td class="ant-table-cell">上海</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    const tables = scanTables(DEFAULT_CONFIG);

    expect(tables.length).toBe(1);
    expect(tables[0].framework).toBe('ant-design');
    expect(tables[0].hasFixedColumns).toBe(true);
    expect(tables[0].isEmpty).toBe(false);
    expect(tables[0].rows).toBe(3);
    expect(tables[0].cols).toBe(3);
  });

  test('应该检测 Ant Design 固定列表格（左右固定）', () => {
    document.body.innerHTML = `
      <div class="ant-table-wrapper">
        <div class="ant-table">
          <div class="ant-table-container">
            <div class="ant-table-content">
              <table>
                <thead class="ant-table-thead">
                  <tr>
                    <th class="ant-table-cell ant-table-cell-fix-left">姓名</th>
                    <th class="ant-table-cell">年龄</th>
                    <th class="ant-table-cell">地址</th>
                    <th class="ant-table-cell ant-table-cell-fix-right">操作</th>
                  </tr>
                </thead>
                <tbody class="ant-table-tbody">
                  <tr>
                    <td class="ant-table-cell ant-table-cell-fix-left">张三</td>
                    <td class="ant-table-cell">25</td>
                    <td class="ant-table-cell">北京</td>
                    <td class="ant-table-cell ant-table-cell-fix-right">编辑</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    const tables = scanTables(DEFAULT_CONFIG);

    expect(tables.length).toBe(1);
    expect(tables[0].framework).toBe('ant-design');
    expect(tables[0].hasFixedColumns).toBe(true);
    expect(tables[0].rows).toBe(2);
    expect(tables[0].cols).toBe(4);
  });
});

describe('真实场景：空表格 + 固定列组合', () => {
  afterEach(cleanupDOM);

  test('应该检测空表格且有固定列', () => {
    document.body.innerHTML = `
      <div class="ant-table-wrapper">
        <div class="ant-table">
          <div class="ant-table-container">
            <div class="ant-table-content">
              <table>
                <thead class="ant-table-thead">
                  <tr>
                    <th class="ant-table-cell ant-table-cell-fix-left">ID</th>
                    <th class="ant-table-cell">名称</th>
                    <th class="ant-table-cell ant-table-cell-fix-right">操作</th>
                  </tr>
                </thead>
                <tbody class="ant-table-tbody">
                  <tr class="ant-table-placeholder">
                    <td colspan="3" class="ant-table-cell">
                      <div class="ant-empty-description">暂无数据</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    const tables = scanTables(DEFAULT_CONFIG);

    expect(tables.length).toBe(1);
    expect(tables[0].framework).toBe('ant-design');
    expect(tables[0].isEmpty).toBe(true);
    expect(tables[0].hasFixedColumns).toBe(true);
    expect(tables[0].rows).toBe(1);  // 只有表头
    expect(tables[0].cols).toBe(3);
    expect(tables[0].data).toEqual([['ID', '名称', '操作']]);
  });
});

describe('真实场景：深度嵌套 + 占位行组合', () => {
  afterEach(cleanupDOM);

  test('应该穿透深度嵌套并过滤占位行', () => {
    document.body.innerHTML = `
      <div class="page-container">
        <div class="content-wrapper">
          <div class="ant-table-wrapper">
            <div class="ant-spin-nested-loading">
              <div class="ant-spin-container">
                <div class="ant-table ant-table-default">
                  <div class="ant-table-container">
                    <div class="ant-table-header">
                      <table>
                        <colgroup>
                          <col style="width: 150px;">
                          <col style="width: 100px;">
                          <col>
                        </colgroup>
                        <thead class="ant-table-thead">
                          <tr>
                            <th class="ant-table-cell">产品名称</th>
                            <th class="ant-table-cell">价格</th>
                            <th class="ant-table-cell">库存</th>
                          </tr>
                        </thead>
                      </table>
                    </div>
                    <div class="ant-table-body">
                      <table>
                        <colgroup>
                          <col style="width: 150px;">
                          <col style="width: 100px;">
                          <col>
                        </colgroup>
                        <tbody class="ant-table-tbody">
                          <tr aria-hidden="true" class="ant-table-measure-row">
                            <td style="padding: 0; border: 0; height: 0;"></td>
                            <td style="padding: 0; border: 0; height: 0;"></td>
                            <td style="padding: 0; border: 0; height: 0;"></td>
                          </tr>
                          <tr class="ant-table-placeholder">
                            <td colspan="3" class="ant-table-cell">
                              <div class="ant-empty">
                                <div class="ant-empty-description">暂无数据</div>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const tables = scanTables(DEFAULT_CONFIG);

    // 应该检测到两个表格（表头和表体分离）
    expect(tables.length).toBeGreaterThanOrEqual(1);
    
    // 检查第一个表格（表头）
    const headerTable = tables.find(t => t.data.length === 1);
    expect(headerTable).toBeDefined();
    expect(headerTable?.framework).toBe('ant-design');
    expect(headerTable?.data).toEqual([['产品名称', '价格', '库存']]);
  });

  test('应该处理多层嵌套容器', () => {
    document.body.innerHTML = `
      <div class="ant-table-wrapper">
        <div class="ant-table">
          <div class="ant-table-container">
            <div class="ant-table-content">
              <div class="ant-table-scroll">
                <div class="ant-table-body">
                  <table>
                    <thead class="ant-table-thead">
                      <tr>
                        <th class="ant-table-cell">列1</th>
                        <th class="ant-table-cell">列2</th>
                      </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                      <tr>
                        <td class="ant-table-cell">数据1</td>
                        <td class="ant-table-cell">数据2</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const tables = scanTables(DEFAULT_CONFIG);

    expect(tables.length).toBe(1);
    expect(tables[0].framework).toBe('ant-design');
    expect(tables[0].rows).toBe(2);
    expect(tables[0].cols).toBe(2);
    expect(tables[0].data).toEqual([
      ['列1', '列2'],
      ['数据1', '数据2']
    ]);
  });
});

describe('真实场景：其他 UI 框架', () => {
  afterEach(cleanupDOM);

  test('应该检测 Element UI 空表格', () => {
    document.body.innerHTML = `
      <div class="el-table el-table--fit">
        <div class="el-table__header-wrapper">
          <table cellspacing="0" cellpadding="0" border="0">
            <thead>
              <tr>
                <th class="el-table__cell">姓名</th>
                <th class="el-table__cell">年龄</th>
              </tr>
            </thead>
          </table>
        </div>
        <div class="el-table__body-wrapper">
          <table cellspacing="0" cellpadding="0" border="0">
            <tbody>
              <tr class="el-table__empty-block">
                <td colspan="2" class="el-table__cell">
                  <div class="el-table__empty-text">无数据</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    const tables = scanTables(DEFAULT_CONFIG);

    expect(tables.length).toBeGreaterThanOrEqual(1);
    
    // 查找表头表格
    const headerTable = tables.find(t => 
      t.data.length === 1 && t.data[0].includes('姓名')
    );
    expect(headerTable).toBeDefined();
    expect(headerTable?.framework).toBe('element-ui');
  });

  test('应该检测 Element Plus 表格', () => {
    document.body.innerHTML = `
      <div class="el-table">
        <div class="el-table__inner-wrapper">
          <div class="el-table__header-wrapper">
            <table>
              <thead>
                <tr>
                  <th class="el-table__cell">名称</th>
                  <th class="el-table__cell">值</th>
                </tr>
              </thead>
            </table>
          </div>
          <div class="el-table__body-wrapper">
            <table>
              <tbody>
                <tr>
                  <td class="el-table__cell">项目A</td>
                  <td class="el-table__cell">100</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const tables = scanTables(DEFAULT_CONFIG);

    expect(tables.length).toBeGreaterThanOrEqual(1);
    
    // 至少有一个表格被识别为 Element Plus
    const elementPlusTable = tables.find(t => t.framework === 'element-plus');
    expect(elementPlusTable).toBeDefined();
  });

  test('应该检测 Arco Design 表格', () => {
    document.body.innerHTML = `
      <div class="arco-table">
        <div class="arco-table-container">
          <div class="arco-table-content">
            <table>
              <thead>
                <tr>
                  <th class="arco-table-th">标题</th>
                  <th class="arco-table-th">内容</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="arco-table-td">标题1</td>
                  <td class="arco-table-td">内容1</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const tables = scanTables(DEFAULT_CONFIG);

    expect(tables.length).toBe(1);
    expect(tables[0].framework).toBe('arco-design');
    expect(tables[0].rows).toBe(2);
    expect(tables[0].cols).toBe(2);
  });

  test('应该检测 Bootstrap 表格', () => {
    document.body.innerHTML = `
      <div class="table-responsive">
        <table class="table table-striped">
          <thead>
            <tr>
              <th>名称</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>项目1</td>
              <td>进行中</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    const tables = scanTables(DEFAULT_CONFIG);

    expect(tables.length).toBe(1);
    expect(tables[0].framework).toBe('bootstrap');
    expect(tables[0].rows).toBe(2);
    expect(tables[0].cols).toBe(2);
  });
});

describe('真实场景：复杂组合', () => {
  afterEach(cleanupDOM);

  test('应该处理页面中的多个不同框架表格', () => {
    document.body.innerHTML = `
      <div class="page">
        <div class="ant-table-wrapper">
          <table>
            <tr><th>Ant 1</th><th>Ant 2</th></tr>
            <tr><td>A</td><td>B</td></tr>
          </table>
        </div>
        
        <div class="el-table">
          <table>
            <tr><th>Element 1</th><th>Element 2</th></tr>
            <tr><td>C</td><td>D</td></tr>
          </table>
        </div>
        
        <div class="table-responsive">
          <table class="table">
            <tr><th>Bootstrap 1</th><th>Bootstrap 2</th></tr>
            <tr><td>E</td><td>F</td></tr>
          </table>
        </div>
      </div>
    `;

    const tables = scanTables(DEFAULT_CONFIG);

    expect(tables.length).toBe(3);
    
    const frameworks = tables.map(t => t.framework);
    expect(frameworks).toContain('ant-design');
    expect(frameworks).toContain('element-ui');
    expect(frameworks).toContain('bootstrap');
  });

  test('应该处理嵌套表格（表格内的表格）', () => {
    document.body.innerHTML = `
      <div class="ant-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>外层列1</th>
              <th>外层列2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>外层数据1</td>
              <td>
                <table>
                  <tr><th>内层列1</th><th>内层列2</th></tr>
                  <tr><td>内层数据1</td><td>内层数据2</td></tr>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    const tables = scanTables(DEFAULT_CONFIG);

    // 应该检测到两个表格（外层和内层）
    expect(tables.length).toBe(2);
    expect(tables.every(t => t.framework === 'ant-design')).toBe(true);
  });
});
