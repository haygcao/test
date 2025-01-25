// 插件 ID,每个插件必须唯一
const pluginId = '360PhoneNumberPlugin';

// 使用 Map 对象来存储 pending 的 Promise
const pendingPromises = new Map();

// 查询电话号码信息
function queryPhoneInfo(phoneNumber, requestId) {
  console.log('queryPhoneInfo called with phoneNumber:', phoneNumber, 'and requestId:', requestId);
  FlutterChannel.postMessage(JSON.stringify({
    pluginId: pluginId,
    method: 'GET',
    requestId: requestId,
    url: `https://www.so.com/s?q=${phoneNumber}`,
    headers: {
      "User-Agent": 'Mozilla/5.0 (Linux; arm_64; Android 14; SM-S711B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.199 YaBrowser/24.12.4.199.00 SA/3 Mobile Safari/537.36',
    },
  }));
}

// 生成输出信息
async function generateOutput(phoneNumber, nationalNumber, e164Number) {
  console.log('generateOutput called with:', phoneNumber, nationalNumber, e164Number);
  const queryResults = [];

  if (phoneNumber) {
    const phoneRequestId = Math.random().toString(36).substring(2);
    queryPhoneInfo(phoneNumber, phoneRequestId);
    queryResults.push(new Promise((resolve) => {
      pendingPromises.set(phoneRequestId, resolve);
    }));
  }

  // 可以添加对 nationalNumber 和 e164Number 的处理

  try {
    const results = await Promise.all(queryResults);
    console.log('All queries completed:', results);

    // 这里简化处理，只返回第一个结果
    const phoneInfo = results[0] || {};

    return {
      phoneNumber: phoneNumber,
      sourceLabel: phoneInfo.sourceLabel || "",
      count: phoneInfo.count || 0,
      predefinedLabel: phoneInfo.predefinedLabel || "",
      source: "360" // 临时使用固定值
    };
  } catch (error) {
    console.error('Error in generateOutput:', error);
    return {
      error: error.message || 'Unknown error occurred during phone number lookup.',
    };
  }
}

// 在全局作用域中注册事件监听器
window.addEventListener('message', (event) => {
  console.log('Received message in event listener:', event.data);
  console.log('Received message event.data.type:', event.data.type);

  if (event.data.type === `xhrResponse_${pluginId}`) {
    const detail = event.data.detail;
    const response = detail.response;
    const requestId = detail.requestId;

    console.log('requestId from detail:', requestId);
    console.log('event.data.detail.response:', response);

    if (response.status >= 200 && response.status < 300) {
      console.log('response.responseText length:', response.responseText.length);
      console.log('response.responseText:', response.responseText);

      // 将数据传递回 Flutter (简化, 只传递长度)
      FlutterChannel.postMessage(JSON.stringify({
        type: 'pluginResult',
        pluginId: pluginId,
        data: {
          responseTextLength: response.responseText.length
        },
        requestId: requestId
      }));

      // resolve 对应的 Promise (简化, 不做实际解析)
      const resolveFn = pendingPromises.get(requestId);
      if (resolveFn) {
        resolveFn({});
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
    }
  } else {
    console.log('Received unknown message type:', event.data.type);
  }
});

// 初始化插件
function initializePlugin() {
  console.log("initializePlugin called");
  window.plugin = {};
  const thisPlugin = {
    pluginId: pluginId,
    queryPhoneInfo: queryPhoneInfo,
    generateOutput: generateOutput
  };

  window.plugin[pluginId] = thisPlugin;

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
}

// 初始化插件
initializePlugin();
