import { IMainController } from './types/index.js';
/**
 * 主控制器 - 协调各组件交互，管理完整的用户操作流程
 */
export declare class MainController implements IMainController {
    private selectionBox;
    private textExtractor;
    private resultPanel;
    private isActive;
    constructor();
    /**
     * 初始化控制器，绑定事件监听器
     */
    initialize(): void;
    /**
     * 销毁控制器，清理资源
     */
    destroy(): void;
    /**
     * 绑定鼠标事件监听器
     */
    private bindEvents;
    /**
     * 解绑事件监听器
     */
    private unbindEvents;
    /**
     * 处理鼠标按下事件
     */
    private handleMouseDown;
    /**
     * 处理鼠标移动事件
     */
    private handleMouseMove;
    /**
     * 处理鼠标释放事件
     */
    private handleMouseUp;
    /**
     * 显示无文本反馈
     */
    private showNoTextFeedback;
    /**
     * 显示错误反馈
     */
    private showErrorFeedback;
}
//# sourceMappingURL=MainController.d.ts.map