import { Selection } from './components/selection.js';
import { Extractor } from './components/extractor.js';
import { Panel } from './components/panel.js';
import type { PanelPosition, PluginSettings, SelectionRect } from './types.js';

/**
 * 浏览器框选复制插件 - 内容脚本
 * 组合选择框、文本提取器和结果面板
 */
class BrowserSelectionCopy {
  private selection: Selection;
  private extractor: Extractor;
  private panel: Panel;
  // 仅忽略紧随选择动作产生的首个 click
  private ignoreNextOutsideClick = false;
  private lastSelectionRect: SelectionRect | null = null;
  private settings: PluginSettings = {
    enabled: false,
    panelPosition: 'center'
  };
  private lastMouseUpPoint: { x: number; y: number } | null = null;
  private readonly handleMouseDownBound = this.handleMouseDown.bind(this);
  private readonly handleMouseMoveBound = this.handleMouseMove.bind(this);
  private readonly handleMouseUpBound = this.handleMouseUp.bind(this);
  private readonly handleOutsideClickBound = this.handleOutsideClick.bind(this);
  private readonly handleKeydownBound = this.handleKeydown.bind(this);
  private messageListener: ((message: unknown, _sender: unknown, sendResponse: (response: unknown) => void) => void) | null = null;
  private settingsReady: Promise<void>;

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
  private bindEvents(): void {
    document.addEventListener('mousedown', this.handleMouseDownBound);
    document.addEventListener('mousemove', this.handleMouseMoveBound);
    document.addEventListener('mouseup', this.handleMouseUpBound);
    document.addEventListener('click', this.handleOutsideClickBound);
    document.addEventListener('keydown', this.handleKeydownBound);

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      this.messageListener = (message, _sender, sendResponse) => {
        const payload = message as { type?: string; payload?: Partial<PluginSettings> };
        if (payload?.type === 'updateSettings' && payload.payload) {
          this.applySettings(payload.payload);
          sendResponse?.({ ok: true });
        }
      };
      chrome.runtime.onMessage.addListener(this.messageListener as (message: any, sender: any, sendResponse: (response?: any) => void) => void);
    }
  }

  /**
   * 鼠标按下事件
   */
  private handleMouseDown(event: MouseEvent): void {
    if (!this.settings.enabled) return;
    console.log('鼠标按下事件触发', event.button, event.clientX, event.clientY);
    
    // 忽略右键和中键
    if (event.button !== 0) {
      console.log('忽略非左键点击');
      return;
    }
    
    // 忽略在面板上的点击
    if (this.panel.contains(event.target as Node)) {
      console.log('忽略面板内点击');
      return;
    }
    
    // 忽略在表单元素上的点击
    const target = event.target as Element;
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
  private handleMouseMove(event: MouseEvent): void {
    if (!this.settings.enabled) return;
    if (!this.selection.getIsSelecting()) return;
    console.log('鼠标移动中', event.clientX, event.clientY);
    this.selection.update(event.clientX, event.clientY);
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * 鼠标释放事件
   */
  private handleMouseUp(event: MouseEvent): void {
    if (!this.settings.enabled) return;
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
      } else {
        console.log('提取的文本为空，不显示面板');
        this.panel.hide();
        this.lastSelectionRect = null;
      }
    } else {
      console.log('选择区域无效');
    }
    
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * 外部点击事件
   */
  private handleOutsideClick(event: Event): void {
    if (this.ignoreNextOutsideClick && this.lastSelectionRect) {
      const docX = (event as MouseEvent).clientX + window.scrollX;
      const docY = (event as MouseEvent).clientY + window.scrollY;
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

    if (!this.panel.contains(event.target as Node)) {
      this.panel.hide();
    }
  }

  /**
   * 快捷键切换启用状态
   */
  private handleKeydown(event: KeyboardEvent): void {
    // Ctrl + Alt + Shift + C
    if (event.ctrlKey && event.shiftKey && event.altKey && event.code === 'KeyC') {
      if (
        (event.target instanceof HTMLInputElement) ||
        (event.target instanceof HTMLTextAreaElement) ||
        (event.target instanceof HTMLSelectElement) ||
        (event.target instanceof HTMLButtonElement) ||
        (event.target && (event.target as HTMLElement).isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      this.toggleEnabled();
    }
  }

  /**
   * 切换启用状态
   */
  private async toggleEnabled(): Promise<void> {
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
  private async initializeSettings(): Promise<void> {
    const defaults: PluginSettings = { enabled: false, panelPosition: 'center' };
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      this.settings = defaults;
      return;
    }

    try {
      const result = await chrome.storage.local.get(['enabled', 'panelPosition']);
      this.settings = {
        enabled: typeof result.enabled === 'boolean' ? result.enabled : defaults.enabled,
        panelPosition: (['center', 'mouse', 'none'] as PanelPosition[]).includes(result.panelPosition)
          ? result.panelPosition
          : defaults.panelPosition
      };
    } catch (error) {
      console.warn('读取存储失败，使用默认设置', error);
      this.settings = defaults;
    }
  }

  /**
   * 应用并可选持久化设置
   */
  async applySettings(partial: Partial<PluginSettings>, persist = false): Promise<void> {
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
      } catch (error) {
        console.warn('保存设置失败', error);
      }
    }
  }

  /**
   * 根据配置展示结果或直接复制
   */
  private handleShowResult(text: string): void {
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
  private calcPanelPosition(mode: PanelPosition): { left: number; top: number } {
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
  initialize(): void {
    console.log('浏览器框选复制插件已初始化');
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.selection.clear();
    this.panel.hide();
    document.removeEventListener('mousedown', this.handleMouseDownBound);
    document.removeEventListener('mousemove', this.handleMouseMoveBound);
    document.removeEventListener('mouseup', this.handleMouseUpBound);
    document.removeEventListener('click', this.handleOutsideClickBound);
    document.removeEventListener('keydown', this.handleKeydownBound);
    if (this.messageListener && typeof chrome !== 'undefined' && chrome.runtime?.onMessage?.removeListener) {
      chrome.runtime.onMessage.removeListener(this.messageListener as (message: any, sender: any, sendResponse: (response?: any) => void) => void);
    }
    this.messageListener = null;
  }
}

// 全局初始化
declare global {
  interface Window {
    browserSelectionCopy?: BrowserSelectionCopy;
  }
}

// 防止重复初始化
if (!window.browserSelectionCopy) {
  console.log('开始初始化浏览器框选复制插件');
  window.browserSelectionCopy = new BrowserSelectionCopy();
  window.browserSelectionCopy.initialize();
  console.log('插件初始化完成');
} else {
  console.log('插件已经初始化过了');
}

export { BrowserSelectionCopy };
