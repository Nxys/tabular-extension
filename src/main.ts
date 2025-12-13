import { BrowserSelectionCopy } from './content.js';

/**
 * 主控制器 - 简化版，直接使用合并后的组件
 */
export class MainController {
  private browserSelectionCopy: BrowserSelectionCopy;
  private isActive: boolean = false;

  constructor() {
    this.browserSelectionCopy = new BrowserSelectionCopy();
  }

  /**
   * 初始化控制器
   */
  initialize(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.browserSelectionCopy.initialize();
  }

  /**
   * 销毁控制器
   */
  destroy(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.browserSelectionCopy.cleanup();
  }
}