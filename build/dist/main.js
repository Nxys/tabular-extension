import { BrowserSelectionCopy } from './content.js';
/**
 * 主控制器 - 简化版，直接使用合并后的组件
 */
export class MainController {
    browserSelectionCopy;
    isActive = false;
    constructor() {
        this.browserSelectionCopy = new BrowserSelectionCopy();
    }
    /**
     * 初始化控制器
     */
    initialize() {
        if (this.isActive)
            return;
        this.isActive = true;
        this.browserSelectionCopy.initialize();
    }
    /**
     * 销毁控制器
     */
    destroy() {
        if (!this.isActive)
            return;
        this.isActive = false;
        this.browserSelectionCopy.cleanup();
    }
}
//# sourceMappingURL=main.js.map