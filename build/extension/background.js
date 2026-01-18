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

// src/background/usage.ts
var STATE_KEY_PREFIX = "state_";
var HASH_CONSTANT_1 = 2654435769;
var HASH_CONSTANT_2 = 2246822507;
var HASH_CONSTANT_3 = 2146121005;
var HASH_CONSTANT_4 = 2221713035;
var THRESHOLD = 1073741824;
async function checkTrial(feature) {
  try {
    const state = await getFeatureState(feature);
    const now = Date.now();
    const allowed = deriveAllowed(state, now);
    const remaining = deriveRemaining(state);
    return {
      allowed,
      remaining,
      feature
    };
  } catch (error) {
    console.error("Error checking trial state:", error);
    return {
      allowed: false,
      remaining: 0,
      feature
    };
  }
}
async function evolveTrial(feature) {
  try {
    const state = await getFeatureState(feature);
    const newState = evolveState(state);
    await setFeatureState(feature, newState);
  } catch (error) {
    console.error("Error evolving trial state:", error);
  }
}
async function getAllTrials() {
  const features = [
    "advanced-cleaning",
    "table-detection",
    "one-click-export"
  ];
  const results = {};
  for (const feature of features) {
    try {
      results[feature] = await checkTrial(feature);
    } catch (error) {
      console.error(`Error getting trial state for ${feature}:`, error);
      results[feature] = {
        allowed: false,
        remaining: 0,
        feature
      };
    }
  }
  return results;
}
function deriveAllowed(state, now) {
  const factor1 = (state.seed ^ HASH_CONSTANT_1) >>> 0;
  const factor2 = state.entropy * HASH_CONSTANT_2 >>> 0;
  const factor3 = Math.floor((now - state.timestamp) / 864e5);
  const hash1 = factor1 + factor2 >>> 0;
  const hash2 = (hash1 ^ hash1 >>> 16) * HASH_CONSTANT_3 >>> 0;
  const hash3 = (hash2 ^ hash2 >>> 15) * HASH_CONSTANT_4 >>> 0;
  return (hash3 ^ factor3) > THRESHOLD;
}
function deriveRemaining(state) {
  const hash = (state.seed ^ state.entropy) >>> 0;
  const normalized = hash / 4294967295;
  return Math.max(0, Math.floor(normalized * 3.5));
}
function evolveState(state) {
  const newSeed = state.seed >>> 1 >>> 0;
  const newEntropy = state.entropy >>> 1 >>> 0;
  return {
    seed: newSeed,
    entropy: newEntropy,
    timestamp: Date.now()
  };
}
async function authorize(feature) {
  try {
    const state = await getFeatureState(feature);
    const now = Date.now();
    const allowed1 = deriveAllowed(state, now);
    const daysSinceInit = Math.floor((now - state.timestamp) / 864e5);
    const allowed2 = daysSinceInit < 365;
    const allowed3 = state.seed !== 0 && state.entropy !== 0;
    return allowed1 && allowed2 && allowed3;
  } catch (error) {
    console.error("Error authorizing feature:", error);
    return false;
  }
}
async function checkUsage() {
  return {
    allowed: true,
    remaining: 999,
    max: 999
  };
}
async function consumeUsage() {
}
async function record(_event) {
}
function generateRandomSeed() {
  return Math.floor(Math.random() * 4294967295) >>> 0;
}
function generateRandomEntropy() {
  return Math.floor(Math.random() * 4294967295) >>> 0;
}
async function getFeatureState(feature) {
  try {
    const key = getStorageKey(feature);
    const state = await getFromStorage(key, null);
    if (state === null) {
      return {
        seed: generateRandomSeed(),
        entropy: generateRandomEntropy(),
        timestamp: Date.now()
      };
    }
    return state;
  } catch (error) {
    console.error("Error getting feature state:", error);
    return {
      seed: 0,
      entropy: 0,
      timestamp: Date.now()
    };
  }
}
async function setFeatureState(feature, state) {
  try {
    const key = getStorageKey(feature);
    await setToStorage(key, state);
  } catch (error) {
    console.error("Error setting feature state:", error);
  }
}
function getStorageKey(feature) {
  return `${STATE_KEY_PREFIX}${feature}`;
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
async function allow(feature) {
  try {
    const state = await getProState();
    return state.isPro && state.features[feature] === true;
  } catch (error) {
    console.error("Error checking Pro permission:", error);
    return false;
  }
}
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

// src/background/settings.ts
var DEFAULT_SETTINGS = {
  enabled: false,
  panelPosition: "center"
};
async function getSettings() {
  const enabled = await getFromStorage("enabled", DEFAULT_SETTINGS.enabled);
  const panelPosition = await getFromStorage("panelPosition", DEFAULT_SETTINGS.panelPosition);
  return { enabled, panelPosition };
}
async function updateSettings(partial) {
  if (partial.enabled !== void 0) {
    await setToStorage("enabled", partial.enabled);
  }
  if (partial.panelPosition !== void 0) {
    await setToStorage("panelPosition", partial.panelPosition);
  }
}

// src/background/cleaner.ts
function basicClean(data) {
  return data.map((line) => line.trim());
}
function advancedClean(data, rules) {
  try {
    let result = [...data];
    if (rules.removeEmptyLines) {
      result = result.filter((line) => line.trim().length > 0);
    }
    if (rules.mergeToSingleLine) {
      result = [result.join(" ")];
    } else if (rules.mergeMultipleLines) {
      const separator = rules.customSeparator !== void 0 ? rules.customSeparator : "\n";
      result = [result.join(separator)];
    }
    if (rules.removeDuplicates) {
      const seen = /* @__PURE__ */ new Set();
      result = result.filter((line) => {
        if (seen.has(line)) {
          return false;
        }
        seen.add(line);
        return true;
      });
    }
    return result;
  } catch (error) {
    console.error("Error applying advanced cleaning rules:", error);
    return basicClean(data);
  }
}

// src/background/exporter.ts
async function exportData(data, options) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error("\u5BFC\u51FA\u6570\u636E\u65E0\u6548\u6216\u4E3A\u7A7A");
  }
  let processedData = data;
  if (options.cleaningRules) {
    processedData = data.map(
      (row) => advancedClean(row, options.cleaningRules)
    );
  } else {
    processedData = data.map((row) => basicClean(row));
  }
  switch (options.format) {
    case "csv":
      return toCSVBlob(processedData);
    case "excel":
      return toExcelBlob(processedData);
    default:
      throw new Error(`\u4E0D\u652F\u6301\u7684\u5BFC\u51FA\u683C\u5F0F: ${options.format}`);
  }
}
function toCSV(data) {
  if (!data || !Array.isArray(data)) {
    console.error("Invalid data: data is not an array");
    throw new Error("\u6570\u636E\u683C\u5F0F\u65E0\u6548\uFF1A\u5FC5\u987B\u662F\u6570\u7EC4");
  }
  if (data.length === 0) {
    return "";
  }
  return data.map((row) => {
    if (!Array.isArray(row)) {
      console.warn("Invalid row: not an array", row);
      throw new Error("\u6570\u636E\u683C\u5F0F\u65E0\u6548\uFF1A\u6BCF\u884C\u5FC5\u987B\u662F\u6570\u7EC4");
    }
    return row.map((field) => {
      const fieldStr = String(field);
      const needsQuotes = fieldStr.includes(",") || fieldStr.includes('"') || fieldStr.includes("\n") || fieldStr.includes("\r");
      if (needsQuotes) {
        const escaped = fieldStr.replace(/"/g, '""');
        return `"${escaped}"`;
      }
      return fieldStr;
    }).join(",");
  }).join("\r\n") + "\r\n";
}
function toCSVBlob(data) {
  const csvContent = toCSV(data);
  return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
}
function toExcel(data) {
  const csvContent = toCSV(data);
  return new Blob([csvContent], {
    type: "application/vnd.ms-excel;charset=utf-8;"
  });
}
function toExcelBlob(data) {
  return toExcel(data);
}

// src/background/index.ts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true;
});
async function handleMessage(message) {
  try {
    if (message.type === "REQUEST_ACTION") {
      return await handleActionRequest(message.payload);
    } else {
      return { error: "Unknown message type" };
    }
  } catch (error) {
    console.error("Message handling error:", error);
    return {
      status: "blocked",
      uiAction: "SHOW_RESULT_PANEL",
      uiData: {
        message: "\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5"
      }
    };
  }
}
async function handleActionRequest(payload) {
  const { action, data } = payload;
  try {
    if (action === "advanced-clean" || action === "table-export" || action === "check-trial") {
      switch (action) {
        case "advanced-clean":
          return await handleAdvancedClean(data);
        case "table-export":
          return await handleTableExport(data);
        case "check-trial":
          return await handleCheckTrial(data);
      }
    }
    const usage = await checkUsage();
    if (!usage.allowed) {
      return {
        status: "limited",
        uiAction: "SHOW_LIMIT_PANEL",
        uiData: {
          message: `\u4ECA\u65E5\u514D\u8D39\u6B21\u6570\u5DF2\u7528\u5B8C (${usage.max}/${usage.max})\uFF0C\u660E\u5929\u5C06\u81EA\u52A8\u91CD\u7F6E`
        }
      };
    }
    switch (action) {
      case "text-extract":
        return await handleTextExtract(data);
      case "table-detect":
        return await handleTableDetect(data);
      case "column-align":
        return await handleColumnAlign(data);
      case "csv-export":
        return await handleCSVExport(data);
      default:
        return {
          status: "blocked",
          uiAction: "SHOW_RESULT_PANEL",
          uiData: {
            message: "\u672A\u77E5\u64CD\u4F5C\u7C7B\u578B"
          }
        };
    }
  } catch (error) {
    console.error("Action handler error:", error);
    return {
      status: "blocked",
      uiAction: "SHOW_RESULT_PANEL",
      uiData: {
        message: "\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5"
      }
    };
  }
}
async function handleTextExtract(data) {
  const isPro = await allow("table-detect");
  const { limitedData, isLimited, totalRows } = await applyRowLimit(data, isPro);
  const uiData = {
    text: limitedData,
    totalRows,
    isLimited
  };
  if (isLimited) {
    uiData.rowLimit = 5;
    uiData.limitMessage = `\u4EC5\u5C55\u793A\u524D 5 \u884C\uFF08\u5171 ${totalRows} \u884C\uFF09\uFF0C\u5347\u7EA7 Pro \u89E3\u9501\u5B8C\u6574\u6570\u636E`;
  }
  const result = {
    status: "ok",
    uiAction: "SHOW_RESULT_PANEL",
    data: limitedData,
    uiData
  };
  await record("select");
  await consumeUsage();
  return result;
}
async function applyRowLimit(data, isPro) {
  if (isPro) {
    const lines2 = data.split("\n");
    return {
      limitedData: data,
      isLimited: false,
      totalRows: lines2.length
    };
  }
  const lines = data.split("\n");
  const totalRows = lines.length;
  if (totalRows <= 5) {
    return {
      limitedData: data,
      isLimited: false,
      totalRows
    };
  }
  const limitedLines = lines.slice(0, 5);
  const limitedData = limitedLines.join("\n");
  return {
    limitedData,
    isLimited: true,
    totalRows
  };
}
async function handleTableDetect(data) {
  if (!await allow("table-detect")) {
    return {
      status: "blocked",
      uiAction: "SHOW_PRO_PANEL",
      uiData: {
        message: "\u8868\u683C\u8BC6\u522B\u662F Pro \u529F\u80FD\uFF0C\u8BF7\u5347\u7EA7\u4EE5\u4F7F\u7528"
      }
    };
  }
  const result = {
    status: "ok",
    uiAction: "SHOW_RESULT_PANEL",
    data
  };
  await record("table-detect");
  await consumeUsage();
  return result;
}
async function handleColumnAlign(data) {
  if (!await allow("column-align")) {
    return {
      status: "blocked",
      uiAction: "SHOW_PRO_PANEL",
      uiData: {
        message: "\u5217\u5BF9\u9F50\u662F Pro \u529F\u80FD\uFF0C\u8BF7\u5347\u7EA7\u4EE5\u4F7F\u7528"
      }
    };
  }
  const result = {
    status: "ok",
    uiAction: "SHOW_RESULT_PANEL",
    data,
    uiData: {
      table: data
    }
  };
  await record("column-align");
  return result;
}
async function handleCSVExport(data) {
  if (!await allow("csv-export")) {
    return {
      status: "blocked",
      uiAction: "SHOW_PRO_PANEL",
      uiData: {
        message: "CSV \u5BFC\u51FA\u662F Pro \u529F\u80FD\uFF0C\u8BF7\u5347\u7EA7\u4EE5\u4F7F\u7528"
      }
    };
  }
  const table = data;
  const csv = tableToCSV(table);
  const result = {
    status: "ok",
    uiAction: "SHOW_RESULT_PANEL",
    data,
    uiData: {
      csv
    }
  };
  await record("csv-export");
  return result;
}
function tableToCSV(table) {
  if (!Array.isArray(table) || table.length === 0) {
    return "";
  }
  return table.map((row) => {
    return row.map((cell) => {
      const cellStr = String(cell);
      if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
        const escaped = cellStr.replace(/"/g, '""');
        return `"${escaped}"`;
      }
      return cellStr;
    }).join(",");
  }).join("\n");
}
async function handleCheckTrial(data) {
  const payload = data;
  if (!payload.feature) {
    const allTrials = await getAllTrials();
    return {
      status: "ok",
      uiAction: "SHOW_RESULT_PANEL",
      data: allTrials,
      uiData: {
        message: "\u8BD5\u7528\u6B21\u6570\u67E5\u8BE2\u6210\u529F"
      }
    };
  }
  const trialState = await checkTrial(payload.feature);
  return {
    status: "ok",
    uiAction: "SHOW_RESULT_PANEL",
    data: trialState,
    uiData: {
      trialRemaining: trialState.remaining,
      message: `${payload.feature} \u5269\u4F59\u8BD5\u7528\u6B21\u6570\uFF1A${trialState.remaining}`
    }
  };
}
function generateUpgradePrompt(feature, remaining) {
  const featureNames = {
    "advanced-cleaning": "\u9AD8\u7EA7\u6E05\u6D17",
    "table-detection": "\u8868\u683C\u8BC6\u522B",
    "one-click-export": "\u4E00\u952E\u5BFC\u51FA"
  };
  const featureName = featureNames[feature];
  const baseMessage = `${featureName}\u8BD5\u7528\u6B21\u6570\u5DF2\u7528\u5B8C\uFF08\u5269\u4F59 ${remaining} \u6B21\uFF09`;
  const benefits = [
    "\u2713 \u65E0\u884C\u6570\u9650\u5236\uFF0C\u5904\u7406\u5B8C\u6574\u6570\u636E",
    "\u2713 \u9AD8\u7EA7\u6E05\u6D17\u529F\u80FD\u65E0\u9650\u4F7F\u7528",
    "\u2713 \u8868\u683C\u8BC6\u522B\u548C\u4E00\u952E\u5BFC\u51FA\u65E0\u9650\u4F7F\u7528",
    "\u2713 \u6240\u6709\u9AD8\u7EA7\u529F\u80FD\u6C38\u4E45\u89E3\u9501"
  ];
  const benefitsText = benefits.join("\n");
  return `${baseMessage}

\u5347\u7EA7 Pro \u7248\u89E3\u9501\u4EE5\u4E0B\u6743\u76CA\uFF1A
${benefitsText}`;
}
function parseTextToTable(text) {
  if (!text || typeof text !== "string") {
    throw new Error("\u65E0\u6548\u7684\u6587\u672C\u6570\u636E");
  }
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  return lines.map((line) => [line]);
}
async function handleTableExport(data) {
  try {
    const payload = data;
    const isPro = await allow("table-detect");
    if (!isPro) {
      const authorized = await authorize("one-click-export");
      if (!authorized) {
        const trialState = await checkTrial("one-click-export");
        return {
          status: "blocked",
          uiAction: "SHOW_TRIAL_EXHAUSTED",
          uiData: {
            message: generateUpgradePrompt("one-click-export", trialState.remaining),
            trialRemaining: trialState.remaining
          }
        };
      }
    }
    let tableData;
    if (payload.table && Array.isArray(payload.table)) {
      tableData = payload.table;
    } else if (payload.text) {
      tableData = parseTextToTable(payload.text);
    } else {
      return {
        status: "blocked",
        uiAction: "SHOW_RESULT_PANEL",
        uiData: {
          message: "\u5BFC\u51FA\u5931\u8D25\uFF1A\u672A\u63D0\u4F9B\u6709\u6548\u7684\u6570\u636E"
        }
      };
    }
    const format = payload.format || payload.exportFormat || "csv";
    const exportOptions = {
      format
    };
    if (payload.cleaningRules) {
      exportOptions.cleaningRules = payload.cleaningRules;
    }
    const blob = await exportData(tableData, exportOptions);
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/:/g, "-");
    const extension = format === "csv" ? "csv" : "xls";
    const filename = `export_${timestamp}.${extension}`;
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onloadend = () => {
        const dataUrl = reader.result;
        chrome.downloads.download({
          url: dataUrl,
          filename,
          saveAs: false
          // 直接下载到默认位置，不显示保存对话框
        }, (_downloadId) => {
          if (chrome.runtime.lastError) {
            console.error("Download failed:", chrome.runtime.lastError);
            resolve({
              status: "blocked",
              uiAction: "SHOW_RESULT_PANEL",
              uiData: {
                message: `\u5BFC\u51FA\u5931\u8D25\uFF1A${chrome.runtime.lastError.message}`
              }
            });
            return;
          }
          if (!isPro) {
            evolveTrial("one-click-export").then(() => {
              resolve({
                status: "ok",
                uiAction: "SHOW_RESULT_PANEL",
                uiData: {
                  message: "\u5BFC\u51FA\u6210\u529F\uFF01\u6587\u4EF6\u5DF2\u4FDD\u5B58\u5230\u4E0B\u8F7D\u6587\u4EF6\u5939\u3002"
                }
              });
            });
          } else {
            resolve({
              status: "ok",
              uiAction: "SHOW_RESULT_PANEL",
              uiData: {
                message: "\u5BFC\u51FA\u6210\u529F\uFF01\u6587\u4EF6\u5DF2\u4FDD\u5B58\u5230\u4E0B\u8F7D\u6587\u4EF6\u5939\u3002"
              }
            });
          }
        });
      };
      reader.onerror = () => {
        resolve({
          status: "blocked",
          uiAction: "SHOW_RESULT_PANEL",
          uiData: {
            message: "\u5BFC\u51FA\u5931\u8D25\uFF1A\u65E0\u6CD5\u8BFB\u53D6\u6587\u4EF6\u6570\u636E"
          }
        });
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Export error:", error);
    return {
      status: "blocked",
      uiAction: "SHOW_RESULT_PANEL",
      uiData: {
        message: `\u5BFC\u51FA\u5931\u8D25\uFF1A${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`
      }
    };
  }
}
async function handleAdvancedClean(data) {
  const payload = data;
  const isPro = await allow("table-detect");
  if (!isPro) {
    const authorized = await authorize("advanced-cleaning");
    if (!authorized) {
      const trialState = await checkTrial("advanced-cleaning");
      return {
        status: "blocked",
        uiAction: "SHOW_TRIAL_EXHAUSTED",
        uiData: {
          message: generateUpgradePrompt("advanced-cleaning", trialState.remaining),
          trialRemaining: trialState.remaining
        }
      };
    }
  }
  const lines = payload.text.split("\n");
  const cleanedLines = advancedClean(lines, payload.cleaningRules);
  const cleanedText = cleanedLines.join("\n");
  const { limitedData, isLimited, totalRows } = await applyRowLimit(cleanedText, isPro);
  const uiData = {
    text: limitedData,
    totalRows,
    isLimited
  };
  if (payload.operation === "export") {
    const exportLines = limitedData.split("\n");
    const exportTable = exportLines.map((line) => [line]);
    if (payload.exportFormat === "csv") {
      uiData.csv = toCSV(exportTable);
    }
  }
  if (isLimited) {
    uiData.rowLimit = 5;
    uiData.limitMessage = `\u4EC5\u5C55\u793A\u524D 5 \u884C\uFF08\u5171 ${totalRows} \u884C\uFF09\uFF0C\u5347\u7EA7 Pro \u89E3\u9501\u5B8C\u6574\u6570\u636E`;
  }
  const result = {
    status: "ok",
    uiAction: "SHOW_RESULT_PANEL",
    data: limitedData,
    uiData
  };
  if (!isPro) {
    await evolveTrial("advanced-cleaning");
  }
  return result;
}
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "selection-switch") {
    const settings = await getSettings();
    await updateSettings({ enabled: !settings.enabled });
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "updateSettings",
          payload: { enabled: !settings.enabled }
        });
      } catch (error) {
      }
    }
  }
});
