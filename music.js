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
    FlutterChannel.postMessage('Axios loaded successfully', window.location.origin); // 发送日志到 Flutter
    return true;
  } catch (error) {
    console.error('Error loading Axios:', error);
    FlutterChannel.postMessage('Error loading Axios: ' + error, window.location.origin); // 发送错误信息到 Flutter
    return false;
  }
}

// 获取百度首页标题
async function getBaiduTitle() {
  console.log('Getting Baidu title...');
  FlutterChannel.postMessage('Getting Baidu title...', window.location.origin); // 发送日志到 Flutter

  // 发送请求信息给 Flutter
  FlutterChannel.postMessage(JSON.stringify({
    method: 'GET',
    url: 'https://www.baidu.com',
    headers: {
      "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    },
  }), window.location.origin);

  // 监听来自 Flutter 的响应
  return new Promise((resolve, reject) => {
    window.addEventListener('message', (event) => {
      if (event.source === window && event.data.type === 'xhrResponse') {
        const response = event.data.response;
        if (response.status >= 200 && response.status < 300) {
          // 提取标题
          const titleMatch = response.responseText.match(/<title>(.*?)<\/title>/);
          const title = titleMatch ? titleMatch[1] : 'Title not found';
          console.log('Baidu title:', title);
          FlutterChannel.postMessage('Baidu title: ' + title, window.location.origin); // 发送标题到 Flutter
          resolve(title);
        } else {
          console.error(`HTTP error! status: ${response.status}`);
          FlutterChannel.postMessage(`HTTP error! status: ${response.status}`, window.location.origin); // 发送错误信息到 Flutter
          reject(new Error(`HTTP error! status: ${response.status}`));
        }
      }
    });
  });
}

// 初始化插件
async function initializePlugin() {
  const axiosLoaded = await loadAxios();
  if (axiosLoaded) {
    // 在这里发送 PluginReady 消息
    if (typeof FlutterChannel !== 'undefined') {
      FlutterChannel.postMessage('PluginReady', window.location.origin);

      // 在发送 PluginReady 消息后立即调用 getBaiduTitle
      getBaiduTitle().then((title) => {
        // 标题处理逻辑已在 getBaiduTitle 函数中完成
      }).catch((error) => {
        // 错误处理逻辑已在 getBaiduTitle 函数中完成
      });
    } else {
      console.error('FlutterChannel is not defined');
    }
  } else {
    console.error('Failed to load Axios. Plugin not initialized.');
    FlutterChannel.postMessage('Failed to load Axios. Plugin not initialized.', window.location.origin); // 发送错误信息到 Flutter
  }
}

// 初始化插件
initializePlugin();
