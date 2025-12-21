import { Selection } from './selection';
import { extractText, type LayoutOptions } from './extractor/index';
import { Panel } from './panel';
import type { PanelPosition, PluginSettings, SelectionRect } from '../types';

/**
 * 浏览器框选复制插件 - 内容脚本
 * 组合选择框、文本提取器和结果面板
 */
class BrowserSelectionCopy {
  // 需要忽略的交互元素标签名
  private static readonly IGNORED_TAGS = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];

  // 默认布局选项
  private static readonly DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
    lineThresholdRatio: 5,
    minHorizontalGap: 10
  };

  private selection: Selection;
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

    // 忽略右键和中键
    if (event.button !== 0) {
      return;
    }

    // 忽略在面板上的点击
    if (this.panel.contains(event.target as Node)) {
      return;
    }

    // 忽略在交互元素上的点击
    const target = event.target as Element;
    if (BrowserSelectionCopy.IGNORED_TAGS.includes(target.tagName)) {
      return;
    }

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
    this.selection.update(event.clientX, event.clientY);
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * 鼠标释放事件
   */
  private handleMouseUp(event: MouseEvent): void {
    if (!this.settings.enabled) return;

    if (!this.selection.getIsSelecting()) {
      return;
    }

    const rect = this.selection.finish();
    this.lastMouseUpPoint = { x: event.clientX, y: event.clientY };

    if (rect && this.selection.isValid(rect)) {
      const text = extractText(rect, BrowserSelectionCopy.DEFAULT_LAYOUT_OPTIONS);

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

    // 不再自动关闭面板，只能通过关闭按钮或复制按钮关闭
  }

  /**
   * 快捷键切换启用状态
   */
  private handleKeydown(event: KeyboardEvent): void {
    // Ctrl + Shift + Y
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyY') {
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
  initialize(): void { }

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
      chrome.runtime.onMessage.removeListener(this.messageListener as (message: any, sender: any, sendResponse: (response?: unknown) => void) => void);
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
  window.browserSelectionCopy = new BrowserSelectionCopy();
  window.browserSelectionCopy.initialize();
}

export { BrowserSelectionCopy };
