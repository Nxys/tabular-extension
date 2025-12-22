/**
 * Pro 策略映射模块
 * 
 * 职责：根据内容类型决定使用哪条 pipeline
 * - text 模式 → free pipeline
 * - table 模式 → pro pipeline
 */

/**
 * 内容模式
 */
export type ContentMode = 'text' | 'table';

/**
 * Pipeline 类型
 */
export type PipelineType = 'free' | 'pro';

/**
 * 解析 Pipeline 类型
 * 
 * 根据内容模式决定使用哪条处理管道：
 * - text 模式：使用免费版 pipeline（collect → layout → format）
 * - table 模式：使用 Pro pipeline（collect → layout → table → align/csv）
 * 
 * 注意：此函数只负责策略映射，不直接判断用户权限
 * 实际的权限判断由 pro/gate.ts 负责
 * 
 * @param mode 内容模式
 * @returns Pipeline 类型
 */
export function resolvePipeline(mode: ContentMode): PipelineType {
  switch (mode) {
    case 'text':
      return 'free';
    case 'table':
      return 'pro';
    default:
      // 默认使用免费版 pipeline
      return 'free';
  }
}
