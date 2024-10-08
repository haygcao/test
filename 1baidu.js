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
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/cheerio/1.0.0/dist/browser/cheerio.min.js');
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
    // 创建一个新的 XMLHttpRequest 对象
    const xhr = new XMLHttpRequest();

    // 使用 Promise 包装 XMLHttpRequest 的操作
    return new Promise((resolve, reject) => {
      // 设置 onreadystatechange 回调函数
      xhr.onreadystatechange = function () {
        if (this.readyState === 4) { // 请求完成
          if (this.status >= 200 && this.status < 300) { // 请求成功
            console.log('Baidu response status:', this.status);
            const html = this.responseText;
            console.log('HTML content length:', html.length);
            const $ = cheerio.load(html);
            resolve(extractBaiduData($, phoneNumber));
          } else { // 请求失败
            reject(new Error(`HTTP error! status: ${this.status}`));
          }
        }
      };

      // 使用 fetch API 发送请求，绕过 CORS 限制
      fetch(`https://www.baidu.com/s?wd=${phoneNumber}`)
        .then(response => response.text())
        .then(text => {
          // 将 fetch API 的响应结果设置到 XMLHttpRequest 对象上
          Object.defineProperty(xhr, 'responseText', { value: text });
          Object.defineProperty(xhr, 'response', { value: text });
          Object.defineProperty(xhr, 'status', { value: 200 });
          xhr.readyState = 4; // 设置 readyState 为 4，表示请求完成
          xhr.onreadystatechange(); // 触发 onreadystatechange 回调函数
        })
        .catch(error => reject(error));
    });
  } catch (error) {
    console.error('Error in queryPhoneNumber:', error);
    throw error;
  }
}

// 插件对象
const plugin = {
  platform: "百度号码查询插件",
  version: "1.8.0",
  queryPhoneNumber,
  test: function() {
    console.log('Plugin test function called');
    return 'Plugin is working';
  }
};

// XMLHttpRequest 代理实现 (关键部分)
function proxyAjax(XHR) {
  if (!XHR) {
    return;
  }
  const _open = XHR.prototype.open;
  const _send = XHR.prototype.send;

  // 代理 open() 方法
  XHR.prototype.open = function (...args) {
    // 保存方法和 URL
    this._method = args[0];
    this._url = args[1];

    // 调用原始的 open() 方法
    return _open.apply(this, args);
  };

  // 代理 send() 方法
  XHR.prototype.send = function (...args) {
    const self = this; // 保存 this 指针

    // 使用 fetch API 发送请求
    fetch(this._url, {
      method: this._method,
      headers: this.headers, // 使用 XMLHttpRequest 对象上的 headers
      body: args[0] // 如果有请求体
    })
    .then(response => {
      return response.text().then(text => {
        // 将 fetch 的响应结果设置到 XMLHttpRequest 对象上
        Object.defineProperty(self, 'responseText', { value: text });
        Object.defineProperty(self, 'response', { value: text });
        Object.defineProperty(self, 'status', { value: response.status });
        Object.defineProperty(self, 'statusText', { value: response.statusText });

        // 模拟 readyState 变化
        self.readyState = 2; // HEADERS_RECEIVED
        self.onreadystatechange();
        self.readyState = 3; // LOADING
        self.onreadystatechange();
        self.readyState = 4; // DONE
        self.onreadystatechange();
      });
    })
    .catch(error => {
      // 处理错误
      console.error('Error in proxyAjax:', error);
      // 可以根据需要设置 XMLHttpRequest 的状态和错误信息
      self.readyState = 4; // DONE
      self.status = 0; // 设置一个错误状态码
      self.onreadystatechange();
    });
  };
}

// 初始化插件，并启动 XMLHttpRequest 代理
async function initializePlugin() {
  const librariesLoaded = await loadLibraries();
  if (librariesLoaded) {
    window.plugin = plugin;
    console.log('Plugin object set to window.plugin');
    console.log('window.plugin:', window.plugin);

    // 启动 XMLHttpRequest 代理
    proxyAjax(global.originalXMLHttpRequest || global.XMLHttpRequest);

    if (typeof FlutterChannel !== 'undefined') {
      FlutterChannel.postMessage('Plugin loaded');
      console.log('Notified Flutter that plugin is loaded');
    } else {
      console.error('FlutterChannel is not defined');
    }
  } else {
    console.error('Failed to load libraries. Plugin not initialized.');
  }
}

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

// 初始化插件
initializePlugin(); 
