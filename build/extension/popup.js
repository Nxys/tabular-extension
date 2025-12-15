const DEFAULTS = {
    enabled: false,
    panelPosition: 'center'
};
function getControls() {
    const enableToggle = document.getElementById('enableToggle');
    const positionSelect = document.getElementById('positionSelect');
    return { enableToggle, positionSelect };
}
async function loadSettings() {
    try {
        const result = await chrome.storage.local.get(['enabled', 'panelPosition']);
        return {
            enabled: typeof result.enabled === 'boolean' ? result.enabled : DEFAULTS.enabled,
            panelPosition: ['center', 'mouse', 'none'].includes(result.panelPosition)
                ? result.panelPosition
                : DEFAULTS.panelPosition
        };
    }
    catch {
        return DEFAULTS;
    }
}
async function persistSettings(settings) {
    await chrome.storage.local.set(settings);
}
async function notifyContentScripts(settings) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id) {
        try {
            await chrome.tabs.sendMessage(tab.id, { type: 'updateSettings', payload: settings });
        }
        catch (error) {
            console.warn('通知内容脚本失败，可能未注入:', error);
        }
    }
}
async function initializePopup() {
    const { enableToggle, positionSelect } = getControls();
    const settings = await loadSettings();
    enableToggle.checked = settings.enabled;
    positionSelect.value = settings.panelPosition;
    enableToggle.addEventListener('change', async () => {
        const next = {
            enabled: enableToggle.checked,
            panelPosition: positionSelect.value
        };
        await persistSettings(next);
        await notifyContentScripts(next);
    });
    positionSelect.addEventListener('change', async () => {
        const next = {
            enabled: enableToggle.checked,
            panelPosition: positionSelect.value
        };
        await persistSettings(next);
        await notifyContentScripts(next);
    });
}
document.addEventListener('DOMContentLoaded', () => {
    void initializePopup();
});
export {};
//# sourceMappingURL=popup.js.map