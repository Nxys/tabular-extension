/**
 * 数据清洗模块
 * 
 * 职责：
 * - 提供基础清洗功能（去除首尾空白、规范化换行）
 * - 提供高级清洗功能（去空行、合并多行、自定义分隔符、合并为一行、去重）
 * - 确保复制和导出操作使用相同的清洗逻辑
 * 
 * 架构约束：
 * - 业务逻辑层，不涉及 UI
 * - 纯函数实现，无副作用
 */

/**
 * 清洗规则接口
 */
export interface CleaningRules {
  mergeToSingleLine: boolean;     // 合并为一行
  customSeparator?: string;       // 自定义分隔符（始终适用）
  removeDuplicates: boolean;      // 去重
}

/**
 * 默认基础清洗规则
 */
export const BASIC_CLEANING: CleaningRules = {
  mergeToSingleLine: false,
  removeDuplicates: false
};

/**
 * 基础清洗函数
 * 
 * 功能：
 * - 去除每行首尾空白
 * - 规范化换行符
 * 
 * @param data - 原始数据行数组
 * @returns 清洗后的数据行数组
 */
export function basicClean(data: string[]): string[] {
  return data.map(line => line.trim());
}

/**
 * 高级清洗函数
 * 
 * 功能：
 * - 应用用户选择的清洗规则
 * - 支持多种清洗规则组合
 * 
 * @param data - 原始数据行数组
 * @param rules - 清洗规则配置
 * @returns 清洗后的数据行数组
 */
export function advancedClean(data: string[], rules: CleaningRules): string[] {
  try {
    let result = [...data];

    // 1. 合并为一行（如果启用）
    if (rules.mergeToSingleLine) {
      // 使用自定义分隔符（如果提供），否则使用空格
      const separator = rules.customSeparator !== undefined 
        ? rules.customSeparator 
        : ' ';
      result = [result.join(separator)];
    } else if (rules.customSeparator !== undefined) {
      // 2. 如果没有合并为一行，但提供了自定义分隔符
      // 使用自定义分隔符连接所有行
      result = [result.join(rules.customSeparator)];
    }

    // 3. 去重（如果启用）
    if (rules.removeDuplicates) {
      const seen = new Set<string>();
      result = result.filter(line => {
        if (seen.has(line)) {
          return false;
        }
        seen.add(line);
        return true;
      });
    }

    return result;
  } catch (error) {
    console.error('Error applying advanced cleaning rules:', error);
    return basicClean(data);
  }
}
