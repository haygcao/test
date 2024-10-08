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

// 加载 axios 和 cheerio
async function loadLibraries() {
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js');
    await loadScript(
        'https://cdnjs.cloudflare.com/ajax/libs/cheerio/1.0.0/dist/browser/cheerio.min.js'); 
    await loadScript('https://cdn.jsdelivr.net/npm/cheerio@1.0.0/dist/browser/api/attributes.js'); 
    await loadScript('https://cdn.jsdelivr.net/npm/cheerio@1.0.0/dist/browser/api/traversing.js'); 
    await loadScript('https://cdn.jsdelivr.net/npm/cheerio@1.0.0/dist/browser/api/manipulation.js'); 
    await loadScript('https://cdn.jsdelivr.net/npm/cheerio@1.0.0/dist/browser/api/css.js'); 
    await loadScript('https://cdn.jsdelivr.net/npm/cheerio@1.0.0/dist/browser/api/forms.js'); 
    await loadScript('https://cdn.jsdelivr.net/npm/cheerio@1.0.0/dist/browser/api/extract.js'); 
  
   
   
    console.log('Libraries loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading libraries:', error);
    return false;
  }
}

// 提取百度数据
function extractBaiduData($, phoneNumber) {
  console.log('Extracting data for phone number:', phoneNumber);
  const jsonObject = {
    count: 0,
    sourceLabel: "",
    province: "",
    city: "",
    carrier: "",
    phoneNumber: phoneNumber
  };

  try {
    const descElement = $('.op_fraudphone_word');
    const titleElement = $('.c-span22.c-span-last .cc-title_31ypU');
    const locationElement = $('.c-span22.c-span-last .cc-row_dDm_G');

    console.log('Description element found:', descElement.length > 0);
    console.log('Title element found:', titleElement.length > 0);
    console.log('Location element found:', locationElement.length > 0);

    if (descElement.length) {
      const descText = descElement.text().trim();
      console.log('Description text:', descText);
      const countMatch = descText.match(/被(\d+)个/);
      if (countMatch) {
        jsonObject.count = parseInt(countMatch[1], 10);
      }
    }

    jsonObject.sourceLabel =
        titleElement.length ? titleElement.text().trim() : '';

    if (locationElement.length) {
      const locationParts = locationElement.text().trim().split(' ');
      jsonObject.province = locationParts[0] || '';
      jsonObject.city = locationParts[1] || '';
    }

    console.log('Extracted information:', jsonObject);
    return jsonObject;
  } catch (e) {
    console.error('Error extracting Baidu data:', e);
    throw e;
  }
}

// 查询电话号码
async function queryPhoneNumber(phoneNumber) {
  console.log('Querying phone number:', phoneNumber);

  // 等待 Flutter 准备好接收 XMLHttpRequest 请求信息
  await FlutterChannel.postMessage('readyForXhr'); // 发送一个准备信号给 Flutter

  // 将 XMLHttpRequest 请求的信息传递给 Flutter
  FlutterChannel.postMessage(JSON.stringify({
    method: 'GET',
    url: `https://www.baidu.com/s?wd=${phoneNumber}`,
    headers: {
      // ... 添加需要的 headers，例如:
      "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      // ... 其他需要的 headers
    },
    // 如果有请求体，添加 body 属性，例如:
    // body: JSON.stringify({ /* 你的请求体数据 */ })
  }));

  // 等待 Flutter 的响应
  return new Promise((resolve, reject) => {
    window.addEventListener('message', (event) => {
      if (event.source === window && event.data.type === 'xhrResponse') {
        const response = event.data.response;
        // 处理响应
        if (response.status >= 200 && response.status < 300) {
          const $ = cheerio.load(response.responseText);
          resolve(extractBaiduData($, phoneNumber));
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
  version: "1.8.9",
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
          // 发送 "PluginReady" 消息给 Flutter，表示插件已经初始化完成
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
