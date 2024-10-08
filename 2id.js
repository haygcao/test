// 插件 ID，每个插件必须唯一
const pluginId = 'baiduPhoneNumberPlugin';

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
async function loadLibraries() {
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js');
    console.log('Libraries loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading libraries:', error);
    return false;
  }
}

// 使用 DOMParser API 提取百度数据
function extractDataFromDOM(doc, phoneNumber) {
  const jsonObject = {
    count: 0,
    sourceLabel: "",
    province: "",
    city: "",
    carrier: "",
    phoneNumber: phoneNumber
  };

  const descElement = doc.querySelector('.mark-tip_3WkLJ span');
  if (descElement) {
    const descText = descElement.textContent.trim();
    if (descText.includes("存在风险")) {
      jsonObject.count = 1;
    }
  }

  const titleElement = doc.querySelector('.c-span22.c-span-last .cc-title_31ypU');
  if (titleElement) {
    jsonObject.sourceLabel = titleElement.textContent.trim().replace('用户标记', '');
  }

  const locationElement = doc.querySelector('.cc-row_dDm_G');
  if (locationElement) {
    const locationParts = locationElement.textContent.trim().split(' ');
    jsonObject.province = locationParts[0] || '';
    jsonObject.city = locationParts[1] || '';
  }

  console.log('Extracted information:', jsonObject);
  return jsonObject;
}

// 查询电话号码
async function queryPhoneNumber(phoneNumber) {
  console.log('Querying phone number:', phoneNumber);

  // 添加 pluginId 到消息中
  FlutterChannel.postMessage(JSON.stringify({
    pluginId: pluginId,
    method: 'GET',
    url: `https://www.baidu.com/s?wd=${phoneNumber}`,
    headers: {
      "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    },
  }));

  return new Promise((resolve, reject) => {
    window.addEventListener('message', (event) => {
      // 检查消息来源和类型
      if (event.source !== window && event.data.type === `xhrResponse_${pluginId}`) { 
        const response = event.data.response;
        if (response.status >= 200 && response.status < 300) {
          // 使用 DOMParser 解析 HTML
          const parser = new DOMParser();
          const doc = parser.parseFromString(response.responseText, 'text/html');

          // 使用 JavaScript 代码提取数据
          const jsonObject = extractDataFromDOM(doc, phoneNumber);
          resolve(jsonObject);
        } else {
          reject(new Error(`HTTP error! status: ${response.status}`));
        }
      }
    });
  });
}

// 插件对象
const plugin = {
  platform: "百度号码查询插件",
  version: "1.9.9",
  queryPhoneNumber,
  test: function () {
    console.log('Plugin test function called');
    return 'Plugin is working';
  }
};

// 初始化插件
async function initializePlugin() {
  const librariesLoaded = await loadLibraries();
  if (librariesLoaded) {
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
    console.error('Failed to load libraries. Plugin not initialized.');
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
  if (window.plugin && typeof window.plugin.queryPhoneNumber === 'function') {
    console.log('Plugin is properly loaded and queryPhoneNumber is available');
    return true;
  } else {
    console.log(
        'Plugin is not properly loaded or queryPhoneNumber is not available');
    return false;
  }
};

// 初始化插件
initializePlugin();
