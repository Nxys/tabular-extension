// 弹出窗口脚本

// 弹出窗口初始化函数
function initializePopup(): void {
  console.log('框选复制插件弹出窗口已加载');
  
  // 可以在这里添加弹出窗口的交互逻辑
  // 比如显示使用统计、设置选项等
  
  // 获取当前标签页信息
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
    const currentTab = tabs[0];
    console.log('当前标签页:', currentTab.url);
  });
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', initializePopup);