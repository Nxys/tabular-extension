/**
 * 选择框组件
 * 处理鼠标交互，创建和管理选择框UI
 */
export class Selection {
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
//# sourceMappingURL=selection.js.map