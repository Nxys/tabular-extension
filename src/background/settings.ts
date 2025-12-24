/**
 * 插件设置管理
 * 
 * 职责：
 * - 开关状态（enabled）
 * - 面板位置（panelPosition）
 */

import type { PluginSettings } from '../shared/types';
import { getFromStorage, setToStorage } from './storage';

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: PluginSettings = {
  enabled: false,
  panelPosition: 'center'
};

/**
 * 获取插件设置
 */
export async function getSettings(): Promise<PluginSettings> {
  const enabled = await getFromStorage('enabled', DEFAULT_SETTINGS.enabled);
  const panelPosition = await getFromStorage('panelPosition', DEFAULT_SETTINGS.panelPosition);
  
  return { enabled, panelPosition };
}

/**
 * 更新插件设置
 */
export async function updateSettings(partial: Partial<PluginSettings>): Promise<void> {
  if (partial.enabled !== undefined) {
    await setToStorage('enabled', partial.enabled);
  }
  
  if (partial.panelPosition !== undefined) {
    await setToStorage('panelPosition', partial.panelPosition);
  }
}
