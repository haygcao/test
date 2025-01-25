// 插件 ID,每个插件必须唯一
const pluginId = '360PhoneNumberPlugin';

// 插件信息
const pluginInfo = {
  // 插件信息
  info: {
    id: 'yourpluginid', // 插件ID,必须唯一
    name: '360', // 插件名称
    version: '1.0.0', // 插件版本
    description: 'This is a plugin template.', // 插件描述
    author: 'Your Name', // 插件作者
  },
};

// 预设标签列表
const predefinedLabels = [
    {'label': 'Fraud Scam Likely'},
    {'label': 'Spam Likely'},
    {'label': 'Telemarketing'},
    {'label': 'Robocall'},
    {'label': 'Delivery'},
    {'label': 'Takeaway'},
    {'label': 'Ridesharing'},
    {'label': 'Insurance'},
    {'label': 'Loan'},
    {'label': 'Customer Service'},
    {'label': 'Unknown'},
    {'label': 'Financial'},
    {'label': 'Bank'},
    {'label': 'Education'},
    {'label': 'Medical'},
    {'label': 'Charity'},
    {'label': 'Other'},
    {'label': 'Collection'},
    {'label': 'Survey'},
    {'label': 'Political'},
    {'label': 'Ecommerce'},
    {'label': 'Risk'},
];

// 手动映射表，将 source label 映射到预设标签
const manualMapping = {
    '标签1': 'Fraud Scam Likely', // 对应预设标签 "Fraud Scam Likely"
    '标签2': 'Spam Likely', // 对应预设标签 "Spam Likely"
    // ... 省略其他手动映射
    '标签22': 'Risk', // 对应预设标签 "Risk"
};

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

// 使用 DOMParser API 提取数据 (这里重要的就是count 和label，phone number，其他的都是为了测试使用的)
function extractData(html) {
  const jsonObject = {
    count: 0,
    sourceLabel: "",
    province: "",
    city: "",
    carrier: "",
  };

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    console.log('Document Object:', doc);

    const bodyElement = doc.body;
    console.log('Body Element:', bodyElement);
    if (!bodyElement) {
      console.error('Error: Could not find body element.');
      return jsonObject;
    }

    const descElement = doc.querySelector('.mh-tel-desc');
    console.log('descElement:', descElement);
    if (descElement) {
      const descText = descElement.textContent.trim();
      console.log('descText:', descText);

      const match = descText.match(/(\d+)位/);
      console.log('count match:', match);
      if (match) {
        jsonObject.count = parseInt(match[1], 10);
      }
      console.log('jsonObject.count:', jsonObject.count);

      let sourceLabelText = descText
        .replace(match ? match[0] : '', '')
        .replace(/此号码近期被|360手机卫士|用户标记，疑似为|！/g, '')
        .replace(/，/g, '')
        .trim();
      jsonObject.sourceLabel = sourceLabelText;
      console.log('jsonObject.sourceLabel:', jsonObject.sourceLabel);
    }

    const locationElement = doc.querySelector('.mh-tel-adr p');
    console.log('locationElement:', locationElement);
    if (locationElement) {
      const locationParts = locationElement.textContent.trim().split(/\s+/);
      jsonObject.province = locationParts[0] || '';
      jsonObject.city = locationParts[1] || '';
      jsonObject.carrier = locationParts[2] || '';
      console.log('jsonObject.province:', jsonObject.province);
      console.log('jsonObject.city:', jsonObject.city);
      console.log('jsonObject.carrier:', jsonObject.carrier);
    }
  } catch (error) {
    console.error('Error extracting data:', error);
  }
  console.log('Final jsonObject:', jsonObject);

  return jsonObject;
}

// 查询电话号码信息 (版本 A 的 queryPhoneNumber 函数)
// 查询电话号码信息, 你可以根据需要修改
function queryPhoneInfo(phoneNumber,requestId) {
    FlutterChannel.postMessage(JSON.stringify({
        pluginId: pluginId,
        method: 'GET',
        requestId:requestId, //将requestID 放到请求体里面
        url: `https://www.so.com/s?q=${phoneNumber}`,
        headers: {
            "User-Agent": 'Mozilla/5.0 (Linux; arm_64; Android 14; SM-S711B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.199 YaBrowser/24.12.4.199.00 SA/3 Mobile Safari/537.36',
        },
    }));
}

// 生成输出信息, 你可以根据需要修改
async function generateOutput(phoneNumber, nationalNumber, e164Number) {
  // 这里的三个号码必须完整保留
  // 存储查询结果
    const queryResults = [];

    // 为每个号码生成唯一的 requestId
    const phoneRequestId =  Math.random().toString(36).substring(2);
    const nationalRequestId = Math.random().toString(36).substring(2);
    const e164RequestId = Math.random().toString(36).substring(2);

// 但是这里 phoneNumber,nationalNumber,e164Number你可以删除任何一个,但是至少保留一个,选择最符合你的地区的号码格式即可
    if (phoneNumber) {
        queryPhoneInfo(phoneNumber,phoneRequestId); // 调用 queryPhoneInfo 发起查询
        queryResults.push(new Promise((resolve) => {
            pendingPromises.set(phoneRequestId, resolve); // 将 resolve 函数存储到 pendingPromises 中
        }));
    }

    if (nationalNumber) {
        queryPhoneInfo(nationalNumber,nationalRequestId);
        queryResults.push(new Promise((resolve) => {
            pendingPromises.set(nationalRequestId, resolve);
        }));
    }

    if (e164Number) {
        queryPhoneInfo(e164Number,e164RequestId);
        queryResults.push(new Promise((resolve) => {
            pendingPromises.set(e164RequestId, resolve);
        }));
    }

      // 等待所有查询完成
    try {
    const results = await Promise.all(queryResults);
    console.log('All queries completed:', results);

    const [phoneInfo, nationalInfo, e164Info] = results;

  // 合并查询结果,优先使用非空值
    const info = {
      count: phoneInfo?.count || nationalInfo?.count || e164Info?.count || 0,
      sourceLabel: phoneInfo?.sourceLabel || nationalInfo?.sourceLabel || e164Info?.sourceLabel || "",
      sourceName: pluginInfo?.info?.name || "", // 使用 pluginInfo 中的名称
    };

        let matchedLabel = predefinedLabels.find(label => label.label === info.sourceLabel)?.label || manualMapping[info.sourceLabel] || 'Unknown';

    return {
      phoneNumber: phoneNumber || nationalNumber || e164Number, // 返回第一个非空的号码
      sourceLabel: info.sourceLabel,
        count: info.count,
        predefinedLabel: matchedLabel || '',
      source:  pluginInfo?.info?.name || "", // 使用 pluginInfo 中的名称
    };
  } catch (error) {
    console.error('Error in generateOutput:', error); // 返回错误信息给 Flutter
    return {
        error: error.message || 'Unknown error occurred during phone number lookup.',
    };
  }
}

// 使用 Map 对象来存储 pending 的 Promise
const pendingPromises = new Map();

// 在全局作用域中注册事件监听器
window.addEventListener('message', (event) => {
    console.log('Received message in event listener:', event.data);

    if (event.data.type === `xhrResponse_${pluginId}`) {
        const detail = event.data.detail;
        const response = detail.response;
        const requestId = detail.requestId;

        console.log('requestId from detail:', requestId);
        // 打印 event.data.detail.response 对象
        console.log('event.data.detail.response:', response);
      
        if (response.status >= 200 && response.status < 300) {
            // 打印 response.responseText 的长度
            console.log('response.responseText length:', response.responseText.length);
            console.log('response.responseText:', response.responseText); // 打印完整的 HTML
          
          // 直接解析 HTML
            const extractedData = extractData(response.responseText);
            console.log('Extracted information:', extractedData);

            // 将数据传递回 Flutter
            FlutterChannel.postMessage(JSON.stringify({
                type: 'pluginResult',
                pluginId: pluginId,
                data: extractedData,
                requestId: requestId
            }));

            // resolve 对应的 Promise
            const resolveFn = pendingPromises.get(requestId);
            if (resolveFn) {
                resolveFn(extractedData);
                pendingPromises.delete(requestId);
                console.log('Resolved promise for requestId:', requestId);
            } else {
                console.error('Resolve function not found for requestId:', requestId);
            }
        } else {
            console.error(`HTTP error! status: ${response.status}`);

            FlutterChannel.postMessage(JSON.stringify({
                type: 'pluginError',
                pluginId: pluginId,
                error: `HTTP error! status: ${response.status}`,
                requestId:requestId
            }));

            const rejectFn = pendingPromises.get(requestId);
            if (rejectFn) {
                rejectFn(new Error(`HTTP error! status: ${response.status}`));
                pendingPromises.delete(requestId);
                console.error('Rejected promise for requestId:', requestId);
            } else {
                console.error('Reject function not found for requestId:', requestId);
            }
        }
    }
});

// 初始化插件
async function initializePlugin() {
  const librariesLoaded = await loadLibraries();
  if (librariesLoaded) {
    window.plugin = {};
    const thisPlugin = {
      id: pluginInfo.info.id,
      pluginId: pluginId,
      version: pluginInfo.info.version,
      queryPhoneInfo: queryPhoneInfo,
      generateOutput: generateOutput,
      manualMapping: manualMapping,
      test: function () {
        console.log('Plugin test function called');
        return 'Plugin is working';
      }
    };

    window.plugin[pluginId] = thisPlugin;

    // ... (通知 Flutter 插件已加载的代码不变)
     // 通知 Flutter 插件已加载并准备好
    if (typeof TestPageChannel !== 'undefined') {
      TestPageChannel.postMessage(JSON.stringify({
        type: 'pluginLoaded',
        pluginId: pluginId,
      }));
      console.log('Notified Flutter that plugin is loaded');
      TestPageChannel.postMessage(JSON.stringify({
        type: 'pluginReady',
        pluginId: pluginId,
      }));
      console.log('Notified Flutter that plugin is ready');
    } else {
      console.error('TestPageChannel is not defined');
    }
  } else {
    console.error('Failed to load libraries. Plugin not initialized.');
  }
}

// 为了调试,添加全局错误处理
window.onerror = function (message, source, lineno, colno, error) {
  console.error('Global error:', message, 'at', source, lineno, colno, error);
  if (typeof FlutterChannel !== 'undefined') {
    FlutterChannel.postMessage('JS Error: ' + message);
  }
};

// 添加全局函数来检查插件状态
window.checkPluginStatus = function (pluginId) {
  console.log('Checking plugin status for plugin:', pluginId);
  console.log('window.plugin:', window.plugin);
  // 检查对应的插件对象是否存在
  if (window.plugin[pluginId] && typeof window.plugin[pluginId].queryPhoneInfo === 'function') {
    console.log('Plugin', pluginId, 'is properly loaded and queryPhoneInfo is available');
    return true;
  } else {
    console.log('Plugin', pluginId, 'is not properly loaded or queryPhoneInfo is not available');
    return false;
  }
};

// 初始化插件
initializePlugin();
