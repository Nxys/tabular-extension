import type { PluginSettings } from '../shared/types';

type PanelPosition = PluginSettings['panelPosition'];

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
}

document.addEventListener('DOMContentLoaded', () => {
  void initializePopup();
});
