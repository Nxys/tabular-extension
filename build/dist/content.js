import { Selection } from './components/selection.js';
import { Extractor } from './components/extractor.js';
import { Panel } from './components/panel.js';
/**
 * 浏览器框选复制插件 - 内容脚本
 * 组合选择框、文本提取器和结果面板
 */
class BrowserSelectionCopy {
    selection;
    extractor;
    panel;
    constructor() {
        this.selection = new Selection();
        this.extractor = new Extractor();
        this.panel = new Panel();
        this.bindEvents();
    }
    /**
     * 绑定鼠标事件
     */
    bindEvents() {
        // 使用捕获阶段确保事件优先处理
        document.addEventListener('mousedown', this.handleMouseDown.bind(this), true);
        document.addEventListener('mousemove', this.handleMouseMove.bind(this), true);
        document.addEventListener('mouseup', this.handleMouseUp.bind(this), true);
        document.addEventListener('click', this.handleOutsideClick.bind(this));
    }
    /**
     * 鼠标按下事件
     */
    handleMouseDown(event) {
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
        console.log('鼠标释放事件触发');
        if (!this.selection.getIsSelecting()) {
            console.log('当前未在选择状态');
            return;
        }
        console.log('完成选择，获取选择区域');
        const rect = this.selection.finish();
        console.log('选择区域:', rect);
        if (rect && this.selection.isValid(rect)) {
            console.log('选择区域有效，开始提取文本');
            const text = this.extractor.extract(rect);
            console.log('提取的文本:', text);
            if (text.trim()) {
                console.log('显示结果面板');
                this.panel.show(text);
            }
            else {
                console.log('提取的文本为空，显示默认消息');
                this.panel.show('未找到文本内容');
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
        if (!this.panel.contains(event.target)) {
            this.panel.hide();
        }
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
export { BrowserSelectionCopy };
//# sourceMappingURL=content.js.map