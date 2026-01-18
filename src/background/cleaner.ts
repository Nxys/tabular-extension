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
  removeEmptyLines: boolean;      // 去空行
  mergeMultipleLines: boolean;    // 合并多行
  customSeparator?: string;       // 自定义分隔符
  mergeToSingleLine: boolean;     // 合并为一行
  removeDuplicates: boolean;      // 去重
}

/**
 * 默认基础清洗规则
 */
export const BASIC_CLEANING: CleaningRules = {
  removeEmptyLines: false,
  mergeMultipleLines: false,
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

    // 1. 去空行（如果启用）
    if (rules.removeEmptyLines) {
      result = result.filter(line => line.trim().length > 0);
    }

    // 2. 合并操作（两个选项互斥）
    // 
    // 语义说明：
    // - "合并为一行"(mergeToSingleLine)：强制将所有行合并为单行，使用空格分隔
    //   适用场景：需要将多行文本压缩为紧凑的单行格式
    // 
    // - "合并多行"(mergeMultipleLines)：使用自定义分隔符合并行，保留结构
    //   适用场景：需要自定义行与行之间的连接方式（如逗号、分号等）
    // 
    // 互斥关系：当"合并为一行"启用时，忽略"合并多行"设置
    // 优先级："合并为一行" > "合并多行"
    
    if (rules.mergeToSingleLine) {
      // 使用空格合并所有行为单行
      result = [result.join(' ')];
    } else if (rules.mergeMultipleLines) {
      // 使用自定义分隔符合并多行
      // 注意：空字符串''是有效的分隔符（表示直接连接）
      const separator = rules.customSeparator !== undefined 
        ? rules.customSeparator 
        : '\n';
      result = [result.join(separator)];
    }

    // 3. 去重（如果启用）
    if (rules.removeDuplicates) {
      // 使用 Set 去重，保持原始顺序
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
    // 降级策略：返回基础清洗结果
    return basicClean(data);
  }
}
