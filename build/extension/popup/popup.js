// src/background/storage.ts
var memoryFallback = /* @__PURE__ */ new Map();
var DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];
function isSafeKey(key) {
  return !DANGEROUS_KEYS.includes(key);
}
async function getFromStorage(key, defaultValue) {
  if (!isSafeKey(key)) {
    console.warn(`Dangerous key rejected: ${key}`);
    return defaultValue;
  }
  try {
    const result = await chrome.storage.local.get([key]);
    return result[key] !== void 0 ? result[key] : defaultValue;
  } catch (error) {
    console.warn(`Storage get failed for key: ${key}, using memory fallback`, error);
    return memoryFallback.has(key) ? memoryFallback.get(key) : defaultValue;
  }
}
async function setToStorage(key, value) {
  if (!isSafeKey(key)) {
    console.warn(`Dangerous key rejected: ${key}`);
    return;
  }
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.warn(`Storage set failed for key: ${key}, using memory fallback`, error);
    memoryFallback.set(key, value);
  }
}

// src/background/crypto.ts
var ALGORITHM = "AES-GCM";
var KEY_LENGTH = 256;
var IV_LENGTH = 12;
var SALT = "table-capture-pro-v1";
async function deriveKey() {
  const extensionId = chrome.runtime.id;
  const password = `${extensionId}-${SALT}`;
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(SALT),
      iterations: 1e5,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
  return key;
}
async function encryptProState(state) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(state));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKey();
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Error encrypting Pro state:", error);
    throw new Error("Failed to encrypt Pro state");
  }
}
async function decryptProState(encrypted) {
  try {
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);
    const key = await deriveKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );
    const decoder = new TextDecoder();
    const json = decoder.decode(decrypted);
    const state = JSON.parse(json);
    return state;
  } catch (error) {
    console.error("Error decrypting Pro state:", error);
    return null;
  }
}

// src/background/pro.ts
var PRO_STATE_KEY = "pro_state";
function getDefaultProState() {
  return {
    isPro: false,
    signature: "",
    features: {
      "table-detect": false,
      "column-align": false,
      "csv-export": false
    }
  };
}
async function getProState() {
  const defaultState = getDefaultProState();
  try {
    const rawData = await getFromStorage(PRO_STATE_KEY, null);
    if (!rawData) {
      return defaultState;
    }
    if (typeof rawData === "string") {
      const decrypted = await decryptProState(rawData);
      if (decrypted) {
        return decrypted;
      }
      console.warn("Failed to decrypt Pro state, using default Free state");
      return defaultState;
    }
    if (typeof rawData === "object" && rawData !== null) {
      console.log("Detected plaintext Pro state, migrating to encrypted format");
      const state = rawData;
      if (typeof state.isPro === "boolean" && state.features) {
        await setProState(state);
        return state;
      }
    }
    console.warn("Invalid Pro state format, using default Free state");
    return defaultState;
  } catch (error) {
    console.error("Error getting Pro state:", error);
    return defaultState;
  }
}
async function setProState(state) {
  try {
    const encrypted = await encryptProState(state);
    await setToStorage(PRO_STATE_KEY, encrypted);
    console.log("Pro state saved successfully (encrypted)");
  } catch (error) {
    console.error("Error setting Pro state:", error);
    throw new Error("Failed to save Pro state");
  }
}

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
  const proState = await loadProState();
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
  updateProDisplay(proState.isPro);
  updateTrialDisplay(trialStates, proState.isPro);
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
    upgradeButton.addEventListener("click", async () => {
      try {
        const newProState = {
          isPro: true,
          signature: "dev-test",
          features: {
            "table-detect": true,
            "column-align": true,
            "csv-export": true
          }
        };
        await setProState(newProState);
        alert("Pro \u529F\u80FD\u5DF2\u5F00\u542F\uFF01\u8BF7\u5237\u65B0\u9875\u9762\u540E\u4F7F\u7528\u3002");
        window.close();
      } catch (error) {
        console.error("\u5F00\u542F Pro \u529F\u80FD\u5931\u8D25:", error);
        alert("\u5F00\u542F\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5");
      }
    });
  }
}
async function loadProState() {
  try {
    return await getProState();
  } catch (error) {
    console.error("\u52A0\u8F7D Pro \u72B6\u6001\u5931\u8D25:", error);
    return {
      isPro: false,
      signature: "",
      features: {
        "table-detect": false,
        "column-align": false,
        "csv-export": false
      }
    };
  }
}
function updateProDisplay(isPro) {
  const upgradeButton = document.getElementById("upgradeButton");
  if (upgradeButton) {
    if (isPro) {
      upgradeButton.textContent = "\u5DF2\u6FC0\u6D3B";
      upgradeButton.disabled = true;
      upgradeButton.style.opacity = "0.6";
      upgradeButton.style.cursor = "not-allowed";
    } else {
      upgradeButton.textContent = "\u5347\u7EA7\u5230 Pro \u7248";
      upgradeButton.disabled = false;
      upgradeButton.style.opacity = "1";
      upgradeButton.style.cursor = "pointer";
    }
  }
}
function updateTrialDisplay(trialStates, isPro) {
  const advancedCleaningEl = document.getElementById("trialAdvancedCleaning");
  if (advancedCleaningEl) {
    if (isPro) {
      advancedCleaningEl.textContent = "\u9AD8\u7EA7\u6E05\u6D17\uFF08\u65E0\u9650\u4F7F\u7528\uFF09";
    } else {
      const state = trialStates["advanced-cleaning"];
      advancedCleaningEl.textContent = `\u9AD8\u7EA7\u6E05\u6D17\uFF08\u5269\u4F59 ${state.remaining} \u6B21\u8BD5\u7528\uFF09`;
    }
  }
  const tableDetectionEl = document.getElementById("trialTableDetection");
  if (tableDetectionEl) {
    if (isPro) {
      tableDetectionEl.textContent = "\u8868\u683C\u8BC6\u522B\uFF08\u65E0\u9650\u4F7F\u7528\uFF09";
    } else {
      const state = trialStates["table-detection"];
      tableDetectionEl.textContent = `\u8868\u683C\u8BC6\u522B\uFF08\u5269\u4F59 ${state.remaining} \u6B21\u8BD5\u7528\uFF09`;
    }
  }
  const oneClickExportEl = document.getElementById("trialOneClickExport");
  if (oneClickExportEl) {
    if (isPro) {
      oneClickExportEl.textContent = "\u4E00\u952E\u5BFC\u51FA\uFF08\u65E0\u9650\u4F7F\u7528\uFF09";
    } else {
      const state = trialStates["one-click-export"];
      oneClickExportEl.textContent = `\u4E00\u952E\u5BFC\u51FA\uFF08\u5269\u4F59 ${state.remaining} \u6B21\u8BD5\u7528\uFF09`;
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  void initializePopup();
});
