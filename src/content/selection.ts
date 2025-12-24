import type { SelectionRect } from '../shared/types';

/**
 * 选择框组件
 * 处理鼠标交互，创建和管理选择框UI
 */
export class Selection {
  private element: HTMLDivElement | null = null;
  private startX = 0;
  private startY = 0;
  private isSelecting = false;
  private readonly CSS_CLASS_PREFIX = 'browser-selection-copy';

  /**
   * 开始选择
   */
  start(x: number, y: number): void {
    this.startX = x;
    this.startY = y;
    this.isSelecting = true;
    this.createElement();
  }

  /**
   * 更新选择框
   */
  update(x: number, y: number): void {
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
  finish(): SelectionRect | null {
    if (!this.element) {
      return null;
    }

    const rect = this.element.getBoundingClientRect();
    // 由于使用了 fixed 定位，不需要加上滚动偏移
    const selectionRect: SelectionRect = {
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
  isValid(rect: SelectionRect): boolean {
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    return width > 5 && height > 5;
  }

  /**
   * 获取选择状态
   */
  getIsSelecting(): boolean {
    return this.isSelecting;
  }

  /**
   * 清除选择框
   */
  clear(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.isSelecting = false;
  }

  /**
   * 创建选择框元素
   */
  private createElement(): void {
    this.element = document.createElement('div');
    this.element.className = `${this.CSS_CLASS_PREFIX}-box`;
    
    // 只设置动态位置和尺寸，其他样式由 CSS 控制
    Object.assign(this.element.style, {
      left: `${this.startX}px`,
      top: `${this.startY}px`,
      width: '0px',
      height: '0px'
    });

    document.body.appendChild(this.element);
  }
}