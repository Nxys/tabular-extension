/**
 * index.ts 单元测试
 * 
 * 测试范围：
 * - text-extract action 处理
 * - table-detect action 处理（含 Pro 检查）
 * - column-align action 处理（含 Pro 检查）
 * - csv-export action 处理（含 Pro 检查）
 * - 使用次数限制处理
 * - 异常兜底机制
 * - 未知 action 类型处理
 * - 消息监听器处理
 * - 快捷键处理
 */

import { setToStorage, getFromStorage } from '../storage';
import { checkUsage } from '../usage';
import { allow } from '../pro';

describe('index.ts - 消息处理逻辑', () => {
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

  describe('使用次数限制检查', () => {
    it('应该在达到上限时阻止操作', async () => {
      // Arrange
      await setToStorage('usage_count', 20);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      const usage = await checkUsage();
      
      // Assert
      expect(usage.allowed).toBe(false);
      expect(usage.reason).toBe('limit-reached');
      expect(usage.remaining).toBe(0);
    });

    it('应该在未达到上限时允许操作', async () => {
      // Arrange
      await setToStorage('usage_count', 10);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      const usage = await checkUsage();
      
      // Assert
      expect(usage.allowed).toBe(true);
      expect(usage.remaining).toBe(10);
    });
  });

  describe('Pro 功能权限检查', () => {
    it('应该在未启用 Pro 时阻止 table-detect', async () => {
      // Act
      const allowed = await allow('table-detect');
      
      // Assert
      expect(allowed).toBe(false);
    });

    it('应该在未启用 Pro 时阻止 column-align', async () => {
      // Act
      const allowed = await allow('column-align');
      
      // Assert
      expect(allowed).toBe(false);
    });

    it('应该在未启用 Pro 时阻止 csv-export', async () => {
      // Act
      const allowed = await allow('csv-export');
      
      // Assert
      expect(allowed).toBe(false);
    });

    it('应该在启用 Pro 后允许功能', async () => {
      // Arrange
      await setToStorage('pro_state', {
        isPro: true,
        signature: 'test',
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      });
      
      // Act & Assert
      expect(await allow('table-detect')).toBe(true);
      expect(await allow('column-align')).toBe(true);
      expect(await allow('csv-export')).toBe(true);
    });
  });

  describe('消息处理集成', () => {
    it('应该正确组合使用次数检查和 Pro 权限检查', async () => {
      // Arrange - 设置使用次数未达上限
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act - 检查使用次数
      const usage = await checkUsage();
      
      // Assert - 应该允许使用
      expect(usage.allowed).toBe(true);
      
      // Act - 检查 Pro 功能
      const proAllowed = await allow('table-detect');
      
      // Assert - 应该被 Pro 限制阻止
      expect(proAllowed).toBe(false);
    });

    it('应该在达到使用上限时优先返回限制提示', async () => {
      // Arrange - 设置使用次数达到上限
      await setToStorage('usage_count', 20);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      const usage = await checkUsage();
      
      // Assert - 应该被使用次数限制阻止
      expect(usage.allowed).toBe(false);
      expect(usage.reason).toBe('limit-reached');
    });

    it('应该在启用 Pro 且未达上限时允许所有操作', async () => {
      // Arrange
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      await setToStorage('pro_state', {
        isPro: true,
        signature: 'test',
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      });
      
      // Act
      const usage = await checkUsage();
      const tableDetectAllowed = await allow('table-detect');
      const columnAlignAllowed = await allow('column-align');
      const csvExportAllowed = await allow('csv-export');
      
      // Assert
      expect(usage.allowed).toBe(true);
      expect(tableDetectAllowed).toBe(true);
      expect(columnAlignAllowed).toBe(true);
      expect(csvExportAllowed).toBe(true);
    });
  });

  describe('使用次数限制处理', () => {
    /**
     * 测试达到使用次数限制时返回 SHOW_LIMIT_PANEL
     * 需求：1.6
     */
    it('应该在达到使用次数限制时返回 SHOW_LIMIT_PANEL', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数达到上限
      await setToStorage('usage_count', 20);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      const payload = {
        action: 'text-extract' as const,
        data: 'test data'
      };

      // Act
      const result = await handleActionRequest(payload);

      // Assert - 验证返回 SHOW_LIMIT_PANEL
      expect(result.status).toBe('limited');
      expect(result.uiAction).toBe('SHOW_LIMIT_PANEL');
      expect(result.uiData).toBeDefined();
      expect(result.uiData?.message).toBeDefined();
    });

    /**
     * 验证限制提示文案的内容
     * 需求：1.6
     */
    it('应该返回包含次数信息的限制提示文案', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数达到上限
      await setToStorage('usage_count', 20);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      const payload = {
        action: 'text-extract' as const,
        data: 'test data'
      };

      // Act
      const result = await handleActionRequest(payload);

      // Assert - 验证文案内容
      expect(result.uiData?.message).toContain('今日免费次数已用完');
      expect(result.uiData?.message).toContain('20/20');
      expect(result.uiData?.message).toContain('明天将自动重置');
    });

    /**
     * 测试不同 action 类型在达到限制时都返回相同的限制提示
     * 需求：1.6
     */
    it('应该对所有 action 类型在达到限制时返回一致的限制提示', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数达到上限
      await setToStorage('usage_count', 20);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      const actions = ['text-extract', 'table-detect', 'column-align', 'csv-export'] as const;

      // Act & Assert
      for (const action of actions) {
        const result = await handleActionRequest({
          action,
          data: {}
        });

        expect(result.status).toBe('limited');
        expect(result.uiAction).toBe('SHOW_LIMIT_PANEL');
        expect(result.uiData?.message).toContain('今日免费次数已用完');
      }
    });

    /**
     * 测试未达到限制时不返回 SHOW_LIMIT_PANEL
     * 需求：1.6
     */
    it('应该在未达到限制时不返回 SHOW_LIMIT_PANEL', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数未达上限
      await setToStorage('usage_count', 10);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      const payload = {
        action: 'text-extract' as const,
        data: 'test data'
      };

      // Act
      const result = await handleActionRequest(payload);

      // Assert - 应该返回成功状态，而不是限制状态
      expect(result.status).toBe('ok');
      expect(result.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(result.uiAction).not.toBe('SHOW_LIMIT_PANEL');
    });

    /**
     * 测试限制检查优先于 Pro 权限检查
     * 需求：1.6
     */
    it('应该在达到限制时优先返回限制提示，而不是 Pro 提示', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数达到上限
      await setToStorage('usage_count', 20);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // 未启用 Pro（默认状态）
      const payload = {
        action: 'table-detect' as const,
        data: {}
      };

      // Act
      const result = await handleActionRequest(payload);

      // Assert - 应该返回限制提示，而不是 Pro 提示
      expect(result.status).toBe('limited');
      expect(result.uiAction).toBe('SHOW_LIMIT_PANEL');
      expect(result.uiAction).not.toBe('SHOW_PRO_PANEL');
    });
  });

  describe('异常处理', () => {
    /**
     * 测试未知 action 类型的处理
     * 需求：1.7, 8.2
     */
    it('应该对未知 action 类型返回兜底响应', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      const unknownPayload = {
        action: 'unknown-action' as any,
        data: {}
      };

      // Act
      const result = await handleActionRequest(unknownPayload);

      // Assert - 验证兜底响应格式
      expect(result).toEqual({
        status: 'blocked',
        uiAction: 'SHOW_RESULT_PANEL',
        uiData: {
          message: '未知操作类型'
        }
      });
    });

    /**
     * 测试 action 处理函数内部异常的兜底
     * 需求：1.7, 8.2
     */
    it('应该在 action 处理函数抛出异常时返回兜底响应', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      
      // 模拟 checkUsage 抛出异常
      const checkUsageSpy = jest.spyOn(require('../usage'), 'checkUsage')
        .mockRejectedValueOnce(new Error('Storage error'));

      const payload = {
        action: 'text-extract' as const,
        data: 'test data'
      };

      // Act
      const result = await handleActionRequest(payload);

      // Assert - 验证兜底响应格式
      expect(result).toEqual({
        status: 'blocked',
        uiAction: 'SHOW_RESULT_PANEL',
        uiData: {
          message: '操作失败，请重试'
        }
      });

      // 清理
      checkUsageSpy.mockRestore();
    });

    /**
     * 验证兜底响应格式的完整性
     * 需求：1.7, 8.2
     */
    it('兜底响应应该包含所有必需字段', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      const invalidPayload = {
        action: 'invalid-action' as any,
        data: {}
      };

      // Act
      const result = await handleActionRequest(invalidPayload);

      // Assert - 验证响应格式
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('uiAction');
      expect(result).toHaveProperty('uiData');
      expect(result.status).toBe('blocked');
      expect(result.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(result.uiData).toHaveProperty('message');
      expect(typeof result.uiData?.message).toBe('string');
      expect(result.uiData?.message).toBeTruthy();
    });

    /**
     * 测试多种未知 action 类型都返回一致的兜底响应
     * 需求：1.7, 8.2
     */
    it('应该对所有未知 action 类型返回一致的兜底响应', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      const unknownActions = ['unknown-1', 'unknown-2', 'invalid', ''];

      // Act & Assert
      for (const action of unknownActions) {
        const result = await handleActionRequest({
          action: action as any,
          data: {}
        });

        expect(result.status).toBe('blocked');
        expect(result.uiAction).toBe('SHOW_RESULT_PANEL');
        expect(result.uiData?.message).toBe('未知操作类型');
      }
    });
  });

  describe('Action 处理函数', () => {
    /**
     * 测试 text-extract action 的完整流程
     * 需求：1.6
     */
    it('应该正确处理 text-extract action', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数未达上限
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      const payload = {
        action: 'text-extract' as const,
        data: 'extracted text content'
      };

      // Act
      const result = await handleActionRequest(payload);

      // Assert
      expect(result.status).toBe('ok');
      expect(result.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(result.data).toBe('extracted text content');
      expect(result.uiData?.text).toBe('extracted text content');
      
      // 验证使用次数已增加
      const usageCount = await getFromStorage('usage_count', 0);
      expect(usageCount).toBe(6);
    });

    /**
     * 测试 table-detect action 需要 Pro 权限
     * 需求：1.6
     */
    it('应该在没有 Pro 权限时阻止 table-detect', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数未达上限
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      const payload = {
        action: 'table-detect' as const,
        data: { table: [['a', 'b'], ['c', 'd']] }
      };

      // Act
      const result = await handleActionRequest(payload);

      // Assert
      expect(result.status).toBe('blocked');
      expect(result.uiAction).toBe('SHOW_PRO_PANEL');
      expect(result.uiData?.message).toContain('表格识别是 Pro 功能');
    });

    /**
     * 测试 table-detect action 在有 Pro 权限时成功
     * 需求：1.6
     */
    it('应该在有 Pro 权限时允许 table-detect', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数未达上限
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
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
      
      const payload = {
        action: 'table-detect' as const,
        data: { table: [['a', 'b'], ['c', 'd']] }
      };

      // Act
      const result = await handleActionRequest(payload);

      // Assert
      expect(result.status).toBe('ok');
      expect(result.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(result.data).toEqual({ table: [['a', 'b'], ['c', 'd']] });
      
      // 验证使用次数已增加
      const usageCount = await getFromStorage('usage_count', 0);
      expect(usageCount).toBe(6);
    });

    /**
     * 测试 column-align action 需要 Pro 权限
     * 需求：1.6
     */
    it('应该在没有 Pro 权限时阻止 column-align', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数未达上限
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      const payload = {
        action: 'column-align' as const,
        data: [['a', 'b'], ['c', 'd']]
      };

      // Act
      const result = await handleActionRequest(payload);

      // Assert
      expect(result.status).toBe('blocked');
      expect(result.uiAction).toBe('SHOW_PRO_PANEL');
      expect(result.uiData?.message).toContain('列对齐是 Pro 功能');
    });

    /**
     * 测试 column-align action 在有 Pro 权限时成功
     * 需求：1.6
     */
    it('应该在有 Pro 权限时允许 column-align', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数未达上限
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
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
      
      const tableData = [['a', 'b'], ['c', 'd']];
      const payload = {
        action: 'column-align' as const,
        data: tableData
      };

      // Act
      const result = await handleActionRequest(payload);

      // Assert
      expect(result.status).toBe('ok');
      expect(result.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(result.data).toEqual(tableData);
      expect(result.uiData?.table).toEqual(tableData);
    });

    /**
     * 测试 csv-export action 需要 Pro 权限
     * 需求：1.6
     */
    it('应该在没有 Pro 权限时阻止 csv-export', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数未达上限
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      const payload = {
        action: 'csv-export' as const,
        data: 'a,b\nc,d'
      };

      // Act
      const result = await handleActionRequest(payload);

      // Assert
      expect(result.status).toBe('blocked');
      expect(result.uiAction).toBe('SHOW_PRO_PANEL');
      expect(result.uiData?.message).toContain('CSV 导出是 Pro 功能');
    });

    /**
     * 测试 csv-export action 在有 Pro 权限时成功
     * 需求：1.6
     */
    it('应该在有 Pro 权限时允许 csv-export', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数未达上限
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
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
      
      const tableData = [['a', 'b'], ['c', 'd']];
      const expectedCSV = 'a,b\nc,d';
      const payload = {
        action: 'csv-export' as const,
        data: tableData
      };

      // Act
      const result = await handleActionRequest(payload);

      // Assert
      expect(result.status).toBe('ok');
      expect(result.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(result.data).toEqual(tableData);
      expect(result.uiData?.csv).toBe(expectedCSV);
    });
  });

  describe('行数限制逻辑', () => {
    /**
     * 测试 Free 用户被限制为 5 行
     * 需求：1.3, 2.2, 2.3, 2.4
     */
    it('应该限制 Free 用户为 5 行', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数未达上限
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
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
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数未达上限
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
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
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数未达上限
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
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
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数未达上限
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // 创建超过 5 行的数据
      const data = 'line1\nline2\nline3\nline4\nline5\nline6\nline7';
      const payload = {
        action: 'text-extract' as const,
        data
      };

      // Act
      const result = await handleActionRequest(payload);

      // Assert
      expect(result.uiData?.message).toBeDefined();
      expect(result.uiData?.message).toBe('Free 版最多处理 5 行，升级 Pro 解锁完整数据');
    });

    /**
     * 测试未限制时不生成提示文案
     * 需求：2.5
     */
    it('应该在未限制时不生成提示文案', async () => {
      // Arrange
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数未达上限
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
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
      const { handleActionRequest } = await import('../index');
      
      // 设置使用次数未达上限
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
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
});
