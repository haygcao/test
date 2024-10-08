// 使用 Promise 来加载脚本
function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// 加载 axios
async function loadAxios() {
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js');
    console.log('Axios loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading Axios:', error);
    return false;
  }
}

// 获取百度首页标题
async function getBaiduTitle() {
  console.log('Getting Baidu title...');

  FlutterChannel.postMessage(JSON.stringify({
    method: 'GET',
    url: 'https://www.baidu.com',
    headers: {
      "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    },
  }), window.location.origin);

  return new Promise((resolve, reject) => {
    window.addEventListener('message', (event) => {
      if (event.source === window && event.data.type === 'xhrResponse') {
        const response = event.data.response;
        if (response.status >= 200 && response.status < 300) {
          // 提取标题 (简化版，仅获取 <title> 标签内容)
          const titleMatch = response.responseText.match(/<title>(.*?)<\/title>/);
          const title = titleMatch ? titleMatch[1] : 'Title not found';
          resolve(title);
        } else {
          reject(new Error(`HTTP error! status: ${response.status}`));
        }
      }
    });
  });
}

// 插件对象
const plugin = {
  platform: "百度标题获取插件",
  version: "1.0.0",
  getBaiduTitle,
  test: function () {
    console.log('Plugin test function called');
    return 'Plugin is working';
  }
};

// 初始化插件
async function initializePlugin() {
  const axiosLoaded = await loadAxios();
  if (axiosLoaded) {
    window.plugin = plugin;
    console.log('Plugin object set to window.plugin');
    console.log('window.plugin:', window.plugin);

    if (typeof FlutterChannel !== 'undefined') {
      FlutterChannel.postMessage('Plugin loaded');
      console.log('Notified Flutter that plugin is loaded');
      FlutterChannel.postMessage('PluginReady'); 
    } else {
      console.error('FlutterChannel is not defined');
    }
  } else {
    console.error('Failed to load Axios. Plugin not initialized.');
  }
}

// 为了调试，添加全局错误处理
window.onerror = function (message, source, lineno, colno, error) {
  console.error('Global error:', message, 'at', source, lineno, colno, error);
  if (typeof FlutterChannel !== 'undefined') {
    FlutterChannel.postMessage('JS Error: ' + message);
  }
};

// 添加全局函数来检查插件状态
window.checkPluginStatus = function () {
  console.log('Checking plugin status...');
  console.log('window.plugin:', window.plugin);
  if (window.plugin && typeof window.plugin.getBaiduTitle === 'function') {
    console.log('Plugin is properly loaded and getBaiduTitle is available');
    return true;
  } else {
    console.log(
        'Plugin is not properly loaded or getBaiduTitle is not available');
    return false;
  }
};

// 初始化插件
initializePlugin();
