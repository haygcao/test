// 检查是否已经加载了 axios 和 cheerio
if (typeof axios === 'undefined') {
  const axiosScript = document.createElement('script');
  axiosScript.src = 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js';
  document.head.appendChild(axiosScript);
}

if (typeof cheerio === 'undefined') {
  const cheerioScript = document.createElement('script');
  cheerioScript.src = 'https://cdn.jsdelivr.net/npm/cheerio/cheerio.min.js';
  document.head.appendChild(cheerioScript);
}

// 等待库加载完成
function waitForLibraries() {
  return new Promise((resolve) => {
    const checkLibraries = () => {
      console.log('Checking for libraries...');
      if (typeof axios !== 'undefined' && typeof cheerio !== 'undefined') {
        console.log('Libraries loaded successfully');
        resolve();
      } else {
        console.log('Libraries not loaded yet, retrying...');
        setTimeout(checkLibraries, 100);
      }
    };
    checkLibraries();
  });
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

    jsonObject.sourceLabel = titleElement.length ? titleElement.text().trim() : '';
    
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
  try {
    const response = await axios.get(`https://www.baidu.com/s?wd=${phoneNumber}`);
    
    console.log('Baidu response status:', response.status);
    if (response.status === 200) {
      const html = response.data;
      console.log('HTML content length:', html.length);
      const $ = cheerio.load(html);
      return extractBaiduData($, phoneNumber);
    } else {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error in queryPhoneNumber:', error);
    throw error;
  }
}

// 插件对象
const plugin = {
  platform: "百度号码查询插件",
  version: "1.3.0",
  queryPhoneNumber,
  test: function() {
    console.log('Plugin test function called');
    return 'Plugin is working';
  }
};

// 等待库加载完成后设置全局插件对象
waitForLibraries().then(() => {
  window.plugin = plugin;
  console.log('Plugin object set to window.plugin');
  console.log('window.plugin:', window.plugin);
  
  // 通知 Flutter 应用插件已加载
  if (typeof FlutterChannel !== 'undefined') {
    FlutterChannel.postMessage('Plugin loaded');
    console.log('Notified Flutter that plugin is loaded');
  } else {
    console.error('FlutterChannel is not defined');
  }
});

// 为了调试，添加全局错误处理
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', message, 'at', source, lineno, colno, error);
  if (typeof FlutterChannel !== 'undefined') {
    FlutterChannel.postMessage('JS Error: ' + message);
  }
};

// 添加全局函数来检查插件状态
window.checkPluginStatus = function() {
  console.log('Checking plugin status...');
  console.log('window.plugin:', window.plugin);
  if (window.plugin && typeof window.plugin.queryPhoneNumber === 'function') {
    console.log('Plugin is properly loaded and queryPhoneNumber is available');
    return true;
  } else {
    console.log('Plugin is not properly loaded or queryPhoneNumber is not available');
    return false;
  }
};

// 立即执行函数来模拟异步加载
(async function() {
  await waitForLibraries();
  console.log('Libraries and plugin initialized');
})();
