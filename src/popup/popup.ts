import type { PluginSettings } from '../shared/types';
import { getProState, setProState, type ProState } from '../background/pro';

type PanelPosition = PluginSettings['panelPosition'];

/**
 * 高级能力类型
 */
type AdvancedFeature = 
  | 'advanced-cleaning'
  | 'table-detection'
  | 'one-click-export';

/**
 * 试用状态
 */
interface TrialState {
  allowed: boolean;
  remaining: number;
  feature: AdvancedFeature;
}

const DEFAULTS: PluginSettings = {
  enabled: false,
  panelPosition: 'center'
};

function getControls() {
  const enableToggle = document.getElementById('enableToggle') as HTMLInputElement;
  const positionSelect = document.getElementById('positionSelect') as HTMLSelectElement;
  return { enableToggle, positionSelect };
}

async function loadSettings(): Promise<PluginSettings> {
  try {
    const result = await chrome.storage.local.get(['enabled', 'panelPosition']);
    return {
      enabled: typeof result.enabled === 'boolean' ? result.enabled : DEFAULTS.enabled,
      panelPosition: (['center', 'mouse', 'none'] as PanelPosition[]).includes(result.panelPosition)
        ? result.panelPosition
        : DEFAULTS.panelPosition
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * 加载试用次数信息
 * @returns 所有高级能力的试用状态
 */
async function loadTrialStates(): Promise<Record<AdvancedFeature, TrialState>> {
  try {
    // 从 storage 读取无语义状态并派生试用次数
    const features: AdvancedFeature[] = [
      'advanced-cleaning',
      'table-detection',
      'one-click-export'
    ];
    
    const results: Partial<Record<AdvancedFeature, TrialState>> = {};
    
    for (const feature of features) {
      const state = await getFeatureState(feature);
      const remaining = deriveRemaining(state);
      
      results[feature] = {
        allowed: remaining > 0,
        remaining,
        feature
      };
    }
    
    return results as Record<AdvancedFeature, TrialState>;
  } catch {
    // 出错时返回默认值
    return {
      'advanced-cleaning': { allowed: true, remaining: 3, feature: 'advanced-cleaning' },
      'table-detection': { allowed: true, remaining: 3, feature: 'table-detection' },
      'one-click-export': { allowed: true, remaining: 3, feature: 'one-click-export' }
    };
  }
}

/**
 * 无语义状态接口
 */
interface FeatureState {
  seed: number;
  entropy: number;
  timestamp: number;
}

/**
 * 获取特征状态
 */
async function getFeatureState(feature: AdvancedFeature): Promise<FeatureState> {
  const key = `state_${feature}`;
  const result = await chrome.storage.local.get(key);
  const state = result[key] as FeatureState | undefined;
  
  // 如果未初始化，返回默认状态
  if (!state) {
    return {
      seed: Math.floor(Math.random() * 0xffffffff) >>> 0,
      entropy: Math.floor(Math.random() * 0xffffffff) >>> 0,
      timestamp: Date.now()
    };
  }
  
  return state;
}

/**
 * 派生剩余次数视图值
 */
function deriveRemaining(state: FeatureState): number {
  const hash = (state.seed ^ state.entropy) >>> 0;
  const normalized = hash / 0xffffffff;
  return Math.max(0, Math.floor(normalized * 3.5));
}

async function persistSettings(settings: PluginSettings): Promise<void> {
  await chrome.storage.local.set(settings);
}

async function notifyContentScripts(settings: PluginSettings): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (tab?.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'updateSettings', payload: settings });
    } catch (error) {
      // 内容脚本可能还未注入（页面刚打开或刚刷新扩展），这是正常情况
      // 下次用户在该页面使用扩展时会自动加载最新设置
    }
  }
}

async function initializePopup(): Promise<void> {
  const { enableToggle, positionSelect } = getControls();
  const settings = await loadSettings();
  const proState = await loadProState();
  const trialStates = await loadTrialStates();

  // 根据操作系统设置快捷键提示文本
  const shortcutHint = document.getElementById('shortcutHint');
  if (shortcutHint) {
    const platformInfo = await chrome.runtime.getPlatformInfo();
    const isMac = platformInfo.os === 'mac';
    shortcutHint.textContent = `${isMac ? 'Command' : 'Ctrl'} + Shift + Y`;
  }

  // 设置版本号
  const versionElement = document.getElementById('version');
  if (versionElement) {
    const manifest = chrome.runtime.getManifest();
    versionElement.textContent = `v${manifest.version}`;
  }

  // 更新 Pro 状态显示
  updateProDisplay(proState.isPro);

  // 更新试用次数显示
  updateTrialDisplay(trialStates, proState.isPro);

  enableToggle.checked = settings.enabled;
  positionSelect.value = settings.panelPosition;

  enableToggle.addEventListener('change', async () => {
    const next: PluginSettings = {
      enabled: enableToggle.checked,
      panelPosition: positionSelect.value as PanelPosition
    };
    await persistSettings(next);
    await notifyContentScripts(next);
  });

  positionSelect.addEventListener('change', async () => {
    const next: PluginSettings = {
      enabled: enableToggle.checked,
      panelPosition: positionSelect.value as PanelPosition
    };
    await persistSettings(next);
    await notifyContentScripts(next);
  });

  // 升级按钮事件
  const upgradeButton = document.getElementById('upgradeButton');
  if (upgradeButton) {
    upgradeButton.addEventListener('click', async () => {
      try {
        // 使用加密存储设置 Pro 状态
        const newProState: ProState = {
          isPro: true,
          signature: 'dev-test',
          features: {
            'table-detect': true,
            'column-align': true,
            'csv-export': true
          }
        };
        
        await setProState(newProState);
        
        // 提示用户
        alert('Pro 功能已开启！请刷新页面后使用。');
        
        // 关闭 popup
        window.close();
      } catch (error) {
        console.error('开启 Pro 功能失败:', error);
        alert('开启失败，请重试');
      }
    });
  }
}

/**
 * 加载 Pro 状态
 * 
 * 从 storage 读取并解密 Pro 状态
 * 
 * @returns Pro 状态
 */
async function loadProState(): Promise<ProState> {
  try {
    return await getProState();
  } catch (error) {
    console.error('加载 Pro 状态失败:', error);
    // 返回默认 Free 状态
    return {
      isPro: false,
      signature: '',
      features: {
        'table-detect': false,
        'column-align': false,
        'csv-export': false
      }
    };
  }
}

/**
 * 更新 Pro 状态显示
 * 
 * 根据 isPro 标志更新 UI：
 * - Pro 用户：禁用升级按钮并显示"已激活"
 * - Free 用户：启用升级按钮并显示"升级到 Pro 版"
 * 
 * @param isPro 是否为 Pro 用户
 */
function updateProDisplay(isPro: boolean): void {
  const upgradeButton = document.getElementById('upgradeButton') as HTMLButtonElement;
  
  if (upgradeButton) {
    if (isPro) {
      // Pro 用户：禁用按钮并显示"已激活"
      upgradeButton.textContent = '已激活';
      upgradeButton.disabled = true;
      upgradeButton.style.opacity = '0.6';
      upgradeButton.style.cursor = 'not-allowed';
    } else {
      // Free 用户：启用按钮并显示"升级到 Pro 版"
      upgradeButton.textContent = '升级到 Pro 版';
      upgradeButton.disabled = false;
      upgradeButton.style.opacity = '1';
      upgradeButton.style.cursor = 'pointer';
    }
  }
}

/**
 * 更新试用次数显示
 * 
 * Pro 用户显示"无限使用"，Free 用户显示剩余次数
 * 
 * @param trialStates 试用状态
 * @param isPro 是否为 Pro 用户
 */
function updateTrialDisplay(trialStates: Record<AdvancedFeature, TrialState>, isPro: boolean): void {
  // 更新高级清洗
  const advancedCleaningEl = document.getElementById('trialAdvancedCleaning');
  if (advancedCleaningEl) {
    if (isPro) {
      advancedCleaningEl.textContent = '高级清洗（无限使用）';
    } else {
      const state = trialStates['advanced-cleaning'];
      advancedCleaningEl.textContent = `高级清洗（剩余 ${state.remaining} 次试用）`;
    }
  }

  // 更新表格识别
  const tableDetectionEl = document.getElementById('trialTableDetection');
  if (tableDetectionEl) {
    if (isPro) {
      tableDetectionEl.textContent = '表格识别（无限使用）';
    } else {
      const state = trialStates['table-detection'];
      tableDetectionEl.textContent = `表格识别（剩余 ${state.remaining} 次试用）`;
    }
  }

  // 更新一键导出
  const oneClickExportEl = document.getElementById('trialOneClickExport');
  if (oneClickExportEl) {
    if (isPro) {
      oneClickExportEl.textContent = '一键导出（无限使用）';
    } else {
      const state = trialStates['one-click-export'];
      oneClickExportEl.textContent = `一键导出（剩余 ${state.remaining} 次试用）`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  void initializePopup();
});
