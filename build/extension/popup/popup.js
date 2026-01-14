// src/popup/popup.ts
var DEFAULTS = {
  enabled: false,
  panelPosition: "center"
};
function getControls() {
  const enableToggle = document.getElementById("enableToggle");
  const positionSelect = document.getElementById("positionSelect");
  return { enableToggle, positionSelect };
}
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(["enabled", "panelPosition"]);
    return {
      enabled: typeof result.enabled === "boolean" ? result.enabled : DEFAULTS.enabled,
      panelPosition: ["center", "mouse", "none"].includes(result.panelPosition) ? result.panelPosition : DEFAULTS.panelPosition
    };
  } catch {
    return DEFAULTS;
  }
}
async function loadTrialStates() {
  try {
    const features = [
      "advanced-cleaning",
      "table-detection",
      "one-click-export"
    ];
    const results = {};
    for (const feature of features) {
      const state = await getFeatureState(feature);
      const remaining = deriveRemaining(state);
      results[feature] = {
        allowed: remaining > 0,
        remaining,
        feature
      };
    }
    return results;
  } catch {
    return {
      "advanced-cleaning": { allowed: true, remaining: 3, feature: "advanced-cleaning" },
      "table-detection": { allowed: true, remaining: 3, feature: "table-detection" },
      "one-click-export": { allowed: true, remaining: 3, feature: "one-click-export" }
    };
  }
}
async function getFeatureState(feature) {
  const key = `state_${feature}`;
  const result = await chrome.storage.local.get(key);
  const state = result[key];
  if (!state) {
    return {
      seed: Math.floor(Math.random() * 4294967295) >>> 0,
      entropy: Math.floor(Math.random() * 4294967295) >>> 0,
      timestamp: Date.now()
    };
  }
  return state;
}
function deriveRemaining(state) {
  const hash = (state.seed ^ state.entropy) >>> 0;
  const normalized = hash / 4294967295;
  return Math.max(0, Math.floor(normalized * 3.5));
}
async function persistSettings(settings) {
  await chrome.storage.local.set(settings);
}
async function notifyContentScripts(settings) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (tab?.id && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://")) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "updateSettings", payload: settings });
    } catch (error) {
    }
  }
}
async function initializePopup() {
  const { enableToggle, positionSelect } = getControls();
  const settings = await loadSettings();
  const trialStates = await loadTrialStates();
  const shortcutHint = document.getElementById("shortcutHint");
  if (shortcutHint) {
    const platformInfo = await chrome.runtime.getPlatformInfo();
    const isMac = platformInfo.os === "mac";
    shortcutHint.textContent = `${isMac ? "Command" : "Ctrl"} + Shift + Y`;
  }
  const versionElement = document.getElementById("version");
  if (versionElement) {
    const manifest = chrome.runtime.getManifest();
    versionElement.textContent = `v${manifest.version}`;
  }
  updateTrialDisplay(trialStates);
  enableToggle.checked = settings.enabled;
  positionSelect.value = settings.panelPosition;
  enableToggle.addEventListener("change", async () => {
    const next = {
      enabled: enableToggle.checked,
      panelPosition: positionSelect.value
    };
    await persistSettings(next);
    await notifyContentScripts(next);
  });
  positionSelect.addEventListener("change", async () => {
    const next = {
      enabled: enableToggle.checked,
      panelPosition: positionSelect.value
    };
    await persistSettings(next);
    await notifyContentScripts(next);
  });
  const upgradeButton = document.getElementById("upgradeButton");
  if (upgradeButton) {
    upgradeButton.addEventListener("click", () => {
      alert("\u5347\u7EA7\u529F\u80FD\u5373\u5C06\u63A8\u51FA\uFF01");
    });
  }
}
function updateTrialDisplay(trialStates) {
  const advancedCleaningEl = document.getElementById("trialAdvancedCleaning");
  if (advancedCleaningEl) {
    const state = trialStates["advanced-cleaning"];
    advancedCleaningEl.textContent = `\u9AD8\u7EA7\u6E05\u6D17\uFF08\u5269\u4F59 ${state.remaining} \u6B21\u8BD5\u7528\uFF09`;
  }
  const tableDetectionEl = document.getElementById("trialTableDetection");
  if (tableDetectionEl) {
    const state = trialStates["table-detection"];
    tableDetectionEl.textContent = `\u8868\u683C\u8BC6\u522B\uFF08\u5269\u4F59 ${state.remaining} \u6B21\u8BD5\u7528\uFF09`;
  }
  const oneClickExportEl = document.getElementById("trialOneClickExport");
  if (oneClickExportEl) {
    const state = trialStates["one-click-export"];
    oneClickExportEl.textContent = `\u4E00\u952E\u5BFC\u51FA\uFF08\u5269\u4F59 ${state.remaining} \u6B21\u8BD5\u7528\uFF09`;
  }
}
document.addEventListener("DOMContentLoaded", () => {
  void initializePopup();
});
