// 插件 ID,每个插件必须唯一
const pluginId = 'baiduPhoneNumberPlugin';

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
      "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
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

    return {
      phoneNumber: phoneNumber || nationalNumber || e164Number, // 返回第一个非空的号码
      sourceLabel: info.sourceLabel,
      count: info.count,
      source:  pluginInfo?.info?.name || "", // 使用 pluginInfo 中的名称
    };
  } catch (error) {
    console.error('Error in generateOutput:', error); // 返回错误信息给 Flutter
    return {
        error: error.message || 'Unknown error occurred during phone number lookup.',
    };
  }
}

// 使用 DOMParser API 提取数据
function extractDataFromDOM(doc) {
    const jsonObject = {
        count: 0,
        sourceLabel: "",
        province: "",
        city: "",
        carrier: "",
    };

    console.log('Document Object:', doc);

    const bodyElement = doc.body;
    console.log('Body Element:', bodyElement);
    if (!bodyElement) {
        console.error('Error: Could not find body element.');
        return jsonObject;
    }

    // 提取标记次数
    const countElement = doc.querySelector('.mohe-tips-zp b');
    console.log('countElement:', countElement);
    if (countElement) {
        const countText = countElement.textContent.trim();
        console.log('countText:', countText);
        jsonObject.count = parseInt(countText, 10) || 0;
    }

    // 提取标记标签
    const sourceLabelElement = doc.querySelector('.mohe-tips-zp');
    console.log('sourceLabelElement:', sourceLabelElement);
    if (sourceLabelElement) {
        let sourceLabelText = sourceLabelElement.textContent.trim();
        // 清理标签文本
        sourceLabelText = sourceLabelText.replace(/此号码近期被|\d+位|360手机卫士|用户标记，疑似为|！/g, '').replace(/，/g, '').trim();
        jsonObject.sourceLabel = sourceLabelText;
        console.log('jsonObject.sourceLabel:', jsonObject.sourceLabel);
    }

    // 提取省份、城市和运营商
    const locationCarrierElement = doc.querySelector('.cr-title1_1_Ro-');
    console.log('locationCarrierElement:', locationCarrierElement);
    if (locationCarrierElement) {
        const locationCarrierText = locationCarrierElement.textContent.trim();
        console.log('locationCarrierText:', locationCarrierText);

        // 使用正则表达式匹配省份、城市和运营商
        const match = locationCarrierText.match(/(.*?) (.*?) (.*)/);
        if (match) {
            jsonObject.province = match[1];
            jsonObject.city = match[2];
            jsonObject.carrier = match[3];
            console.log('jsonObject.province:', jsonObject.province);
            console.log('jsonObject.city:', jsonObject.city);
            console.log('jsonObject.carrier:', jsonObject.carrier);
        }
    }
    console.log('Final jsonObject:', jsonObject);
    return jsonObject;
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

      // 解析 HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.responseText, 'text/html');

      // 使用 JavaScript 代码提取数据
      const jsonObject = extractDataFromDOM(doc);
      console.log('Extracted information:', jsonObject);

      // 将数据传递回 Flutter
      FlutterChannel.postMessage(JSON.stringify({
        type: 'pluginResult',
        pluginId: pluginId,
        data: jsonObject,
        requestId: requestId
      }));

      // resolve 对应的 Promise
      const resolveFn = pendingPromises.get(requestId);
      if (resolveFn) {
        resolveFn(jsonObject);
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
        requestId: requestId
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
  } else {
    console.log('Received unknown message type:', event.data.type);
  }
});

// 初始化插件
async function initializePlugin() {
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
