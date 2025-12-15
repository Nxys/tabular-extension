"use strict";
// 后台服务脚本 - 处理扩展生命周期事件
// 扩展安装时的处理
chrome.runtime.onInstalled.addListener((details) => {
    console.log('浏览器框选复制插件已安装', details);
    // 设置扩展图标和标题
    chrome.action.setTitle({
        title: '框选复制文本'
    });
});
// 扩展启动时的处理
chrome.runtime.onStartup.addListener(() => {
    console.log('浏览器框选复制插件已启动');
});
// 处理来自 content script 的消息
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    console.log('收到消息:', request);
    // 处理不同类型的消息
    switch (request.type) {
        case 'COPY_SUCCESS':
            // 复制成功的反馈
            console.log('文本复制成功');
            break;
        case 'COPY_ERROR':
            // 复制失败的处理
            console.error('文本复制失败:', request.error);
            break;
        case 'EXTENSION_ERROR':
            // 扩展错误的处理
            console.error('扩展运行错误:', request.error);
            break;
        default:
            console.log('未知消息类型:', request.type);
    }
    // 发送响应
    sendResponse({ success: true });
});
// 处理扩展图标点击事件（如果需要）
chrome.action.onClicked.addListener((tab) => {
    console.log('扩展图标被点击', tab);
    // 可以在这里添加额外的功能
    // 比如显示帮助信息或打开设置页面
});
//# sourceMappingURL=background.js.map