// 浏览器框选复制插件 - 合并后的 Content Script
// 自动生成，请勿手动编辑

// === build/dist/types.js ===
{};


// === build/dist/components/selection.js ===
/**
 * 选择框组件
 * 处理鼠标交互，创建和管理选择框UI
 */
class Selection {
    element = null;
    startX = 0;
    startY = 0;
    isSelecting = false;
    CSS_CLASS_PREFIX = 'browser-selection-copy';
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
        if (!this.element)
            return;
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
            console.log('选择框元素不存在');
            return null;
        }
        const rect = this.element.getBoundingClientRect();
        console.log('选择框DOM矩形:', rect);
        // 由于使用了 fixed 定位，不需要加上滚动偏移
        const selectionRect = {
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY,
            right: rect.right + window.scrollX,
            bottom: rect.bottom + window.scrollY
        };
        console.log('计算的选择区域:', selectionRect);
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
        console.log('创建选择框元素，起始位置:', this.startX, this.startY);
        this.element = document.createElement('div');
        this.element.className = `${this.CSS_CLASS_PREFIX}-box`;
        Object.assign(this.element.style, {
            position: 'fixed', // 改为 fixed 定位，避免滚动问题
            border: '2px dashed #007acc',
            backgroundColor: 'rgba(0, 122, 204, 0.1)',
            pointerEvents: 'none',
            zIndex: '2147483647',
            left: `${this.startX}px`,
            top: `${this.startY}px`,
            width: '0px',
            height: '0px'
        });
        document.body.appendChild(this.element);
        console.log('选择框已添加到DOM');
    }
}


// === build/dist/components/extractor.js ===
/**
 * 文本提取器
 * 从选择区域提取文本并按视觉顺序排列
 */
class Extractor {
    LINE_TOLERANCE = 5;
    /**
     * 提取选择区域内的文本
     */
    extract(rect) {
        console.log('开始提取文本，选择区域:', rect);
        // 方法1：使用TreeWalker
        const elements = this.getTextElements(rect);
        console.log('TreeWalker找到文本元素数量:', elements.length);
        if (elements.length > 0) {
            const sorted = this.sortByVisualOrder(elements);
            console.log('排序后元素数量:', sorted.length);
            const result = this.combineText(sorted);
            console.log('TreeWalker提取结果:', result);
            if (result.trim()) {
                return result;
            }
        }
        // 方法2：备用方法 - 使用elementsFromPoint
        console.log('使用备用提取方法');
        const centerX = rect.left + (rect.right - rect.left) / 2;
        const centerY = rect.top + (rect.bottom - rect.top) / 2;
        // jsdom 环境可能不存在 elementsFromPoint，这里做兼容处理
        const elementsFromPoint = typeof document.elementsFromPoint === 'function'
            ? document.elementsFromPoint.bind(document)
            : null;
        if (!elementsFromPoint) {
            console.warn('elementsFromPoint 不可用，返回空结果');
            return '';
        }
        const elementsAtPoint = elementsFromPoint(centerX, centerY);
        console.log('中心点元素:', elementsAtPoint);
        let fallbackText = '';
        for (const element of elementsAtPoint) {
            const text = element.textContent || element.innerText || '';
            if (text.trim()) {
                fallbackText += text.trim() + '\n';
                break; // 只取第一个有文本的元素
            }
        }
        console.log('备用方法提取结果:', fallbackText);
        return fallbackText.trim();
    }
    /**
     * 获取文本元素
     */
    getTextElements(rect) {
        const elements = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (!node.textContent?.trim())
                    return NodeFilter.FILTER_REJECT;
                const parent = node.parentElement;
                return parent && this.isVisible(parent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });
        let node;
        while ((node = walker.nextNode())) {
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
                        text: node.textContent || '',
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
        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0';
    }
    /**
     * 检查矩形是否相交
     */
    intersects(rect1, rect2) {
        return !(rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom);
    }
    /**
     * 按视觉顺序排序
     */
    sortByVisualOrder(elements) {
        // 按行分组
        const lines = [];
        elements.forEach(element => {
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
        // 行内按X坐标排序，行间按Y坐标排序
        lines.forEach(line => {
            line.sort((a, b) => a.rect.left - b.rect.left);
        });
        lines.sort((a, b) => a[0].rect.top - b[0].rect.top);
        return lines.flat();
    }
    /**
     * 合并文本
     */
    combineText(elements) {
        if (elements.length === 0)
            return '';
        try {
            // 防护措施：严格限制元素数量，避免内存溢出
            const maxElements = 50;
            const limitedElements = elements.slice(0, maxElements);
            const lines = [];
            let currentLine = [];
            let lastTop = limitedElements[0].rect.top;
            limitedElements.forEach(element => {
                const text = element.text.trim();
                if (!text || text.length > 1000)
                    return; // 跳过空文本和过长文本
                if (Math.abs(element.rect.top - lastTop) > this.LINE_TOLERANCE) {
                    // 新行
                    if (currentLine.length > 0) {
                        // 防护措施：严格限制单行元素数量和文本长度
                        const safeCurrentLine = currentLine.slice(0, 10);
                        try {
                            const lineText = safeCurrentLine.join(' ');
                            if (lineText.length < 10000) { // 限制行长度
                                lines.push(lineText);
                            }
                        }
                        catch (e) {
                            // 如果join失败，使用第一个元素
                            if (safeCurrentLine.length > 0) {
                                lines.push(safeCurrentLine[0]);
                            }
                        }
                        currentLine = [];
                    }
                    lastTop = element.rect.top;
                }
                // 防护措施：严格限制单行元素数量
                if (currentLine.length < 10 && text.length < 1000) {
                    currentLine.push(text);
                }
            });
            if (currentLine.length > 0) {
                const safeCurrentLine = currentLine.slice(0, 10);
                try {
                    const lineText = safeCurrentLine.join(' ');
                    if (lineText.length < 10000) {
                        lines.push(lineText);
                    }
                }
                catch (e) {
                    if (safeCurrentLine.length > 0) {
                        lines.push(safeCurrentLine[0]);
                    }
                }
            }
            // 防护措施：严格限制总行数
            const limitedLines = lines.slice(0, 10);
            try {
                return limitedLines.join('\n');
            }
            catch (e) {
                // 如果最终join失败，返回第一行
                return limitedLines.length > 0 ? limitedLines[0] : '';
            }
        }
        catch (error) {
            console.warn('文本合并出错:', error);
            return '文本提取出错';
        }
    }
}


// === build/dist/components/panel.js ===
/**
 * 结果面板
 * 显示提取结果和提供复制功能的浮动面板
 */
class Panel {
    element = null;
    currentText = '';
    CSS_CLASS_PREFIX = 'browser-selection-copy';
    dragState = null;
    /**
     * 显示结果
     */
    show(text, options = {
        position: { left: 50, top: 50 },
        editable: true
    }) {
        console.log('面板显示被调用，文本长度:', text.length);
        console.log('文本内容:', text);
        this.currentText = text;
        this.createElement(options.position, options.editable ?? true);
        console.log('面板元素已创建');
    }
    /**
     * 隐藏面板
     */
    hide() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.endDrag);
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
        console.log('开始创建面板元素');
        this.hide(); // 确保只有一个面板
        this.element = document.createElement('div');
        this.element.className = `${this.CSS_CLASS_PREFIX}-panel`;
        Object.assign(this.element.style, {
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: '320px',
            maxHeight: '440px',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '2147483647',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '14px',
            padding: '0',
            display: 'block',
            visibility: 'visible',
            opacity: '1',
            pointerEvents: 'auto',
            overflow: 'hidden'
        });
        console.log('面板样式已设置');
        const header = document.createElement('div');
        header.className = `${this.CSS_CLASS_PREFIX}-panel-header`;
        header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      cursor: move;
      user-select: none;
      background: #f7f7f7;
      border-bottom: 1px solid #eee;
      font-weight: 600;
    `;
        header.textContent = '文本预览';
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        closeBtn.dataset.role = 'close';
        closeBtn.style.cssText = `
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: transparent;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      color: #666;
      padding: 0;
    `;
        closeBtn.onclick = () => this.hide();
        header.appendChild(closeBtn);
        // 文本预览
        const preview = document.createElement('textarea');
        preview.style.cssText = `
      width: 100%;
      height: 220px;
      resize: none;
      border: none;
      outline: none;
      padding: 12px;
      background: #fdfdfd;
      border-bottom: 1px solid #eee;
      white-space: pre-wrap;
      box-sizing: border-box;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.5;
      color: #222;
    `;
        preview.readOnly = !editable;
        preview.value = this.currentText;
        preview.oninput = (e) => {
            const target = e.target;
            this.currentText = target.value;
        };
        // 复制按钮
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '复制到剪贴板';
        copyBtn.dataset.role = 'copy';
        copyBtn.style.cssText = `
      width: calc(100% - 24px);
      margin: 12px;
      padding: 10px;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    `;
        copyBtn.onclick = () => this.copyToClipboard();
        this.element.appendChild(header);
        this.element.appendChild(preview);
        this.element.appendChild(copyBtn);
        console.log('将面板添加到页面');
        document.body.appendChild(this.element);
        console.log('面板已添加到DOM，元素:', this.element);
        console.log('面板位置:', this.element.getBoundingClientRect());
        // 绑定拖动
        header.addEventListener('mousedown', (event) => this.startDrag(event));
        document.addEventListener('mousemove', this.handleDrag);
        document.addEventListener('mouseup', this.endDrag);
    }
    /**
     * 复制到剪贴板
     */
    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.currentText);
            this.showCopySuccess();
        }
        catch (error) {
            console.error('复制失败:', error);
            this.showCopyError();
        }
    }
    /**
     * 显示复制成功
     */
    showCopySuccess() {
        const btn = this.element?.querySelector('button[data-role="copy"]');
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '✓ 已复制';
            btn.style.background = '#28a745';
            setTimeout(() => {
                if (btn) {
                    btn.textContent = originalText;
                    btn.style.background = '#007acc';
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
            const originalText = btn.textContent;
            btn.textContent = '复制失败';
            btn.style.background = '#dc3545';
            setTimeout(() => {
                if (btn) {
                    btn.textContent = originalText;
                    btn.style.background = '#007acc';
                }
            }, 1500);
        }
    }
    /**
     * 开始拖动
     */
    startDrag(event) {
        if (!this.element)
            return;
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
        if (!this.dragState || !this.element)
            return;
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
}


// === build/dist/content.js ===



/**
 * 浏览器框选复制插件 - 内容脚本
 * 组合选择框、文本提取器和结果面板
 */
class BrowserSelectionCopy {
    selection;
    extractor;
    panel;
    // 仅忽略紧随选择动作产生的首个 click
    ignoreNextOutsideClick = false;
    lastSelectionRect = null;
    settings = {
        enabled: false,
        panelPosition: 'center'
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
        document.addEventListener('mousedown', this.handleMouseDownBound);
        document.addEventListener('mousemove', this.handleMouseMoveBound);
        document.addEventListener('mouseup', this.handleMouseUpBound);
        document.addEventListener('click', this.handleOutsideClickBound);
        document.addEventListener('keydown', this.handleKeydownBound);
        if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
            this.messageListener = (message, _sender, sendResponse) => {
                const payload = message;
                if (payload?.type === 'updateSettings' && payload.payload) {
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
        if (!this.settings.enabled)
            return;
        console.log('鼠标按下事件触发', event.button, event.clientX, event.clientY);
        // 忽略右键和中键
        if (event.button !== 0) {
            console.log('忽略非左键点击');
            return;
        }
        // 忽略在面板上的点击
        if (this.panel.contains(event.target)) {
            console.log('忽略面板内点击');
            return;
        }
        // 忽略在表单元素上的点击
        const target = event.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.tagName === 'BUTTON') {
            console.log('忽略表单元素点击');
            return;
        }
        console.log('开始选择');
        this.selection.start(event.clientX, event.clientY);
        event.preventDefault();
        event.stopPropagation();
    }
    /**
     * 鼠标移动事件
     */
    handleMouseMove(event) {
        if (!this.settings.enabled)
            return;
        if (!this.selection.getIsSelecting())
            return;
        console.log('鼠标移动中', event.clientX, event.clientY);
        this.selection.update(event.clientX, event.clientY);
        event.preventDefault();
        event.stopPropagation();
    }
    /**
     * 鼠标释放事件
     */
    handleMouseUp(event) {
        if (!this.settings.enabled)
            return;
        console.log('鼠标释放事件触发');
        if (!this.selection.getIsSelecting()) {
            console.log('当前未在选择状态');
            return;
        }
        console.log('完成选择，获取选择区域');
        const rect = this.selection.finish();
        console.log('选择区域:', rect);
        this.lastMouseUpPoint = { x: event.clientX, y: event.clientY };
        if (rect && this.selection.isValid(rect)) {
            console.log('选择区域有效，开始提取文本');
            const text = this.extractor.extract(rect);
            console.log('提取的文本:', text);
            if (text.trim()) {
                console.log('显示结果面板或直接复制');
                this.lastSelectionRect = rect;
                this.handleShowResult(text);
            }
            else {
                console.log('提取的文本为空，不显示面板');
                this.panel.hide();
                this.lastSelectionRect = null;
            }
        }
        else {
            console.log('选择区域无效');
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
                // 忽略释放鼠标后紧随而来的点击
                this.ignoreNextOutsideClick = false;
                return;
            }
        }
        // 重置忽略标记，确保后续点击正常处理
        this.ignoreNextOutsideClick = false;
        if (!this.panel.contains(event.target)) {
            this.panel.hide();
        }
    }
    /**
     * 快捷键切换启用状态
     */
    handleKeydown(event) {
        // Ctrl + Alt + Shift + C
        if (event.ctrlKey && event.shiftKey && event.altKey && event.code === 'KeyC') {
            if ((event.target instanceof HTMLInputElement) ||
                (event.target instanceof HTMLTextAreaElement) ||
                (event.target instanceof HTMLSelectElement) ||
                (event.target instanceof HTMLButtonElement) ||
                (event.target && event.target.isContentEditable)) {
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
        const defaults = { enabled: false, panelPosition: 'center' };
        if (typeof chrome === 'undefined' || !chrome.storage?.local) {
            this.settings = defaults;
            return;
        }
        try {
            const result = await chrome.storage.local.get(['enabled', 'panelPosition']);
            this.settings = {
                enabled: typeof result.enabled === 'boolean' ? result.enabled : defaults.enabled,
                panelPosition: ['center', 'mouse', 'none'].includes(result.panelPosition)
                    ? result.panelPosition
                    : defaults.panelPosition
            };
        }
        catch (error) {
            console.warn('读取存储失败，使用默认设置', error);
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
        // 当被关闭时立刻清理 UI
        if (prevEnabled && !this.settings.enabled) {
            this.selection.clear();
            this.panel.hide();
        }
        if (persist && typeof chrome !== 'undefined' && chrome.storage?.local) {
            try {
                await chrome.storage.local.set({
                    enabled: this.settings.enabled,
                    panelPosition: this.settings.panelPosition
                });
            }
            catch (error) {
                console.warn('保存设置失败', error);
            }
        }
    }
    /**
     * 根据配置展示结果或直接复制
     */
    handleShowResult(text) {
        const mode = this.settings.panelPosition;
        if (mode === 'none') {
            navigator.clipboard?.writeText(text).catch((error) => {
                console.error('直接复制失败:', error);
            });
            return;
        }
        const position = this.calcPanelPosition(mode);
        this.panel.show(text, { position, editable: true });
        // 只忽略紧随本次选择动作的首个 click
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
        if (mode === 'center') {
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
        console.log('浏览器框选复制插件已初始化');
    }
    /**
     * 清理资源
     */
    cleanup() {
        this.selection.clear();
        this.panel.hide();
        document.removeEventListener('mousedown', this.handleMouseDownBound);
        document.removeEventListener('mousemove', this.handleMouseMoveBound);
        document.removeEventListener('mouseup', this.handleMouseUpBound);
        document.removeEventListener('click', this.handleOutsideClickBound);
        document.removeEventListener('keydown', this.handleKeydownBound);
        if (this.messageListener && typeof chrome !== 'undefined' && chrome.runtime?.onMessage?.removeListener) {
            chrome.runtime.onMessage.removeListener(this.messageListener);
        }
        this.messageListener = null;
    }
}
// 防止重复初始化
if (!window.browserSelectionCopy) {
    console.log('开始初始化浏览器框选复制插件');
    window.browserSelectionCopy = new BrowserSelectionCopy();
    window.browserSelectionCopy.initialize();
    console.log('插件初始化完成');
}
else {
    console.log('插件已经初始化过了');
}
{ BrowserSelectionCopy };


