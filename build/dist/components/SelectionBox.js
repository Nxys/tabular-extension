/**
 * 选择框组件 - 处理鼠标交互，创建和管理选择框UI
 */
export class SelectionBox {
    selectionElement = null;
    startX = 0;
    startY = 0;
    isSelecting = false;
    isCompleted = false; // 选择是否已完成
    onSelectionComplete;
    constructor() {
        this.bindMouseEvents();
    }
    /**
     * 开始选择操作
     */
    startSelection(startX, startY) {
        this.startX = startX;
        this.startY = startY;
        this.isSelecting = true;
        this.createSelectionElement();
    }
    /**
     * 更新选择框位置和大小
     */
    updateSelection(currentX, currentY) {
        if (!this.isSelecting || !this.selectionElement)
            return;
        // 计算选择框的位置和尺寸
        const left = Math.min(this.startX, currentX);
        const top = Math.min(this.startY, currentY);
        const width = Math.abs(currentX - this.startX);
        const height = Math.abs(currentY - this.startY);
        // 使用 !important 确保样式不被页面CSS覆盖
        this.selectionElement.style.setProperty('left', `${left}px`, 'important');
        this.selectionElement.style.setProperty('top', `${top}px`, 'important');
        this.selectionElement.style.setProperty('width', `${width}px`, 'important');
        this.selectionElement.style.setProperty('height', `${height}px`, 'important');
    }
    /**
     * 完成选择操作并返回选择区域
     */
    finishSelection() {
        if (!this.selectionElement) {
            throw new Error('没有活动的选择框');
        }
        // 从样式中获取位置和尺寸，这些是页面坐标
        const left = parseInt(this.selectionElement.style.left) || 0;
        const top = parseInt(this.selectionElement.style.top) || 0;
        const width = parseInt(this.selectionElement.style.width) || 0;
        const height = parseInt(this.selectionElement.style.height) || 0;
        const selectionRect = {
            left: left,
            top: top,
            right: left + width,
            bottom: top + height
        };
        // 更新状态：选择完成但选择框保持可见
        this.isSelecting = false;
        this.isCompleted = true;
        return selectionRect;
    }
    /**
     * 清除选择框
     */
    clearSelection() {
        if (this.selectionElement) {
            this.selectionElement.remove();
            this.selectionElement = null;
        }
        this.isSelecting = false;
        this.isCompleted = false;
    }
    /**
     * 设置选择完成回调函数
     */
    setOnSelectionComplete(callback) {
        this.onSelectionComplete = callback;
    }
    /**
     * 检查是否正在选择
     */
    isCurrentlySelecting() {
        return this.isSelecting;
    }
    /**
     * 检查选择是否已完成
     */
    isSelectionCompleted() {
        return this.isCompleted;
    }
    /**
     * 检查是否有活动的选择框
     */
    hasActiveSelection() {
        return this.selectionElement !== null;
    }
    /**
     * 绑定鼠标事件处理器
     */
    bindMouseEvents() {
        // 鼠标按下事件 - 开始选择
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        // 鼠标移动事件 - 更新选择框
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        // 鼠标释放事件 - 完成选择
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        // 点击其他区域清除选择框
        document.addEventListener('click', this.handleClick.bind(this));
    }
    /**
     * 处理鼠标按下事件
     */
    handleMouseDown(event) {
        // 只处理左键点击
        if (event.button !== 0)
            return;
        // 防止在已有选择框上开始新选择
        if (event.target === this.selectionElement)
            return;
        // 如果已有完成的选择框，清除它以开始新选择
        if (this.isCompleted) {
            this.clearSelection();
        }
        // 阻止默认行为，避免文本选择
        event.preventDefault();
        // 获取鼠标位置（相对于页面）
        const startX = event.pageX;
        const startY = event.pageY;
        // 开始选择
        this.startSelection(startX, startY);
    }
    /**
     * 处理鼠标移动事件
     */
    handleMouseMove(event) {
        // 只在选择状态下处理移动
        if (!this.isSelecting)
            return;
        // 获取当前鼠标位置（相对于页面）
        const currentX = event.pageX;
        const currentY = event.pageY;
        // 更新选择框
        this.updateSelection(currentX, currentY);
    }
    /**
     * 处理鼠标释放事件
     */
    handleMouseUp(event) {
        // 只处理左键释放
        if (event.button !== 0)
            return;
        // 只在选择状态下处理释放
        if (!this.isSelecting)
            return;
        // 检查选择框是否足够大（至少5x5像素）
        if (this.selectionElement) {
            const width = parseInt(this.selectionElement.style.width) || 0;
            const height = parseInt(this.selectionElement.style.height) || 0;
            if (width < 5 || height < 5) {
                // 选择区域太小，清除选择框
                this.clearSelection();
                return;
            }
        }
        // 完成选择并获取选择区域
        const selectionRect = this.finishSelection();
        // 触发选择完成回调
        if (this.onSelectionComplete) {
            this.onSelectionComplete(selectionRect);
        }
    }
    /**
     * 处理点击事件 - 用于清除选择框
     */
    handleClick(event) {
        // 如果选择已完成且点击的不是选择框，清除选择框
        if (this.isCompleted &&
            this.selectionElement &&
            event.target !== this.selectionElement &&
            !this.selectionElement.contains(event.target)) {
            this.clearSelection();
        }
    }
    /**
     * 销毁组件，移除事件监听器
     */
    destroy() {
        document.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        document.removeEventListener('click', this.handleClick.bind(this));
        this.clearSelection();
    }
    /**
     * 创建选择框DOM元素
     */
    createSelectionElement() {
        // 清除之前的选择框，但不重置 isSelecting 状态
        if (this.selectionElement) {
            this.selectionElement.remove();
            this.selectionElement = null;
        }
        this.selectionElement = document.createElement('div');
        this.selectionElement.className = 'browser-selection-copy-box';
        // 使用 setProperty 方法设置重要样式，确保在所有页面上都能正确显示
        const styles = {
            'position': 'absolute',
            'border': '2px dashed #007acc',
            'background-color': 'rgba(0, 122, 204, 0.1)',
            'pointer-events': 'none',
            'z-index': '2147483647',
            'box-sizing': 'border-box',
            'margin': '0',
            'padding': '0',
            'left': `${this.startX}px`,
            'top': `${this.startY}px`,
            'width': '0px',
            'height': '0px',
            'border-radius': '0',
            'outline': 'none',
            'box-shadow': 'none',
            'opacity': '1',
            'visibility': 'visible',
            'display': 'block',
            'transform': 'none',
            'transition': 'none'
        };
        // 应用所有样式，使用 important 优先级
        Object.entries(styles).forEach(([property, value]) => {
            this.selectionElement.style.setProperty(property, value, 'important');
        });
        document.body.appendChild(this.selectionElement);
    }
}
//# sourceMappingURL=SelectionBox.js.map