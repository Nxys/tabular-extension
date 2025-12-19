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

  // src/content/extractor.ts
  var Extractor = class {
    LINE_TOLERANCE = 5;
    /**
     * 提取选择区域内的文本
     */
    extract(rect) {
      const elements = this.getTextElements(rect);
      if (elements.length > 0) {
        const sorted = this.sortByVisualOrder(elements);
        const result = this.combineText(sorted);
        return result;
      }
      return "";
    }
    /**
     * 获取文本元素
     */
    getTextElements(rect) {
      const elements = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node2) => {
            if (!node2.textContent?.trim()) return NodeFilter.FILTER_REJECT;
            const parent = node2.parentElement;
            return parent && this.isVisible(parent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
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
          if (this.intersects(elementRect, rect)) {
            elements.push({
              text: node.textContent || "",
              rect: clientRect,
              element: parent,
              lineIndex: -1,
              columnIndex: -1
            });
            break;
          }
        }
      }
      return elements;
    }
    /**
     * 检查元素是否可见
     */
    isVisible(element) {
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    }
    /**
     * 检查矩形是否相交
     */
    intersects(rect1, rect2) {
      return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
    }
    /**
     * 按视觉顺序排序
     */
    sortByVisualOrder(elements) {
      const lines = [];
      elements.forEach((element) => {
        const elementTop = element.rect.top;
        let foundLine = false;
        for (const line of lines) {
          const lineTop = line[0].rect.top;
          if (Math.abs(elementTop - lineTop) <= this.LINE_TOLERANCE) {
            line.push(element);
            foundLine = true;
            break;
          }
        }
        if (!foundLine) {
          lines.push([element]);
        }
      });
      lines.forEach((line) => {
        line.sort((a, b) => a.rect.left - b.rect.left);
      });
      lines.sort((a, b) => a[0].rect.top - b[0].rect.top);
      return lines.flat();
    }
    /**
     * 合并文本
     */
    combineText(elements) {
      if (elements.length === 0) return "";
      try {
        const maxElements = 50;
        const limitedElements = elements.slice(0, maxElements);
        const lines = [];
        let currentLine = [];
        let lastTop = limitedElements[0].rect.top;
        limitedElements.forEach((element) => {
          const text = element.text.trim();
          if (!text || text.length > 1e3) return;
          if (Math.abs(element.rect.top - lastTop) > this.LINE_TOLERANCE) {
            if (currentLine.length > 0) {
              const safeCurrentLine = currentLine.slice(0, 10);
              try {
                const lineText = safeCurrentLine.join(" ");
                if (lineText.length < 1e4) {
                  lines.push(lineText);
                }
              } catch (e) {
                if (safeCurrentLine.length > 0) {
                  lines.push(safeCurrentLine[0]);
                }
              }
              currentLine = [];
            }
            lastTop = element.rect.top;
          }
          if (currentLine.length < 10 && text.length < 1e3) {
            currentLine.push(text);
          }
        });
        if (currentLine.length > 0) {
          const safeCurrentLine = currentLine.slice(0, 10);
          try {
            const lineText = safeCurrentLine.join(" ");
            if (lineText.length < 1e4) {
              lines.push(lineText);
            }
          } catch (e) {
            if (safeCurrentLine.length > 0) {
              lines.push(safeCurrentLine[0]);
            }
          }
        }
        const limitedLines = lines.slice(0, 10);
        try {
          return limitedLines.join("\n");
        } catch (e) {
          return limitedLines.length > 0 ? limitedLines[0] : "";
        }
      } catch (error) {
        console.warn("\u6587\u672C\u5408\u5E76\u51FA\u9519:", error);
        return "\u6587\u672C\u63D0\u53D6\u51FA\u9519";
      }
    }
  };

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
    createElement(position, editable) {
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
      icon.textContent = "\u{1F4CB}";
      const titleText = document.createElement("span");
      titleText.textContent = "\u6587\u672C\u9884\u89C8";
      title.appendChild(icon);
      title.appendChild(titleText);
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = `${this.CSS_CLASS_PREFIX}-panel-close`;
      closeBtn.textContent = "\xD7";
      closeBtn.onclick = () => this.hide();
      header.appendChild(title);
      header.appendChild(closeBtn);
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

  // src/content/content.ts
  var BrowserSelectionCopy = class _BrowserSelectionCopy {
    // 需要忽略的交互元素标签名
    static IGNORED_TAGS = ["INPUT", "TEXTAREA", "SELECT", "BUTTON"];
    selection;
    extractor;
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
      this.extractor = new Extractor();
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
    handleMouseUp(event) {
      if (!this.settings.enabled) return;
      if (!this.selection.getIsSelecting()) {
        return;
      }
      const rect = this.selection.finish();
      this.lastMouseUpPoint = { x: event.clientX, y: event.clientY };
      if (rect && this.selection.isValid(rect)) {
        const text = this.extractor.extract(rect);
        if (text.trim()) {
          this.lastSelectionRect = rect;
          this.handleShowResult(text);
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
