/**
 * Background 入口 + 消息分发 + Action 处理
 * 
 * 职责：
 * - 消息监听和路由
 * - Action 请求处理
 * - 统一异常兜底
 * - 快捷键处理
 * 
 * ActionHandler 职责边界说明：
 * - 当前允许：生成 uiData.message 文案
 * - 当前禁止：UI 状态管理、A/B 测试逻辑、国际化逻辑
 * - 架构演进：这是阶段性集中实现，未来可迁移至专用文案模块
 */

import type { ExtensionMessage, RequestActionMessage, ActionResultMessage, AdvancedFeature, ExportFormat } from '../shared/types';
import { checkUsage, consumeUsage, record, checkTrial, evolveTrial, authorize, getAllTrials } from './usage';
import { allow } from './pro';
import { getSettings, updateSettings } from './settings';
import { advancedClean, type CleaningRules } from './cleaner';
import { toCSV, exportData } from './exporter';

/**
 * 消息监听器
 */
chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) => {
  // 处理消息并发送响应
  handleMessage(message).then(sendResponse);
  
  // 返回 true 表示异步响应
  return true;
});

/**
 * 处理消息
 */
async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  try {
    if (message.type === 'REQUEST_ACTION') {
      return await handleActionRequest(message.payload);
    } else {
      return { error: 'Unknown message type' };
    }
  } catch (error) {
    console.error('Message handling error:', error);
    // 统一异常兜底返回
    return {
      status: 'blocked',
      uiAction: 'SHOW_RESULT_PANEL',
      uiData: {
        message: '操作失败，请重试'
      }
    };
  }
}

/**
 * 处理 Action 请求
 * 导出用于测试
 */
async function handleActionRequest(
  payload: RequestActionMessage['payload']
): Promise<ActionResultMessage['payload']> {
  const { action, data } = payload;
  
  try {
    // 高级能力不需要检查基础 usage 限制
    if (action === 'advanced-clean' || action === 'table-export' || action === 'check-trial') {
      switch (action) {
        case 'advanced-clean':
          return await handleAdvancedClean(data);
        
        case 'table-export':
          return await handleTableExport(data);
        
        case 'check-trial':
          return await handleCheckTrial(data);
      }
    }
    
    // 1. 检查免费次数限制（仅用于基础能力）
    const usage = await checkUsage();
    if (!usage.allowed) {
      return {
        status: 'limited',
        uiAction: 'SHOW_LIMIT_PANEL',
        uiData: {
          message: `今日免费次数已用完 (${usage.max}/${usage.max})，明天将自动重置`
        }
      };
    }
    
    // 2. 根据 action 类型处理
    switch (action) {
      case 'text-extract':
        return await handleTextExtract(data);
      
      case 'table-detect':
        return await handleTableDetect(data);
      
      case 'column-align':
        return await handleColumnAlign(data);
      
      case 'csv-export':
        return await handleCSVExport(data);
      
      default:
        // 未知操作类型，返回兜底结果
        return {
          status: 'blocked',
          uiAction: 'SHOW_RESULT_PANEL',
          uiData: {
            message: '未知操作类型'
          }
        };
    }
  } catch (error) {
    // 统一异常兜底返回
    console.error('Action handler error:', error);
    return {
      status: 'blocked',
      uiAction: 'SHOW_RESULT_PANEL',
      uiData: {
        message: '操作失败，请重试'
      }
    };
  }
}

/**
 * 处理文本提取
 */
async function handleTextExtract(data: unknown): Promise<ActionResultMessage['payload']> {
  // 检查是否为 Pro 用户
  const isPro = await allow('table-detect'); // 使用任意 Pro 功能检查 Pro 状态
  
  // 应用行数限制
  const { limitedData, isLimited, totalRows } = await applyRowLimit(data as string, isPro);
  
  // 构建 uiData
  const uiData: ActionResultMessage['payload']['uiData'] = {
    text: limitedData,
    totalRows: totalRows,
    isLimited: isLimited
  };
  
  // 只在限制时添加 rowLimit 和 limitMessage
  if (isLimited) {
    uiData.rowLimit = 5;
    uiData.limitMessage = `仅展示前 5 行（共 ${totalRows} 行），升级 Pro 解锁完整数据`;
  }
  
  const result: ActionResultMessage['payload'] = {
    status: 'ok',
    uiAction: 'SHOW_RESULT_PANEL',
    data: limitedData,
    uiData
  };
  
  // 只在成功后记录和消耗 usage
  await record('select');
  await consumeUsage();
  
  return result;
}

/**
 * 应用行数限制
 * @param data 原始数据（字符串）
 * @param isPro 是否为 Pro 用户
 * @returns 限制后的数据和元信息
 */
async function applyRowLimit(
  data: string,
  isPro: boolean
): Promise<{ limitedData: string; isLimited: boolean; totalRows: number }> {
  // Pro 用户不限制
  if (isPro) {
    const lines = data.split('\n');
    return {
      limitedData: data,
      isLimited: false,
      totalRows: lines.length
    };
  }
  
  // Free 用户限制为 5 行
  const lines = data.split('\n');
  const totalRows = lines.length;
  
  if (totalRows <= 5) {
    return {
      limitedData: data,
      isLimited: false,
      totalRows: totalRows
    };
  }
  
  // 限制为前 5 行
  const limitedLines = lines.slice(0, 5);
  const limitedData = limitedLines.join('\n');
  
  return {
    limitedData,
    isLimited: true,
    totalRows: totalRows
  };
}

/**
 * 处理表格检测
 */
async function handleTableDetect(data: unknown): Promise<ActionResultMessage['payload']> {
  // 检查 Pro 权限
  if (!await allow('table-detect')) {
    return {
      status: 'blocked',
      uiAction: 'SHOW_PRO_PANEL',
      uiData: {
        message: '表格识别是 Pro 功能，请升级以使用'
      }
    };
  }
  
  const result: ActionResultMessage['payload'] = {
    status: 'ok',
    uiAction: 'SHOW_RESULT_PANEL',
    data
  };
  
  // 只在成功后记录和消耗 usage
  await record('table-detect');
  await consumeUsage();
  
  return result;
}

/**
 * 处理列对齐
 */
async function handleColumnAlign(data: unknown): Promise<ActionResultMessage['payload']> {
  // 检查 Pro 权限
  if (!await allow('column-align')) {
    return {
      status: 'blocked',
      uiAction: 'SHOW_PRO_PANEL',
      uiData: {
        message: '列对齐是 Pro 功能，请升级以使用'
      }
    };
  }
  
  const result: ActionResultMessage['payload'] = {
    status: 'ok',
    uiAction: 'SHOW_RESULT_PANEL',
    data,
    uiData: {
      table: data as string[][]
    }
  };
  
  // 只在成功后记录 usage（不消耗，因为已经在 table-detect 时消耗过）
  await record('column-align');
  
  return result;
}

/**
 * 处理 CSV 导出
 */
async function handleCSVExport(data: unknown): Promise<ActionResultMessage['payload']> {
  // 检查 Pro 权限
  if (!await allow('csv-export')) {
    return {
      status: 'blocked',
      uiAction: 'SHOW_PRO_PANEL',
      uiData: {
        message: 'CSV 导出是 Pro 功能，请升级以使用'
      }
    };
  }
  
  // 将表格数据转换为 CSV 格式
  const table = data as string[][];
  const csv = tableToCSV(table);
  
  const result: ActionResultMessage['payload'] = {
    status: 'ok',
    uiAction: 'SHOW_RESULT_PANEL',
    data,
    uiData: {
      csv
    }
  };
  
  // 只在成功后记录 usage（不消耗，因为已经在 table-detect 时消耗过）
  await record('csv-export');
  
  return result;
}

/**
 * 将表格数据转换为 CSV 格式
 * @param table 表格数据
 * @returns CSV 字符串
 */
function tableToCSV(table: string[][]): string {
  if (!Array.isArray(table) || table.length === 0) {
    return '';
  }
  
  return table.map(row => {
    return row.map(cell => {
      // 转换为字符串
      const cellStr = String(cell);
      
      // 检查是否需要转义（包含逗号、引号或换行符）
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        // 转义引号（双引号变成两个双引号）
        const escaped = cellStr.replace(/"/g, '""');
        // 用引号包裹
        return `"${escaped}"`;
      }
      
      return cellStr;
    }).join(',');
  }).join('\n');
}

/**
 * 处理试用次数检查
 * 
 * 功能：
 * - 检查指定高级能力的试用次数
 * - 返回剩余次数和可用性状态
 * 
 * 数据格式：
 * - data.feature: 高级能力类型
 */
async function handleCheckTrial(data: unknown): Promise<ActionResultMessage['payload']> {
  const payload = data as {
    feature?: AdvancedFeature;
  };
  
  // 如果未指定 feature，返回所有试用状态
  if (!payload.feature) {
    const allTrials = await getAllTrials();
    
    return {
      status: 'ok',
      uiAction: 'SHOW_RESULT_PANEL',
      data: allTrials,
      uiData: {
        message: '试用次数查询成功'
      }
    };
  }
  
  // 检查指定功能的试用状态
  const trialState = await checkTrial(payload.feature);
  
  return {
    status: 'ok',
    uiAction: 'SHOW_RESULT_PANEL',
    data: trialState,
    uiData: {
      trialRemaining: trialState.remaining,
      message: `${payload.feature} 剩余试用次数：${trialState.remaining}`
    }
  };
}

/**
 * 生成升级提示文案
 * 
 * 根据不同的高级能力生成包含权益说明的提示文案
 * 
 * @param feature 高级能力类型
 * @param remaining 剩余试用次数
 * @returns 提示文案
 */
function generateUpgradePrompt(feature: AdvancedFeature, remaining: number): string {
  const featureNames: Record<AdvancedFeature, string> = {
    'advanced-cleaning': '高级清洗',
    'table-detection': '表格识别',
    'one-click-export': '一键导出'
  };
  
  const featureName = featureNames[feature];
  
  // 基础提示
  const baseMessage = `${featureName}试用次数已用完（剩余 ${remaining} 次）`;
  
  // 权益说明
  const benefits = [
    '✓ 无行数限制，处理完整数据',
    '✓ 高级清洗功能无限使用',
    '✓ 表格识别和一键导出无限使用',
    '✓ 所有高级功能永久解锁'
  ];
  
  const benefitsText = benefits.join('\n');
  
  return `${baseMessage}\n\n升级 Pro 版解锁以下权益：\n${benefitsText}`;
}

/**
 * 解析文本为表格数据
 * 
 * 功能：
 * - 将文本按行分割
 * - 过滤空行
 * - 每行作为一个单元格（简单实现）
 * 
 * @param text 原始文本
 * @returns 二维数组表格数据
 */
function parseTextToTable(text: string): string[][] {
  if (!text || typeof text !== 'string') {
    throw new Error('无效的文本数据');
  }
  
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  return lines.map(line => [line]);
}

/**
 * 处理表格导出
 * 
 * 功能：
 * - 检查 Pro 权限或试用次数
 * - 解析文本为表格数据或使用提供的表格数据
 * - 应用清洗规则（如果选择）
 * - 生成导出文件 Blob
 * - 触发浏览器下载
 * - 消耗试用次数（Free 用户）
 * 
 * 数据格式：
 * - data.text: 文本数据（字符串）- 从 content 层传递
 * - data.format: 导出格式（'csv' 或 'excel'）
 * - data.table: 表格数据（二维数组）- 可选，优先使用
 * - data.exportFormat: 导出格式（'csv' 或 'excel'）- 可选，兼容旧格式
 * - data.cleaningRules: 清洗规则配置（可选）
 */
async function handleTableExport(data: unknown): Promise<ActionResultMessage['payload']> {
  try {
    const payload = data as {
      text?: string;
      format?: string;
      table?: string[][];
      exportFormat?: 'csv' | 'excel';
      cleaningRules?: CleaningRules;
    };
    
    // 检查是否为 Pro 用户
    const isPro = await allow('table-detect');
    
    // 如果不是 Pro 用户，检查试用次数
    if (!isPro) {
      const authorized = await authorize('one-click-export');
      
      if (!authorized) {
        // 试用次数用尽，生成包含权益说明的提示文案
        const trialState = await checkTrial('one-click-export');
        return {
          status: 'blocked',
          uiAction: 'SHOW_TRIAL_EXHAUSTED',
          uiData: {
            message: generateUpgradePrompt('one-click-export', trialState.remaining),
            trialRemaining: trialState.remaining
          }
        };
      }
    }
    
    // 解析表格数据：优先使用 table，否则从 text 解析
    let tableData: string[][];
    if (payload.table && Array.isArray(payload.table)) {
      tableData = payload.table;
    } else if (payload.text) {
      tableData = parseTextToTable(payload.text);
    } else {
      return {
        status: 'blocked',
        uiAction: 'SHOW_RESULT_PANEL',
        uiData: {
          message: '导出失败：未提供有效的数据'
        }
      };
    }
    
    // 确定导出格式
    const format: ExportFormat = (payload.format || payload.exportFormat || 'csv') as ExportFormat;
    
    // 生成导出文件 Blob
    const exportOptions: { format: ExportFormat; cleaningRules?: CleaningRules } = {
      format
    };
    if (payload.cleaningRules) {
      exportOptions.cleaningRules = payload.cleaningRules;
    }
    const blob = await exportData(tableData, exportOptions);
    
    // 生成带时间戳的文件名
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const extension = format === 'csv' ? 'csv' : 'xls';
    const filename = `export_${timestamp}.${extension}`;
    
    // 将 Blob 转换为 Data URL（service worker 不支持 URL.createObjectURL）
    const reader = new FileReader();
    
    return new Promise<ActionResultMessage['payload']>((resolve) => {
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        
        // 使用 chrome.downloads API 触发下载
        chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          saveAs: false  // 直接下载到默认位置，不显示保存对话框
        }, (_downloadId?: number) => {
          if (chrome.runtime.lastError) {
            console.error('Download failed:', chrome.runtime.lastError);
            resolve({
              status: 'blocked',
              uiAction: 'SHOW_RESULT_PANEL',
              uiData: {
                message: `导出失败：${chrome.runtime.lastError.message}`
              }
            });
            return;
          }
          
          // 只在成功后消耗试用次数（Free 用户）
          if (!isPro) {
            evolveTrial('one-click-export').then(() => {
              resolve({
                status: 'ok',
                uiAction: 'SHOW_RESULT_PANEL',
                uiData: {
                  message: '导出成功！文件已保存到下载文件夹。'
                }
              });
            });
          } else {
            resolve({
              status: 'ok',
              uiAction: 'SHOW_RESULT_PANEL',
              uiData: {
                message: '导出成功！文件已保存到下载文件夹。'
              }
            });
          }
        });
      };
      
      reader.onerror = () => {
        resolve({
          status: 'blocked',
          uiAction: 'SHOW_RESULT_PANEL',
          uiData: {
            message: '导出失败：无法读取文件数据'
          }
        });
      };
      
      // 读取 Blob 为 Data URL
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Export error:', error);
    return {
      status: 'blocked',
      uiAction: 'SHOW_RESULT_PANEL',
      uiData: {
        message: `导出失败：${error instanceof Error ? error.message : '未知错误'}`
      }
    };
  }
}

/**
 * 处理高级清洗
 * 
 * 功能：
 * - 检查 Pro 权限或试用次数
 * - 应用清洗规则到数据
 * - 消耗试用次数（Free 用户）
 * - 返回清洗后的数据
 * 
 * 数据格式：
 * - data.text: 原始文本数据（字符串）
 * - data.cleaningRules: 清洗规则配置
 * - data.operation: 操作类型（'copy' 或 'export'）
 * - data.exportFormat: 导出格式（仅当 operation 为 'export' 时）
 */
async function handleAdvancedClean(data: unknown): Promise<ActionResultMessage['payload']> {
  const payload = data as {
    text: string;
    cleaningRules: CleaningRules;
    operation: 'copy' | 'export';
    exportFormat?: 'csv' | 'excel';
  };
  
  // 检查是否为 Pro 用户
  const isPro = await allow('table-detect');
  
  // 如果不是 Pro 用户，检查试用次数
  if (!isPro) {
    const authorized = await authorize('advanced-cleaning');
    
    if (!authorized) {
      // 试用次数用尽，生成包含权益说明的提示文案
      const trialState = await checkTrial('advanced-cleaning');
      return {
        status: 'blocked',
        uiAction: 'SHOW_TRIAL_EXHAUSTED',
        uiData: {
          message: generateUpgradePrompt('advanced-cleaning', trialState.remaining),
          trialRemaining: trialState.remaining
        }
      };
    }
  }
  
  // 应用清洗规则
  const lines = payload.text.split('\n');
  const cleanedLines = advancedClean(lines, payload.cleaningRules);
  const cleanedText = cleanedLines.join('\n');
  
  // 应用行数限制（Free 用户）
  const { limitedData, isLimited, totalRows } = await applyRowLimit(cleanedText, isPro);
  
  // 构建 uiData
  const uiData: ActionResultMessage['payload']['uiData'] = {
    text: limitedData,
    totalRows: totalRows,
    isLimited: isLimited
  };
  
  // 如果是导出操作，生成导出格式数据
  if (payload.operation === 'export') {
    const exportLines = limitedData.split('\n');
    const exportTable = exportLines.map(line => [line]);
    
    if (payload.exportFormat === 'csv') {
      uiData.csv = toCSV(exportTable);
    }
  }
  
  // 只在限制时添加 rowLimit 和 limitMessage
  if (isLimited) {
    uiData.rowLimit = 5;
    uiData.limitMessage = `仅展示前 5 行（共 ${totalRows} 行），升级 Pro 解锁完整数据`;
  }
  
  const result: ActionResultMessage['payload'] = {
    status: 'ok',
    uiAction: 'SHOW_RESULT_PANEL',
    data: limitedData,
    uiData
  };
  
  // 只在成功后消耗试用次数（Free 用户）
  if (!isPro) {
    await evolveTrial('advanced-cleaning');
  }
  
  return result;
}

// 快捷键处理
chrome.commands.onCommand.addListener(async (command: string) => {
  if (command === 'selection-switch') {
    const settings = await getSettings();
    await updateSettings({ enabled: !settings.enabled });
    
    // 通知当前标签页
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'updateSettings', 
          payload: { enabled: !settings.enabled } 
        });
      } catch (error) {
        // 内容脚本可能还未注入，忽略错误
      }
    }
  }
});
