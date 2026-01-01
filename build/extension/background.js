// src/background/storage.ts
var memoryFallback = /* @__PURE__ */ new Map();
async function getFromStorage(key, defaultValue) {
  try {
    const result = await chrome.storage.local.get([key]);
    return result[key] !== void 0 ? result[key] : defaultValue;
  } catch (error) {
    console.warn(`Storage get failed for key: ${key}, using memory fallback`, error);
    return memoryFallback.has(key) ? memoryFallback.get(key) : defaultValue;
  }
}
async function setToStorage(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.warn(`Storage set failed for key: ${key}, using memory fallback`, error);
    memoryFallback.set(key, value);
  }
}

// src/background/usage.ts
var FREE_POLICY = {
  maxPerDay: 20
};
async function checkUsage() {
  await resetIfNewDay();
  const count = await getUsageCount();
  const max = FREE_POLICY.maxPerDay;
  if (count >= max) {
    return {
      allowed: false,
      reason: "limit-reached",
      remaining: 0,
      max
    };
  }
  return {
    allowed: true,
    remaining: max - count,
    max
  };
}
async function consumeUsage() {
  const count = await getUsageCount();
  await setToStorage("usage_count", count + 1);
}
async function record(event) {
  try {
    await resetIfNewDay();
    const stats = await getStats();
    switch (event) {
      case "select":
        stats.selectCount++;
        break;
      case "table-detect":
        stats.tableDetectCount++;
        break;
      case "column-align":
        stats.columnAlignCount++;
        break;
      case "csv-export":
        stats.csvExportCount++;
        break;
    }
    await setToStorage("usage_stats", stats);
  } catch (error) {
    console.warn("Failed to record usage event", event, error);
  }
}
async function getUsageCount() {
  return await getFromStorage("usage_count", 0);
}
async function getStats() {
  const defaultStats = {
    selectCount: 0,
    tableDetectCount: 0,
    columnAlignCount: 0,
    csvExportCount: 0,
    lastDate: (/* @__PURE__ */ new Date()).toDateString()
  };
  return await getFromStorage("usage_stats", defaultStats);
}
async function resetIfNewDay() {
  const today = (/* @__PURE__ */ new Date()).toDateString();
  const lastDate = await getFromStorage("last_usage_date", "");
  if (!lastDate || lastDate !== today) {
    await setToStorage("usage_count", 0);
    await setToStorage("last_usage_date", today);
    await setToStorage("usage_stats", {
      selectCount: 0,
      tableDetectCount: 0,
      columnAlignCount: 0,
      csvExportCount: 0,
      lastDate: today
    });
  }
}

// src/background/pro.ts
async function allow(feature) {
  const state = await getProState();
  return state.isPro && state.features[feature] === true;
}
async function getProState() {
  const defaultState = {
    isPro: false,
    signature: "",
    features: {
      "table-detect": false,
      "column-align": false,
      "csv-export": false
    }
  };
  return await getFromStorage("pro_state", defaultState);
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
  const result = {
    status: "ok",
    uiAction: "SHOW_RESULT_PANEL",
    data,
    uiData: {
      text: data
    }
  };
  await record("select");
  await consumeUsage();
  return result;
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
