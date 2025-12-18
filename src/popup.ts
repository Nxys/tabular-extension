import type { PanelPosition, PluginSettings } from './types.js';

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
  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'updateSettings', payload: settings });
    } catch (error) {
      console.warn('通知内容脚本失败，可能未注入:', error);
    }
  }
}

async function initializePopup(): Promise<void> {
  const { enableToggle, positionSelect } = getControls();
  const settings = await loadSettings();

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
