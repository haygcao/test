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

// 加载 axios 和 htmlparser2
async function loadLibraries() {
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/htmlparser2@9.1.0/lib/index.js');

    console.log('Libraries loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading libraries:', error);
    return false;
  }
}

// 提取百度数据
function extractBaiduData(html, phoneNumber) {
  console.log('Extracting data for phone number:', phoneNumber);
  const jsonObject = {
    count: 0,
    sourceLabel: "",
    province: "",
    city: "",
    carrier: "",
    phoneNumber: phoneNumber
  };

  const { Parser } = window.htmlparser2; 

  let currentTag = "";
  let currentText = "";
  let insideFraudphoneWord = false; 
  let insideCSpan22 = false;

  const parser = new Parser({
    onopentag(name, attributes) {
      currentTag = name;
      if (name === 'div' && attributes.class === 'op_fraudphone_word') {
        insideFraudphoneWord = true;
      } else if (name === 'span' && attributes.class === 'c-span22 c-span-last') {
        insideCSpan22 = true;
      }
    },
    ontext(text) {
      currentText = text.trim();
      if (insideFraudphoneWord && currentText !== "") {
        const countMatch = currentText.match(/被(\d+)个/);
        if (countMatch) {
          jsonObject.count = parseInt(countMatch[1], 10);
        }
      } else if (insideCSpan22 && currentText !== "") {
        if (currentText.includes("号码")) {
          jsonObject.sourceLabel = currentText;
        } else if (currentText.includes("省") || currentText.includes("市")) {
          const locationParts = currentText.split(' ');
          jsonObject.province = locationParts[0] || '';
          jsonObject.city = locationParts[1] || '';
        }
      }
    },
    onclosetag(name) {
      if (name === 'div' && insideFraudphoneWord) {
        insideFraudphoneWord = false;
      } else if (name === 'span' && insideCSpan22) {
        insideCSpan22 = false;
      }
      currentTag = "";
      currentText = "";
    }
  }, { decodeEntities: true });

  parser.write(html);
  parser.end();

  console.log('Extracted information:', jsonObject);
  return jsonObject;
}


// 查询电话号码
async function queryPhoneNumber(phoneNumber) {
  console.log('Querying phone number:', phoneNumber);

  FlutterChannel.postMessage(JSON.stringify({
    method: 'GET',
    url: `https://www.baidu.com/s?wd=${phoneNumber}`,
    headers: {
      "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    },
  }));

  return new Promise((resolve, reject) => {
    window.addEventListener('message', (event) => {
      if (event.source === window && event.data.type === 'xhrResponse') {
        const response = event.data.response;
        if (response.status >= 200 && response.status < 300) {
          resolve(extractBaiduData(response.responseText, phoneNumber));
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
