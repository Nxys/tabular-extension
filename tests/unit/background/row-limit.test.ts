/**
 * 行数限制功能单元测试
 * 
 * 测试范围：
 * - Free 用户行数限制
 * - Pro 用户无限制
 * - 行数限制提示文案
 */

import { setToStorage } from '../../../src/background/storage';
import { handleActionRequest } from '../../../src/background';

describe('行数限制逻辑', () => {
  beforeEach(() => {
    // 清空存储
    if (global.chrome?.storage?.local) {
      (global.chrome.storage.local as any).data?.clear();
    }
    
    // 设置固定日期
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * 测试 Free 用户被限制为 5 行
   * 需求：1.3, 2.2, 2.3, 2.4
   */
  it('应该限制 Free 用户为 5 行', async () => {
    // Arrange
    // 创建超过 5 行的数据
    const data = 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8';
    const payload = {
      action: 'text-extract' as const,
      data
    };

    // Act
    const result = await handleActionRequest(payload);

    // Assert
    expect(result.status).toBe('ok');
    expect(result.uiAction).toBe('SHOW_RESULT_PANEL');
    
    // 验证数据被限制为 5 行
    const limitedData = result.data as string;
    const lines = limitedData.split('\n');
    expect(lines.length).toBe(5);
    expect(limitedData).toBe('line1\nline2\nline3\nline4\nline5');
    
    // 验证 uiData 包含限制信息
    expect(result.uiData?.isLimited).toBe(true);
    expect(result.uiData?.rowLimit).toBe(5);
    expect(result.uiData?.totalRows).toBe(8);
  });

  /**
   * 测试 Free 用户少于 5 行时不限制
   * 需求：1.3, 2.2
   */
  it('应该在数据少于 5 行时不限制 Free 用户', async () => {
    // Arrange
    // 创建少于 5 行的数据
    const data = 'line1\nline2\nline3';
    const payload = {
      action: 'text-extract' as const,
      data
    };

    // Act
    const result = await handleActionRequest(payload);

    // Assert
    expect(result.status).toBe('ok');
    expect(result.uiAction).toBe('SHOW_RESULT_PANEL');
    
    // 验证数据未被限制
    expect(result.data).toBe(data);
    expect(result.uiData?.isLimited).toBe(false);
    expect(result.uiData?.totalRows).toBe(3);
  });

  /**
   * 测试 Pro 用户不受限制
   * 需求：1.3, 2.6
   */
  it('应该不限制 Pro 用户', async () => {
    // Arrange
    // 启用 Pro
    await setToStorage('pro_state', {
      isPro: true,
      signature: 'test',
      features: {
        'table-detect': true,
        'column-align': true,
        'csv-export': true
      }
    });
    
    // 创建超过 5 行的数据
    const data = 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10';
    const payload = {
      action: 'text-extract' as const,
      data
    };

    // Act
    const result = await handleActionRequest(payload);

    // Assert
    expect(result.status).toBe('ok');
    expect(result.uiAction).toBe('SHOW_RESULT_PANEL');
    
    // 验证数据未被限制
    expect(result.data).toBe(data);
    const lines = (result.data as string).split('\n');
    expect(lines.length).toBe(10);
    
    // 验证 uiData 显示未限制
    expect(result.uiData?.isLimited).toBe(false);
    expect(result.uiData?.totalRows).toBe(10);
  });

  /**
   * 测试行数限制提示文案生成
   * 需求：2.5
   */
  it('应该生成行数限制提示文案', async () => {
    // Arrange
    // 创建超过 5 行的数据
    const data = 'line1\nline2\nline3\nline4\nline5\nline6\nline7';
    const payload = {
      action: 'text-extract' as const,
      data
    };

    // Act
    const result = await handleActionRequest(payload);

    // Assert
    expect(result.uiData?.limitMessage).toBeDefined();
    expect(result.uiData?.limitMessage).toContain('仅展示前 5 行');
  });

  /**
   * 测试未限制时不生成提示文案
   * 需求：2.5
   */
  it('应该在未限制时不生成提示文案', async () => {
    // Arrange
    // 创建少于 5 行的数据
    const data = 'line1\nline2\nline3';
    const payload = {
      action: 'text-extract' as const,
      data
    };

    // Act
    const result = await handleActionRequest(payload);

    // Assert
    expect(result.uiData?.message).toBeUndefined();
  });

  /**
   * 测试恰好 5 行时不限制
   * 需求：1.3, 2.2
   */
  it('应该在恰好 5 行时不限制', async () => {
    // Arrange
    // 创建恰好 5 行的数据
    const data = 'line1\nline2\nline3\nline4\nline5';
    const payload = {
      action: 'text-extract' as const,
      data
    };

    // Act
    const result = await handleActionRequest(payload);

    // Assert
    expect(result.status).toBe('ok');
    expect(result.data).toBe(data);
    expect(result.uiData?.isLimited).toBe(false);
    expect(result.uiData?.totalRows).toBe(5);
    expect(result.uiData?.message).toBeUndefined();
  });
});
