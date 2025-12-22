"use strict";
(() => {
  // src/content/selection.ts
  var Selection = class {
    element = null;
    startX = 0;
    startY = 0;
    isSelecting = false;
    CSS_CLASS_PREFIX = "browser-selection-copy";
    /**
     * 开始选择
     */
    start(x, y) {
      this.startX = x;
      this.startY = y;
      this.isSelecting = true;
      this.createElement();
    }
    /**
     * 更新选择框
     */
    update(x, y) {
      if (!this.element) return;
      const left = Math.min(this.startX, x);
      const top = Math.min(this.startY, y);
      const width = Math.abs(x - this.startX);
      const height = Math.abs(y - this.startY);
      Object.assign(this.element.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`
      });
    }
    /**
     * 完成选择，返回选择区域
     */
    finish() {
      if (!this.element) {
        return null;
      }
      const rect = this.element.getBoundingClientRect();
      const selectionRect = {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        right: rect.right + window.scrollX,
        bottom: rect.bottom + window.scrollY
      };
      this.clear();
      return selectionRect;
    }
    /**
     * 验证选择是否有效
     */
    isValid(rect) {
      const width = rect.right - rect.left;
      const height = rect.bottom - rect.top;
      return width > 5 && height > 5;
    }
    /**
     * 获取选择状态
     */
    getIsSelecting() {
      return this.isSelecting;
    }
    /**
     * 清除选择框
     */
    clear() {
      if (this.element) {
        this.element.remove();
        this.element = null;
      }
      this.isSelecting = false;
    }
    /**
     * 创建选择框元素
     */
    createElement() {
      this.element = document.createElement("div");
      this.element.className = `${this.CSS_CLASS_PREFIX}-box`;
      Object.assign(this.element.style, {
        left: `${this.startX}px`,
        top: `${this.startY}px`,
        width: "0px",
        height: "0px"
      });
      document.body.appendChild(this.element);
    }
  };

  // src/content/extractor/collect.ts
  function collect(selectionRect) {
    const items = [];
    const visibilityCache = /* @__PURE__ */ new Map();
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node2) => {
          if (!node2.textContent?.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node2.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          let visible = visibilityCache.get(parent);
          if (visible === void 0) {
            visible = isVisible(parent);
            visibilityCache.set(parent, visible);
          }
          return visible ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );
    let node;
    while (node = walker.nextNode()) {
      const parent = node.parentElement;
      const clientRects = parent.getClientRects();
      for (let i = 0; i < clientRects.length; i++) {
        const clientRect = clientRects[i];
        const elementRect = {
          left: clientRect.left + window.scrollX,
          top: clientRect.top + window.scrollY,
          right: clientRect.right + window.scrollX,
          bottom: clientRect.bottom + window.scrollY
        };
        if (intersects(elementRect, selectionRect)) {
          items.push({
            text: node.textContent || "",
            rect: clientRect
          });
          break;
        }
      }
    }
    return items;
  }
  function isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }
  function intersects(rect1, rect2) {
    return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
  }

  // src/content/extractor/layout.ts
  function layout(items, options) {
    if (items.length === 0) return [];
    const lines = [];
    for (const item of items) {
      const itemTop = item.rect.top;
      let foundLine = false;
      for (const line of lines) {
        const lineTop = line[0].rect.top;
        if (Math.abs(itemTop - lineTop) <= options.lineThresholdRatio) {
          line.push(item);
          foundLine = true;
          break;
        }
      }
      if (!foundLine) {
        lines.push([item]);
      }
    }
    for (const line of lines) {
      line.sort((a, b) => a.rect.left - b.rect.left);
    }
    lines.sort((a, b) => a[0].rect.top - b[0].rect.top);
    return lines;
  }

  // src/content/extractor/format.ts
  function format(lines) {
    if (lines.length === 0) return "";
    try {
      const maxLines = 10;
      const limitedLines = lines.slice(0, maxLines);
      const resultLines = [];
      for (const line of limitedLines) {
        if (line.length === 0) continue;
        const maxElementsPerLine = 10;
        const limitedLine = line.slice(0, maxElementsPerLine);
        const lineTexts = [];
        for (const item of limitedLine) {
          const text = item.text.trim();
          if (!text || text.length > 1e3) continue;
          lineTexts.push(text);
        }
        if (lineTexts.length > 0) {
          try {
            const lineText = lineTexts.join(" ");
            if (lineText.length < 1e4) {
              resultLines.push(lineText);
            }
          } catch (e) {
            if (lineTexts.length > 0) {
              resultLines.push(lineTexts[0]);
            }
          }
        }
      }
      try {
        return resultLines.join("\n");
      } catch (e) {
        return resultLines.length > 0 ? resultLines[0] : "";
      }
    } catch (error) {
      console.warn("\u6587\u672C\u5408\u5E76\u51FA\u9519:", error);
      return "\u6587\u672C\u63D0\u53D6\u51FA\u9519";
    }
  }

  // src/content/extractor/index.ts
  var DEFAULT_LAYOUT_OPTIONS = {
    lineThresholdRatio: 5,
    minHorizontalGap: 10
  };
  function extractText(selectionRect, options = DEFAULT_LAYOUT_OPTIONS) {
    const items = collect(selectionRect);
    const lines = layout(items, options);
    const text = format(lines);
    return text;
  }

  // src/content/panel.ts
  var Panel = class {
    element = null;
    currentText = "";
    CSS_CLASS_PREFIX = "browser-selection-copy";
    dragState = null;
    /**
     * 显示结果
     */
    show(text, options = {
      position: { left: 50, top: 50 },
      editable: true
    }) {
      this.currentText = text;
      this.createElement(options.position, options.editable ?? true);
    }
    /**
     * 显示使用限制提示
     */
    showLimitReached() {
      this.createElement(
        { left: 50, top: 50 },
        false,
        {
          type: "limit",
          title: "\u4F7F\u7528\u9650\u5236",
          icon: "\u{1F6AB}",
          message: "\u4ECA\u65E5\u514D\u8D39\u6B21\u6570\u5DF2\u7528\u5B8C",
          showUpgradeButton: true
        }
      );
    }
    /**
     * 隐藏面板
     */
    hide() {
      if (this.element) {
        this.element.remove();
        this.element = null;
      }
      document.removeEventListener("mousemove", this.handleDrag);
      document.removeEventListener("mouseup", this.endDrag);
      this.dragState = null;
    }
    /**
     * 检查点击是否在面板内
     */
    contains(target) {
      return this.element?.contains(target) ?? false;
    }
    /**
     * 创建面板
     */
    createElement(position, editable, config) {
      this.hide();
      this.element = document.createElement("div");
      this.element.className = `${this.CSS_CLASS_PREFIX}-panel`;
      this.element.style.top = `${position.top}px`;
      this.element.style.left = `${position.left}px`;
      const header = document.createElement("div");
      header.className = `${this.CSS_CLASS_PREFIX}-panel-header`;
      const title = document.createElement("span");
      title.className = `${this.CSS_CLASS_PREFIX}-panel-title`;
      const icon = document.createElement("span");
      icon.className = `${this.CSS_CLASS_PREFIX}-panel-icon`;
      icon.textContent = config?.icon ?? "\u{1F4CB}";
      const titleText = document.createElement("span");
      titleText.textContent = config?.title ?? "\u6587\u672C\u9884\u89C8";
      title.appendChild(icon);
      title.appendChild(titleText);
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = `${this.CSS_CLASS_PREFIX}-panel-close`;
      closeBtn.textContent = "\xD7";
      closeBtn.onclick = () => this.hide();
      header.appendChild(title);
      header.appendChild(closeBtn);
      if (config?.type === "limit") {
        const messageWrapper = document.createElement("div");
        messageWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-message-wrapper`;
        const message = document.createElement("div");
        message.className = `${this.CSS_CLASS_PREFIX}-panel-message`;
        message.textContent = config.message ?? "";
        const subMessage = document.createElement("div");
        subMessage.className = `${this.CSS_CLASS_PREFIX}-panel-submessage`;
        subMessage.textContent = "(20/20)";
        const resetInfo = document.createElement("div");
        resetInfo.className = `${this.CSS_CLASS_PREFIX}-panel-reset-info`;
        resetInfo.textContent = "\u660E\u5929\u5C06\u81EA\u52A8\u91CD\u7F6E";
        messageWrapper.appendChild(message);
        messageWrapper.appendChild(subMessage);
        messageWrapper.appendChild(resetInfo);
        this.element.appendChild(header);
        this.element.appendChild(messageWrapper);
        if (config.showUpgradeButton) {
          const upgradeBtnWrapper = document.createElement("div");
          upgradeBtnWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-upgrade-wrapper`;
          const upgradeBtn = document.createElement("button");
          upgradeBtn.className = `${this.CSS_CLASS_PREFIX}-panel-upgrade-btn`;
          upgradeBtn.textContent = "\u5347\u7EA7 Pro\uFF08\u5360\u4F4D\uFF09";
          upgradeBtn.onclick = () => {
            console.log("\u5347\u7EA7 Pro \u529F\u80FD\u5C1A\u672A\u5B9E\u73B0");
          };
          upgradeBtnWrapper.appendChild(upgradeBtn);
          this.element.appendChild(upgradeBtnWrapper);
        }
      } else {
        const previewWrapper = document.createElement("div");
        previewWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-preview-wrapper`;
        const preview = document.createElement("textarea");
        preview.className = `${this.CSS_CLASS_PREFIX}-panel-textarea`;
        preview.readOnly = !editable;
        preview.value = this.currentText;
        preview.oninput = (e) => {
          const target = e.target;
          this.currentText = target.value;
        };
        previewWrapper.appendChild(preview);
        const copyBtnWrapper = document.createElement("div");
        copyBtnWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-copy-wrapper`;
        const copyBtn = document.createElement("button");
        copyBtn.className = `${this.CSS_CLASS_PREFIX}-panel-copy-btn`;
        copyBtn.dataset.role = "copy";
        const copyBtnContent = document.createElement("span");
        copyBtnContent.className = `${this.CSS_CLASS_PREFIX}-panel-copy-btn-content`;
        const copyBtnIcon = document.createElement("span");
        copyBtnIcon.className = `${this.CSS_CLASS_PREFIX}-panel-copy-btn-icon`;
        copyBtnIcon.textContent = "\u{1F4C4}";
        const copyBtnText = document.createElement("span");
        copyBtnText.textContent = "\u590D\u5236\u5230\u526A\u8D34\u677F";
        copyBtnContent.appendChild(copyBtnIcon);
        copyBtnContent.appendChild(copyBtnText);
        copyBtn.appendChild(copyBtnContent);
        copyBtn.onclick = () => {
          this.copyToClipboard();
          setTimeout(() => this.hide(), 1500);
        };
        copyBtnWrapper.appendChild(copyBtn);
        this.element.appendChild(header);
        this.element.appendChild(previewWrapper);
        this.element.appendChild(copyBtnWrapper);
      }
      document.body.appendChild(this.element);
      header.addEventListener("mousedown", (event) => this.startDrag(event));
      document.addEventListener("mousemove", this.handleDrag);
      document.addEventListener("mouseup", this.endDrag);
    }
    /**
     * 复制到剪贴板
     */
    async copyToClipboard() {
      try {
        await navigator.clipboard.writeText(this.currentText);
        this.showCopySuccess();
      } catch (error) {
        console.error("\u590D\u5236\u5931\u8D25:", error);
        this.showCopyError();
      }
    }
    /**
     * 显示复制成功
     */
    showCopySuccess() {
      const btn = this.element?.querySelector('button[data-role="copy"]');
      if (btn) {
        const originalHTML = btn.innerHTML;
        const iconSpan = btn.querySelector(`.${this.CSS_CLASS_PREFIX}-panel-copy-btn-icon`);
        const textSpan = btn.querySelector(`.${this.CSS_CLASS_PREFIX}-panel-copy-btn-content span:last-child`);
        if (iconSpan && textSpan) {
          iconSpan.textContent = "\u2713";
          textSpan.textContent = "\u5DF2\u590D\u5236";
        }
        btn.classList.add("success");
        setTimeout(() => {
          if (btn) {
            btn.innerHTML = originalHTML;
            btn.classList.remove("success");
          }
        }, 1500);
      }
    }
    /**
     * 显示复制错误
     */
    showCopyError() {
      const btn = this.element?.querySelector('button[data-role="copy"]');
      if (btn) {
        const originalHTML = btn.innerHTML;
        const iconSpan = btn.querySelector(`.${this.CSS_CLASS_PREFIX}-panel-copy-btn-icon`);
        const textSpan = btn.querySelector(`.${this.CSS_CLASS_PREFIX}-panel-copy-btn-content span:last-child`);
        if (iconSpan && textSpan) {
          iconSpan.textContent = "\u2717";
          textSpan.textContent = "\u590D\u5236\u5931\u8D25";
        }
        btn.classList.add("error");
        setTimeout(() => {
          if (btn) {
            btn.innerHTML = originalHTML;
            btn.classList.remove("error");
          }
        }, 1500);
      }
    }
    /**
     * 开始拖动
     */
    startDrag(event) {
      if (!this.element) return;
      const rect = this.element.getBoundingClientRect();
      this.dragState = {
        startX: event.clientX,
        startY: event.clientY,
        originLeft: rect.left,
        originTop: rect.top
      };
      event.preventDefault();
    }
    /**
     * 处理拖动
     */
    handleDrag = (event) => {
      if (!this.dragState || !this.element) return;
      const deltaX = event.clientX - this.dragState.startX;
      const deltaY = event.clientY - this.dragState.startY;
      const nextLeft = this.dragState.originLeft + deltaX;
      const nextTop = this.dragState.originTop + deltaY;
      const maxLeft = window.innerWidth - this.element.offsetWidth;
      const maxTop = window.innerHeight - this.element.offsetHeight;
      this.element.style.left = `${Math.min(Math.max(0, nextLeft), Math.max(0, maxLeft))}px`;
      this.element.style.top = `${Math.min(Math.max(0, nextTop), Math.max(0, maxTop))}px`;
    };
    /**
     * 结束拖动
     */
    endDrag = () => {
      this.dragState = null;
    };
  };

  // src/content/usage/storage.ts
  var STORAGE_KEYS = {
    USAGE_COUNT: "usage_count",
    LAST_USAGE_DATE: "last_usage_date"
  };
  var memoryFallback = {
    usageCount: 0,
    lastUsageDate: ""
  };
  async function getUsageCount() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.USAGE_COUNT]);
      return result[STORAGE_KEYS.USAGE_COUNT] || 0;
    } catch (error) {
      console.warn("Storage access failed, using memory fallback", error);
      return memoryFallback.usageCount;
    }
  }
  async function incrementUsage() {
    try {
      const count = await getUsageCount();
      await chrome.storage.local.set({
        [STORAGE_KEYS.USAGE_COUNT]: count + 1
      });
    } catch (error) {
      console.warn("Failed to increment usage, using memory fallback", error);
      memoryFallback.usageCount += 1;
    }
  }
  async function resetIfNewDay() {
    try {
      const today = (/* @__PURE__ */ new Date()).toDateString();
      const result = await chrome.storage.local.get([STORAGE_KEYS.LAST_USAGE_DATE]);
      const lastDate = result[STORAGE_KEYS.LAST_USAGE_DATE];
      if (!lastDate || lastDate !== today) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.USAGE_COUNT]: 0,
          [STORAGE_KEYS.LAST_USAGE_DATE]: today
        });
      }
    } catch (error) {
      console.warn("Date reset failed, using memory fallback", error);
      const today = (/* @__PURE__ */ new Date()).toDateString();
      if (memoryFallback.lastUsageDate !== today) {
        memoryFallback.usageCount = 0;
        memoryFallback.lastUsageDate = today;
      }
    }
  }

  // src/content/usage/policy.ts
  var FREE_POLICY = {
    maxPerDay: 20
  };

  // src/content/usage/usage.ts
  async function checkUsage() {
    await resetIfNewDay();
    const count = await getUsageCount();
    const policy = FREE_POLICY;
    if (count >= policy.maxPerDay) {
      return {
        allowed: false,
        reason: "limit-reached",
        remaining: 0
      };
    }
    return {
      allowed: true,
      remaining: policy.maxPerDay - count
    };
  }
  async function consumeUsage() {
    await incrementUsage();
  }

  // src/content/content.ts
  var BrowserSelectionCopy = class _BrowserSelectionCopy {
    // 需要忽略的交互元素标签名
    static IGNORED_TAGS = ["INPUT", "TEXTAREA", "SELECT", "BUTTON"];
    // 默认布局选项
    static DEFAULT_LAYOUT_OPTIONS = {
      lineThresholdRatio: 5,
      minHorizontalGap: 10
    };
    selection;
    panel;
    // 仅忽略紧随选择动作产生的首个 click
    ignoreNextOutsideClick = false;
    lastSelectionRect = null;
    settings = {
      enabled: false,
      panelPosition: "center"
    };
    lastMouseUpPoint = null;
    handleMouseDownBound = this.handleMouseDown.bind(this);
    handleMouseMoveBound = this.handleMouseMove.bind(this);
    handleMouseUpBound = this.handleMouseUp.bind(this);
    handleOutsideClickBound = this.handleOutsideClick.bind(this);
    handleKeydownBound = this.handleKeydown.bind(this);
    messageListener = null;
    settingsReady;
    constructor() {
      this.selection = new Selection();
      this.panel = new Panel();
      this.settingsReady = this.initializeSettings();
      this.bindEvents();
    }
    /**
     * 绑定鼠标事件
     */
    bindEvents() {
      document.addEventListener("mousedown", this.handleMouseDownBound);
      document.addEventListener("mousemove", this.handleMouseMoveBound);
      document.addEventListener("mouseup", this.handleMouseUpBound);
      document.addEventListener("click", this.handleOutsideClickBound);
      document.addEventListener("keydown", this.handleKeydownBound);
      if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
        this.messageListener = (message, _sender, sendResponse) => {
          const payload = message;
          if (payload?.type === "updateSettings" && payload.payload) {
            this.applySettings(payload.payload);
            sendResponse?.({ ok: true });
          }
        };
        chrome.runtime.onMessage.addListener(this.messageListener);
      }
    }
    /**
     * 鼠标按下事件
     */
    handleMouseDown(event) {
      if (!this.settings.enabled) return;
      if (event.button !== 0) {
        return;
      }
      if (this.panel.contains(event.target)) {
        return;
      }
      const target = event.target;
      if (_BrowserSelectionCopy.IGNORED_TAGS.includes(target.tagName)) {
        return;
      }
      this.selection.start(event.clientX, event.clientY);
      event.preventDefault();
      event.stopPropagation();
    }
    /**
     * 鼠标移动事件
     */
    handleMouseMove(event) {
      if (!this.settings.enabled) return;
      if (!this.selection.getIsSelecting()) return;
      this.selection.update(event.clientX, event.clientY);
      event.preventDefault();
      event.stopPropagation();
    }
    /**
     * 鼠标释放事件
     */
    async handleMouseUp(event) {
      if (!this.settings.enabled) return;
      if (!this.selection.getIsSelecting()) {
        return;
      }
      const rect = this.selection.finish();
      this.lastMouseUpPoint = { x: event.clientX, y: event.clientY };
      if (rect && this.selection.isValid(rect)) {
        const usage = await checkUsage();
        if (!usage.allowed) {
          this.panel.showLimitReached();
          return;
        }
        const text = extractText(rect, _BrowserSelectionCopy.DEFAULT_LAYOUT_OPTIONS);
        if (text.trim()) {
          this.lastSelectionRect = rect;
          this.handleShowResult(text);
          await consumeUsage();
        } else {
          this.panel.hide();
          this.lastSelectionRect = null;
        }
      }
      event.preventDefault();
      event.stopPropagation();
    }
    /**
     * 外部点击事件
     */
    handleOutsideClick(event) {
      if (this.ignoreNextOutsideClick && this.lastSelectionRect) {
        const docX = event.clientX + window.scrollX;
        const docY = event.clientY + window.scrollY;
        const { left, right, top, bottom } = this.lastSelectionRect;
        const insideSelection = docX >= left && docX <= right && docY >= top && docY <= bottom;
        if (insideSelection) {
          this.ignoreNextOutsideClick = false;
          return;
        }
      }
      this.ignoreNextOutsideClick = false;
    }
    /**
     * 快捷键切换启用状态
     */
    handleKeydown(event) {
      if (event.ctrlKey && event.shiftKey && event.code === "KeyY") {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement || event.target && event.target.isContentEditable) {
          return;
        }
        event.preventDefault();
        this.toggleEnabled();
      }
    }
    /**
     * 切换启用状态
     */
    async toggleEnabled() {
      const next = !this.settings.enabled;
      await this.applySettings({ enabled: next }, true);
      if (!next) {
        this.selection.clear();
        this.panel.hide();
      }
    }
    /**
     * 初始化设置
     */
    async initializeSettings() {
      const defaults = { enabled: false, panelPosition: "center" };
      if (typeof chrome === "undefined" || !chrome.storage?.local) {
        this.settings = defaults;
        return;
      }
      try {
        const result = await chrome.storage.local.get(["enabled", "panelPosition"]);
        this.settings = {
          enabled: typeof result.enabled === "boolean" ? result.enabled : defaults.enabled,
          panelPosition: ["center", "mouse", "none"].includes(result.panelPosition) ? result.panelPosition : defaults.panelPosition
        };
      } catch (error) {
        console.warn("\u8BFB\u53D6\u5B58\u50A8\u5931\u8D25\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u8BBE\u7F6E", error);
        this.settings = defaults;
      }
    }
    /**
     * 应用并可选持久化设置
     */
    async applySettings(partial, persist = false) {
      await this.settingsReady;
      const prevEnabled = this.settings.enabled;
      this.settings = { ...this.settings, ...partial };
      if (prevEnabled && !this.settings.enabled) {
        this.selection.clear();
        this.panel.hide();
      }
      if (persist && typeof chrome !== "undefined" && chrome.storage?.local) {
        try {
          await chrome.storage.local.set({
            enabled: this.settings.enabled,
            panelPosition: this.settings.panelPosition
          });
        } catch (error) {
          console.warn("\u4FDD\u5B58\u8BBE\u7F6E\u5931\u8D25", error);
        }
      }
    }
    /**
     * 根据配置展示结果或直接复制
     */
    handleShowResult(text) {
      const mode = this.settings.panelPosition;
      if (mode === "none") {
        navigator.clipboard?.writeText(text).catch((error) => {
          console.error("\u76F4\u63A5\u590D\u5236\u5931\u8D25:", error);
        });
        return;
      }
      const position = this.calcPanelPosition(mode);
      this.panel.show(text, { position, editable: true });
      this.ignoreNextOutsideClick = true;
    }
    /**
     * 计算面板位置
     */
    calcPanelPosition(mode) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelWidth = 320;
      const panelHeight = 320;
      if (mode === "center") {
        return {
          left: Math.max(10, (viewportWidth - panelWidth) / 2),
          top: Math.max(10, (viewportHeight - panelHeight) / 2)
        };
      }
      const anchor = this.lastMouseUpPoint || { x: viewportWidth / 2, y: viewportHeight / 2 };
      return {
        left: Math.min(Math.max(10, anchor.x + 16), viewportWidth - panelWidth - 10),
        top: Math.min(Math.max(10, anchor.y + 16), viewportHeight - panelHeight - 10)
      };
    }
    /**
     * 初始化插件
     */
    initialize() {
    }
    /**
     * 清理资源
     */
    cleanup() {
      this.selection.clear();
      this.panel.hide();
      document.removeEventListener("mousedown", this.handleMouseDownBound);
      document.removeEventListener("mousemove", this.handleMouseMoveBound);
      document.removeEventListener("mouseup", this.handleMouseUpBound);
      document.removeEventListener("click", this.handleOutsideClickBound);
      document.removeEventListener("keydown", this.handleKeydownBound);
      if (this.messageListener && typeof chrome !== "undefined" && chrome.runtime?.onMessage?.removeListener) {
        chrome.runtime.onMessage.removeListener(this.messageListener);
      }
      this.messageListener = null;
    }
  };
  if (!window.browserSelectionCopy) {
    window.browserSelectionCopy = new BrowserSelectionCopy();
    window.browserSelectionCopy.initialize();
  }
})();
