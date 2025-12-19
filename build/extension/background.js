// src/background.ts
var IGNORED_URLS = [
  "chrome://",
  "chrome-extension://",
  "about:"
];
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setTitle({
    title: "\u6846\u9009\u590D\u5236\u6587\u672C"
  });
});
chrome.runtime.onStartup.addListener(() => {
});
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  switch (request.type) {
    case "COPY_SUCCESS":
      break;
    case "COPY_ERROR":
      console.error("\u6587\u672C\u590D\u5236\u5931\u8D25:", request.error);
      break;
    case "EXTENSION_ERROR":
      console.error("\u6269\u5C55\u8FD0\u884C\u9519\u8BEF:", request.error);
      break;
    default:
  }
  sendResponse({ success: true });
});
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "selection-switch") {
    const result = await chrome.storage.local.get(["enabled", "panelPosition"]);
    const currentEnabled = typeof result.enabled === "boolean" ? result.enabled : false;
    const newSettings = {
      enabled: !currentEnabled,
      panelPosition: result.panelPosition || "center"
    };
    await chrome.storage.local.set(newSettings);
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id && tab.url && !IGNORED_URLS.some((ignoredUrl) => tab.url.startsWith(ignoredUrl))) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: "updateSettings", payload: newSettings });
      } catch (error) {
      }
    }
  }
});
