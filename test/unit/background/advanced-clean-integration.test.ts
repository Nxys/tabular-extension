/**
 * 高级清洗集成测试
 * 
 * 测试 advanced-clean Action 的完整流程
 */

import { handleActionRequest } from '../../../src/background';
import * as usage from '../../../src/background/usage';
import * as pro from '../../../src/background/pro';

// Mock 模块
jest.mock('../usage');
jest.mock('../pro');
jest.mock('../storage');

const mockUsage = usage as jest.Mocked<typeof usage>;
const mockPro = pro as jest.Mocked<typeof pro>;

describe('高级清洗集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 默认设置：Free 用户，有试用次数
    mockPro.allow.mockResolvedValue(false);
    mockUsage.authorize.mockResolvedValue(true);
    mockUsage.checkTrial.mockResolvedValue({
      allowed: true,
      remaining: 3,
      feature: 'advanced-cleaning'
    });
    mockUsage.evolveTrial.mockResolvedValue(undefined);
  });

  describe('Pro 用户', () => {
    beforeEach(() => {
      mockPro.allow.mockResolvedValue(true);
    });

    test('应该成功应用高级清洗规则', async () => {
      const result = await handleActionRequest({
        action: 'advanced-clean',
        data: {
          text: 'line1\n\nline2\nline2\nline3',
          cleaningRules: {
            removeEmptyLines: true,
            mergeMultipleLines: false,
            mergeToSingleLine: false,
            removeDuplicates: true
          },
          operation: 'copy'
        }
      });

      expect(result.status).toBe('ok');
      expect(result.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(result.data).toBe('line1\nline2\nline3');
      expect(result.uiData?.isLimited).toBe(false);
    });

    test('应该不消耗试用次数', async () => {
      await handleActionRequest({
        action: 'advanced-clean',
        data: {
          text: 'test',
          cleaningRules: {
            removeEmptyLines: false,
            mergeMultipleLines: false,
            mergeToSingleLine: false,
            removeDuplicates: false
          },
          operation: 'copy'
        }
      });

      expect(mockUsage.evolveTrial).not.toHaveBeenCalled();
    });

    test('应该不受行数限制', async () => {
      const longText = Array(10).fill('line').join('\n');
      
      const result = await handleActionRequest({
        action: 'advanced-clean',
        data: {
          text: longText,
          cleaningRules: {
            removeEmptyLines: false,
            mergeMultipleLines: false,
            mergeToSingleLine: false,
            removeDuplicates: false
          },
          operation: 'copy'
        }
      });

      expect(result.uiData?.totalRows).toBe(10);
      expect(result.uiData?.isLimited).toBe(false);
      expect(result.uiData?.rowLimit).toBeUndefined();
    });
  });

  describe('Free 用户 - 有试用次数', () => {
    test('应该成功应用高级清洗规则', async () => {
      const result = await handleActionRequest({
        action: 'advanced-clean',
        data: {
          text: 'line1\n\nline2',
          cleaningRules: {
            removeEmptyLines: true,
            mergeMultipleLines: false,
            mergeToSingleLine: false,
            removeDuplicates: false
          },
          operation: 'copy'
        }
      });

      expect(result.status).toBe('ok');
      expect(result.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(result.data).toBe('line1\nline2');
    });

    test('应该消耗试用次数', async () => {
      await handleActionRequest({
        action: 'advanced-clean',
        data: {
          text: 'test',
          cleaningRules: {
            removeEmptyLines: false,
            mergeMultipleLines: false,
            mergeToSingleLine: false,
            removeDuplicates: false
          },
          operation: 'copy'
        }
      });

      expect(mockUsage.evolveTrial).toHaveBeenCalledWith('advanced-cleaning');
    });

    test('应该受 5 行限制', async () => {
      const longText = Array(10).fill('line').join('\n');
      
      const result = await handleActionRequest({
        action: 'advanced-clean',
        data: {
          text: longText,
          cleaningRules: {
            removeEmptyLines: false,
            mergeMultipleLines: false,
            mergeToSingleLine: false,
            removeDuplicates: false
          },
          operation: 'copy'
        }
      });

      expect(result.uiData?.totalRows).toBe(10);
      expect(result.uiData?.isLimited).toBe(true);
      expect(result.uiData?.rowLimit).toBe(5);
      expect(result.uiData?.limitMessage).toContain('仅展示前 5 行');
      
      // 验证数据被限制为 5 行
      const lines = (result.data as string).split('\n');
      expect(lines.length).toBe(5);
    });

    test('应该支持导出操作并生成 CSV', async () => {
      const result = await handleActionRequest({
        action: 'advanced-clean',
        data: {
          text: 'line1\nline2\nline3',
          cleaningRules: {
            removeEmptyLines: false,
            mergeMultipleLines: false,
            mergeToSingleLine: false,
            removeDuplicates: false
          },
          operation: 'export',
          exportFormat: 'csv'
        }
      });

      expect(result.status).toBe('ok');
      expect(result.uiData?.csv).toBeDefined();
      expect(result.uiData?.csv).toContain('line1');
    });
  });

  describe('Free 用户 - 试用次数用尽', () => {
    beforeEach(() => {
      mockUsage.authorize.mockResolvedValue(false);
      mockUsage.checkTrial.mockResolvedValue({
        allowed: false,
        remaining: 0,
        feature: 'advanced-cleaning'
      });
    });

    test('应该返回试用次数用尽提示', async () => {
      const result = await handleActionRequest({
        action: 'advanced-clean',
        data: {
          text: 'test',
          cleaningRules: {
            removeEmptyLines: false,
            mergeMultipleLines: false,
            mergeToSingleLine: false,
            removeDuplicates: false
          },
          operation: 'copy'
        }
      });

      expect(result.status).toBe('blocked');
      expect(result.uiAction).toBe('SHOW_TRIAL_EXHAUSTED');
      expect(result.uiData?.message).toContain('高级清洗试用次数已用完');
      expect(result.uiData?.message).toContain('升级 Pro 版解锁以下权益');
      expect(result.uiData?.message).toContain('无行数限制');
      expect(result.uiData?.message).toContain('高级清洗功能无限使用');
      expect(result.uiData?.trialRemaining).toBe(0);
    });

    test('应该不消耗试用次数', async () => {
      await handleActionRequest({
        action: 'advanced-clean',
        data: {
          text: 'test',
          cleaningRules: {
            removeEmptyLines: false,
            mergeMultipleLines: false,
            mergeToSingleLine: false,
            removeDuplicates: false
          },
          operation: 'copy'
        }
      });

      expect(mockUsage.evolveTrial).not.toHaveBeenCalled();
    });
  });

  describe('清洗规则应用', () => {
    test('应该正确应用去空行规则', async () => {
      const result = await handleActionRequest({
        action: 'advanced-clean',
        data: {
          text: 'line1\n\nline2\n  \nline3',
          cleaningRules: {
            removeEmptyLines: true,
            mergeMultipleLines: false,
            mergeToSingleLine: false,
            removeDuplicates: false
          },
          operation: 'copy'
        }
      });

      expect(result.data).toBe('line1\nline2\nline3');
    });

    test('应该正确应用去重规则', async () => {
      const result = await handleActionRequest({
        action: 'advanced-clean',
        data: {
          text: 'line1\nline2\nline1\nline3',
          cleaningRules: {
            removeEmptyLines: false,
            mergeMultipleLines: false,
            mergeToSingleLine: false,
            removeDuplicates: true
          },
          operation: 'copy'
        }
      });

      expect(result.data).toBe('line1\nline2\nline3');
    });

    test('应该正确应用合并为一行规则', async () => {
      const result = await handleActionRequest({
        action: 'advanced-clean',
        data: {
          text: 'line1\nline2\nline3',
          cleaningRules: {
            removeEmptyLines: false,
            mergeMultipleLines: false,
            mergeToSingleLine: true,
            removeDuplicates: false
          },
          operation: 'copy'
        }
      });

      expect(result.data).toBe('line1 line2 line3');
    });

    test('应该正确应用自定义分隔符规则', async () => {
      const result = await handleActionRequest({
        action: 'advanced-clean',
        data: {
          text: 'line1\nline2\nline3',
          cleaningRules: {
            removeEmptyLines: false,
            mergeMultipleLines: true,
            customSeparator: ', ',
            mergeToSingleLine: false,
            removeDuplicates: false
          },
          operation: 'copy'
        }
      });

      expect(result.data).toBe('line1, line2, line3');
    });

    test('应该正确应用组合规则', async () => {
      const result = await handleActionRequest({
        action: 'advanced-clean',
        data: {
          text: 'line1\n\nline2\nline2\nline3',
          cleaningRules: {
            removeEmptyLines: true,
            mergeMultipleLines: false,
            mergeToSingleLine: false,
            removeDuplicates: true
          },
          operation: 'copy'
        }
      });

      expect(result.data).toBe('line1\nline2\nline3');
    });
  });
});
