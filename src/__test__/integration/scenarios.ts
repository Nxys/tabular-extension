/**
 * 端到端场景构建器
 * 提供预定义的测试场景，简化复杂场景的设置
 */

import type {
  ActionType,
  ActionResultMessage,
} from '../../shared/types';
import { sendRequestAction } from './helpers';

/**
 * 文本提取场景
 */
export interface TextExtractionScenario {
  text: string;
  expectedResult: ActionResultMessage['payload'];
}

/**
 * 表格检测场景
 */
export interface TableDetectionScenario {
  table: string[][];
  hasPro: boolean;
  expectedResult: ActionResultMessage['payload'];
}

/**
 * 使用次数限制场景
 */
export interface UsageLimitScenario {
  currentUsage: number;
  maxUsage: number;
  action: ActionType;
  expectedResult: ActionResultMessage['payload'];
}

/**
 * 创建文本提取场景
 * @param text 要提取的文本
 * @returns 文本提取场景
 */
export function createTextExtractionScenario(
  text: string
): TextExtractionScenario {
  return {
    text,
    expectedResult: {
      status: 'ok',
      uiAction: 'SHOW_RESULT_PANEL',
      data: text,
      uiData: {
        text,
      },
    },
  };
}

/**
 * 创建表格检测场景
 * @param table 表格数据
 * @param hasPro 是否有 Pro 权限
 * @returns 表格检测场景
 */
export function createTableDetectionScenario(
  table: string[][],
  hasPro: boolean
): TableDetectionScenario {
  if (hasPro) {
    return {
      table,
      hasPro,
      expectedResult: {
        status: 'ok',
        uiAction: 'SHOW_RESULT_PANEL',
        data: table,
      },
    };
  } else {
    return {
      table,
      hasPro,
      expectedResult: {
        status: 'blocked',
        uiAction: 'SHOW_PRO_PANEL',
        uiData: {
          message: '表格识别是 Pro 功能，请升级以使用',
        },
      },
    };
  }
}

/**
 * 创建使用次数限制场景
 * @param currentUsage 当前使用次数
 * @param action 操作类型
 * @returns 使用次数限制场景
 */
export function createUsageLimitScenario(
  currentUsage: number,
  action: ActionType
): UsageLimitScenario {
  const maxUsage = 10; // 默认最大使用次数
  
  return {
    currentUsage,
    maxUsage,
    action,
    expectedResult: {
      status: 'limited',
      uiAction: 'SHOW_LIMIT_PANEL',
      uiData: {
        message: `今日免费次数已用完 (${maxUsage}/${maxUsage})，明天将自动重置`,
      },
    },
  };
}

/**
 * 创建并发操作场景
 * @param actions 操作类型数组
 * @returns 所有操作的响应
 */
export async function createConcurrentScenario(
  actions: ActionType[]
): Promise<ActionResultMessage['payload'][]> {
  // 并发执行所有操作
  const promises = actions.map((action) => sendRequestAction(action));
  
  // 等待所有操作完成
  return await Promise.all(promises);
}
