"use strict";
// Jest 测试环境设置文件
// 模拟 Chrome 扩展 API
const mockChrome = {
    runtime: {
        onInstalled: {
            addListener: jest.fn()
        },
        onStartup: {
            addListener: jest.fn()
        },
        onMessage: {
            addListener: jest.fn()
        },
        sendMessage: jest.fn()
    },
    action: {
        onClicked: {
            addListener: jest.fn()
        },
        setTitle: jest.fn()
    },
    tabs: {
        onUpdated: {
            addListener: jest.fn()
        },
        sendMessage: jest.fn()
    }
};
// 将 chrome API 添加到全局对象
global.chrome = mockChrome;
// 模拟 navigator.clipboard API
Object.defineProperty(navigator, 'clipboard', {
    value: {
        writeText: jest.fn().mockResolvedValue(undefined)
    },
    writable: true
});
// 模拟 window.getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
    value: jest.fn().mockImplementation(() => ({
        display: 'block',
        visibility: 'visible',
        opacity: '1'
    })),
    writable: true
});
// 模拟 document.execCommand
Object.defineProperty(document, 'execCommand', {
    value: jest.fn().mockReturnValue(true),
    writable: true
});
// 模拟 Element.getClientRects
Element.prototype.getClientRects = jest.fn().mockImplementation(function () {
    return [{
            left: 0,
            top: 0,
            right: 100,
            bottom: 20,
            width: 100,
            height: 20
        }];
});
// 模拟 Element.getBoundingClientRect
Element.prototype.getBoundingClientRect = jest.fn().mockImplementation(function () {
    return {
        left: 0,
        top: 0,
        right: 100,
        bottom: 20,
        width: 100,
        height: 20,
        x: 0,
        y: 0
    };
});
// 设置默认的 scrollX 和 scrollY
Object.defineProperty(window, 'scrollX', {
    value: 0,
    writable: true
});
Object.defineProperty(window, 'scrollY', {
    value: 0,
    writable: true
});
// 清理函数，在每个测试后运行
afterEach(() => {
    // 清理 DOM
    document.body.innerHTML = '';
    // 重置所有 mock
    jest.clearAllMocks();
});
//# sourceMappingURL=setup.js.map