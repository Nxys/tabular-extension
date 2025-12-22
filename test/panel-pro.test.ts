// Panel Pro 功能扩展单元测试

import { Panel } from '../src/content/panel';

describe('Panel Pro 功能扩展单元测试', () => {
  let panel: Panel;

  beforeEach(() => {
    // 清理 DOM
    document.body.innerHTML = '';
    panel = new Panel();
    
    // 模拟 URL API（jsdom 不支持）
    if (!global.URL.createObjectURL) {
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    }
    if (!global.URL.revokeObjectURL) {
      global.URL.revokeObjectURL = jest.fn();
    }
  });

  afterEach(() => {
    // 清理面板
    panel.hide();
    document.body.innerHTML = '';
    
    // 清理模拟
    jest.restoreAllMocks();
  });

  describe('showAligned 方法测试', () => {
    test('showAligned 方法应该存在', () => {
      expect(panel.showAligned).toBeDefined();
      expect(typeof panel.showAligned).toBe('function');
    });

    test('showAligned 应该将二维数组转换为文本并显示', () => {
      const table = [
        ['姓名      ', '年龄  ', '城市  '],
        ['张三      ', '25    ', '北京  '],
        ['李四      ', '30    ', '上海  ']
      ];

      panel.showAligned(table);

      // 验证面板已创建
      const panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();

      // 验证文本内容
      const textarea = document.querySelector('.browser-selection-copy-panel-textarea') as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      
      const expectedText = '姓名      年龄  城市  \n张三      25    北京  \n李四      30    上海  ';
      expect(textarea.value).toBe(expectedText);
    });

    test('showAligned 应该添加表格模式样式类', () => {
      const table = [
        ['列1  ', '列2  '],
        ['值1  ', '值2  ']
      ];

      panel.showAligned(table);

      const panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();
      expect(panelElement?.classList.contains('browser-selection-copy-table-mode')).toBe(true);
    });

    test('showAligned 应该显示可编辑的文本区域', () => {
      const table = [['测试']];

      panel.showAligned(table);

      const textarea = document.querySelector('.browser-selection-copy-panel-textarea') as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      expect(textarea.readOnly).toBe(false);
    });

    test('showAligned 应该处理空表格', () => {
      const table: string[][] = [];

      panel.showAligned(table);

      const panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();

      const textarea = document.querySelector('.browser-selection-copy-panel-textarea') as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      expect(textarea.value).toBe('');
    });

    test('showAligned 应该处理单行表格', () => {
      const table = [['单行数据']];

      panel.showAligned(table);

      const textarea = document.querySelector('.browser-selection-copy-panel-textarea') as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      expect(textarea.value).toBe('单行数据');
    });

    test('showAligned 应该显示复制按钮', () => {
      const table = [['测试']];

      panel.showAligned(table);

      const copyBtn = document.querySelector('.browser-selection-copy-panel-copy-btn');
      expect(copyBtn).toBeTruthy();
    });
  });

  describe('enableCSVExport 方法测试', () => {
    test('enableCSVExport 方法应该存在', () => {
      expect(panel.enableCSVExport).toBeDefined();
      expect(typeof panel.enableCSVExport).toBe('function');
    });

    test('enableCSVExport 应该添加 CSV 导出按钮', () => {
      // 先显示一个面板
      panel.show('测试文本', { position: { left: 100, top: 100 } });

      const csv = '姓名,年龄,城市\n张三,25,北京\n李四,30,上海';
      panel.enableCSVExport(csv);

      // 验证 CSV 按钮存在
      const csvBtn = document.querySelector('.browser-selection-copy-panel-csv-btn');
      expect(csvBtn).toBeTruthy();
      expect(csvBtn?.textContent).toBe('📊 导出 CSV');
    });

    test('enableCSVExport 应该将 CSV 按钮插入到复制按钮之前', () => {
      panel.show('测试文本', { position: { left: 100, top: 100 } });

      const csv = 'test,data';
      panel.enableCSVExport(csv);

      const copyWrapper = document.querySelector('.browser-selection-copy-panel-copy-wrapper');
      expect(copyWrapper).toBeTruthy();

      const firstChild = copyWrapper?.firstChild as HTMLElement;
      expect(firstChild.classList.contains('browser-selection-copy-panel-csv-btn')).toBe(true);
    });

    test('enableCSVExport 在没有面板时不应该抛出错误', () => {
      const csv = 'test,data';
      
      expect(() => {
        panel.enableCSVExport(csv);
      }).not.toThrow();
    });

    test('enableCSVExport 在没有复制按钮容器时不应该抛出错误', () => {
      // 显示限制提示面板（没有复制按钮容器）
      panel.showLimitReached();

      const csv = 'test,data';
      
      expect(() => {
        panel.enableCSVExport(csv);
      }).not.toThrow();

      // 验证没有添加 CSV 按钮
      const csvBtn = document.querySelector('.browser-selection-copy-panel-csv-btn');
      expect(csvBtn).toBeFalsy();
    });

    test('enableCSVExport 应该支持回调函数', async () => {
      panel.show('测试文本', { position: { left: 100, top: 100 } });

      const csv = 'test,data';
      const onExport = jest.fn();
      
      panel.enableCSVExport(csv, onExport);

      const csvBtn = document.querySelector('.browser-selection-copy-panel-csv-btn') as HTMLButtonElement;
      expect(csvBtn).toBeTruthy();

      // 模拟点击
      csvBtn.click();

      // 等待异步操作
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(onExport).toHaveBeenCalled();
    });

    test('enableCSVExport 应该支持异步回调函数', async () => {
      panel.show('测试文本', { position: { left: 100, top: 100 } });

      const csv = 'test,data';
      const onExport = jest.fn().mockResolvedValue(undefined);
      
      panel.enableCSVExport(csv, onExport);

      const csvBtn = document.querySelector('.browser-selection-copy-panel-csv-btn') as HTMLButtonElement;
      csvBtn.click();

      // 等待异步操作
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(onExport).toHaveBeenCalled();
    });
  });

  describe('downloadCSV 方法测试（通过 enableCSVExport 间接测试）', () => {
    test('点击 CSV 按钮应该触发文件下载', () => {
      panel.show('测试文本', { position: { left: 100, top: 100 } });

      const csv = '姓名,年龄\n张三,25';
      panel.enableCSVExport(csv);

      // 重置模拟以便追踪调用
      (global.URL.createObjectURL as jest.Mock).mockClear();
      (global.URL.revokeObjectURL as jest.Mock).mockClear();

      // 模拟 link.click()
      const clickSpy = jest.fn();
      const originalCreateElement = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          element.click = clickSpy;
        }
        return element;
      });

      const csvBtn = document.querySelector('.browser-selection-copy-panel-csv-btn') as HTMLButtonElement;
      csvBtn.click();

      // 验证 Blob 创建和 URL 生成
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      
      // 验证链接点击
      expect(clickSpy).toHaveBeenCalled();
      
      // 验证 URL 释放
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    test('下载的文件名应该包含时间戳', () => {
      panel.show('测试文本', { position: { left: 100, top: 100 } });

      const csv = 'test,data';
      panel.enableCSVExport(csv);

      let downloadFileName = '';
      const originalCreateElement = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          Object.defineProperty(element, 'download', {
            set: (value: string) => {
              downloadFileName = value;
            },
            get: () => downloadFileName,
            configurable: true
          });
        }
        return element;
      });

      const csvBtn = document.querySelector('.browser-selection-copy-panel-csv-btn') as HTMLButtonElement;
      csvBtn.click();

      // 验证文件名格式
      expect(downloadFileName).toMatch(/^table-\d+\.csv$/);
    });
  });

  describe('showProRequired 方法测试', () => {
    test('showProRequired 方法应该存在', () => {
      expect(panel.showProRequired).toBeDefined();
      expect(typeof panel.showProRequired).toBe('function');
    });

    test('showProRequired 应该显示 Pro 升级提示', () => {
      panel.showProRequired();

      // 验证面板已创建
      const panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();

      // 验证标题
      const title = panelElement?.querySelector('.browser-selection-copy-panel-title');
      expect(title?.textContent).toContain('Pro 功能');

      // 验证图标
      const icon = panelElement?.querySelector('.browser-selection-copy-panel-icon');
      expect(icon?.textContent).toBe('⭐');

      // 验证主消息
      const message = panelElement?.querySelector('.browser-selection-copy-panel-message');
      expect(message?.textContent).toBe('表格识别是 Pro 功能');
    });

    test('showProRequired 应该显示升级按钮', () => {
      panel.showProRequired();

      // 验证升级按钮存在
      const upgradeBtn = document.querySelector('.browser-selection-copy-panel-upgrade-btn');
      expect(upgradeBtn).toBeTruthy();
      expect(upgradeBtn?.textContent).toBe('升级 Pro（占位）');
    });

    test('showProRequired 不应该显示使用次数信息', () => {
      panel.showProRequired();

      // 验证不存在使用次数相关元素
      const subMessage = document.querySelector('.browser-selection-copy-panel-submessage');
      expect(subMessage).toBeFalsy();

      const resetInfo = document.querySelector('.browser-selection-copy-panel-reset-info');
      expect(resetInfo).toBeFalsy();
    });

    test('showProRequired 不应该显示文本预览区域', () => {
      panel.showProRequired();

      // 验证不存在文本预览相关元素
      const textarea = document.querySelector('.browser-selection-copy-panel-textarea');
      expect(textarea).toBeFalsy();

      const copyBtn = document.querySelector('.browser-selection-copy-panel-copy-btn');
      expect(copyBtn).toBeFalsy();
    });

    test('showProRequired 应该显示关闭按钮', () => {
      panel.showProRequired();

      // 验证关闭按钮存在
      const closeBtn = document.querySelector('.browser-selection-copy-panel-close');
      expect(closeBtn).toBeTruthy();
      expect(closeBtn?.textContent).toBe('×');
    });

    test('关闭按钮应该能够隐藏 Pro 提示面板', () => {
      panel.showProRequired();

      // 验证面板已显示
      let panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();

      // 点击关闭按钮
      const closeBtn = document.querySelector('.browser-selection-copy-panel-close') as HTMLButtonElement;
      closeBtn.click();

      // 验证面板已隐藏
      panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeFalsy();
    });

    test('升级按钮点击应该输出日志（占位功能）', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      panel.showProRequired();

      const upgradeBtn = document.querySelector('.browser-selection-copy-panel-upgrade-btn') as HTMLButtonElement;
      expect(upgradeBtn).toBeTruthy();

      upgradeBtn.click();

      expect(consoleSpy).toHaveBeenCalledWith('升级 Pro 功能尚未实现');

      consoleSpy.mockRestore();
    });
  });

  describe('集成测试 - showAligned 和 enableCSVExport', () => {
    test('应该能够同时使用 showAligned 和 enableCSVExport', () => {
      const table = [
        ['姓名  ', '年龄  '],
        ['张三  ', '25    ']
      ];
      const csv = '姓名,年龄\n张三,25';

      // 显示对齐表格
      panel.showAligned(table);

      // 启用 CSV 导出
      panel.enableCSVExport(csv);

      // 验证面板存在
      const panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();

      // 验证表格模式样式
      expect(panelElement?.classList.contains('browser-selection-copy-table-mode')).toBe(true);

      // 验证文本内容
      const textarea = document.querySelector('.browser-selection-copy-panel-textarea') as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();

      // 验证 CSV 按钮存在
      const csvBtn = document.querySelector('.browser-selection-copy-panel-csv-btn');
      expect(csvBtn).toBeTruthy();

      // 验证复制按钮存在
      const copyBtn = document.querySelector('.browser-selection-copy-panel-copy-btn');
      expect(copyBtn).toBeTruthy();
    });

    test('CSV 按钮应该在复制按钮之前', () => {
      const table = [['测试']];
      const csv = 'test';

      panel.showAligned(table);
      panel.enableCSVExport(csv);

      const copyWrapper = document.querySelector('.browser-selection-copy-panel-copy-wrapper');
      const children = Array.from(copyWrapper?.children || []);

      expect(children.length).toBeGreaterThanOrEqual(2);
      expect(children[0].classList.contains('browser-selection-copy-panel-csv-btn')).toBe(true);
      expect(children[1].classList.contains('browser-selection-copy-panel-copy-btn')).toBe(true);
    });
  });

  describe('回归测试 - 确保原有功能不受影响', () => {
    test('show 方法应该仍然正常工作', () => {
      const testText = '测试文本';
      panel.show(testText, { position: { left: 100, top: 100 } });

      const panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();

      const textarea = document.querySelector('.browser-selection-copy-panel-textarea') as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      expect(textarea.value).toBe(testText);
    });

    test('showLimitReached 方法应该仍然正常工作', () => {
      panel.showLimitReached();

      const panelElement = document.querySelector('.browser-selection-copy-panel');
      expect(panelElement).toBeTruthy();

      const message = panelElement?.querySelector('.browser-selection-copy-panel-message');
      expect(message?.textContent).toBe('今日免费次数已用完');
    });

    test('hide 方法应该能够隐藏所有类型的面板', () => {
      // 测试 showAligned
      panel.showAligned([['测试']]);
      expect(document.querySelector('.browser-selection-copy-panel')).toBeTruthy();
      panel.hide();
      expect(document.querySelector('.browser-selection-copy-panel')).toBeFalsy();

      // 测试 showProRequired
      panel.showProRequired();
      expect(document.querySelector('.browser-selection-copy-panel')).toBeTruthy();
      panel.hide();
      expect(document.querySelector('.browser-selection-copy-panel')).toBeFalsy();
    });

    test('contains 方法应该对所有类型的面板都有效', () => {
      // 测试 showAligned
      panel.showAligned([['测试']]);
      const textarea = document.querySelector('.browser-selection-copy-panel-textarea');
      expect(panel.contains(textarea)).toBe(true);
      panel.hide();

      // 测试 showProRequired
      panel.showProRequired();
      const upgradeBtn = document.querySelector('.browser-selection-copy-panel-upgrade-btn');
      expect(panel.contains(upgradeBtn)).toBe(true);
    });
  });
});
