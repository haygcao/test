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

// 生成输出信息, 你可以根据需要修改
async function generateOutput(phoneNumber, nationalNumber, e164Number) {
  console.log('generateOutput called with:', phoneNumber, nationalNumber, e164Number)
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

    //因为你这里并没有返回这些数据， 我log 也打印不出来，所以我暂时注释掉
    //    let matchedLabel = predefinedLabels.find(label => label.label === info.sourceLabel)?.label || manualMapping[info.sourceLabel] || 'Unknown';

    return {
      phoneNumber: phoneNumber || nationalNumber || e164Number, // 返回第一个非空的号码
      sourceLabel: info.sourceLabel,
        count: info.count,
        // predefinedLabel: matchedLabel || '',
      source:  pluginInfo?.info?.name || "", // 使用 pluginInfo 中的名称
    };
  } catch (error) {
    console.error('Error in generateOutput:', error); // 返回错误信息给 Flutter
    return {
        error: error.message || 'Unknown error occurred during phone number lookup.',
    };
  }
}

// 在全局作用域中注册事件监听器
window.addEventListener('message', (event) => {
  console.log('Received message in event listener:', event.data);
  console.log('Received message event.data.type:', event.data.type);

  // 确认接收到 xhrResponse_ 开头的事件
  if (event.data && event.data.type && event.data.type.startsWith('xhrResponse_')) {
        console.log("Received xhrResponse event");
        const detail = event.data.detail;
        console.log('detail:', detail);
        const response = detail ? detail.response : null;
        console.log('response:', response);
        const requestId = detail ? detail.requestId : null;
        console.log('requestId:', requestId);

        if (response) {
            console.log('response.responseText length:', response.responseText.length);
            console.log('response.responseText:', response.responseText);
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
    id: pluginInfo.info.id,
    pluginId: pluginId,
    version: pluginInfo.info.version,
    queryPhoneInfo: queryPhoneInfo,
    generateOutput: generateOutput,
    test: function () {
      console.log('Plugin test function called');
      return 'Plugin is working';
    }
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
