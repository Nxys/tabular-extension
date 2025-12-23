/**
 * 策略定义层
 * 
 * 定义免费版和Pro版的使用策略
 * 纯数据定义，无业务逻辑
 */

/**
 * 使用策略接口
 */
export interface UsagePolicy {
  /** 每日最大使用次数 */
  maxPerDay: number;
}

/**
 * 免费策略：每日20次
 */
export const FREE_POLICY: UsagePolicy = {
  maxPerDay: 20
};
