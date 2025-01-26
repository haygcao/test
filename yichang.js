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
      "User-Agent": 'Mozilla/5.0 (Linux; Android 12; TAS-AN00 Build/HUAWEITAS-AN00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.141 Mobile Safari/537.36 XWEB/5061 MMWEBSDK/20230405 MMWEBID/3471 MicroMessenger/8.0.35.2360(0x28002353) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64',
    },
  }));
}


// 使用 DOMParser API 提取数据 (这里重要的就是count 和label，phone number，其他的都是为了测试使用的)
function extractDataFromDOM(doc, phoneNumber) {
  const jsonObject = {
    count: 0,
    sourceLabel: "",
    province: "",
    city: "",
    carrier: "",
    phoneNumber: phoneNumber
  };

  try {
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
      console.log('jsonObject.count:', jsonObject.count);
    }

    // 提取标记标签
    const sourceLabelElement = doc.querySelector('.mohe-tips-zp');
    console.log('sourceLabelElement:', sourceLabelElement);
    if (sourceLabelElement) {
      let sourceLabelText = sourceLabelElement.textContent.trim();
      sourceLabelText = sourceLabelText.replace(/此号码近期被|\d+位|360手机卫士|用户标记，疑似为|！/g, '').replace(/，/g, '').trim();
      jsonObject.sourceLabel = sourceLabelText;
      console.log('jsonObject.sourceLabel:', jsonObject.sourceLabel);
    }

    // 提取号码、省份、城市、运营商
    const detailElement = doc.querySelector('.mh-detail');
    console.log('detailElement:', detailElement);
    if (detailElement) {
      const spans = detailElement.querySelectorAll('span');
      console.log('spans:', spans);
      if (spans.length >= 2) {
        jsonObject.phoneNumber = spans[0].textContent.trim();
        // 使用正则表达式匹配归属地和运营商
        const locationCarrierText = spans[1].textContent.trim();
        // 匹配中文字符，以及可能存在的  
        const match = locationCarrierText.match(/([\u4e00-\u9fa5]+)[\s ]*([\u4e00-\u9fa5]+)?[\s ]*([\u4e00-\u9fa5]+)?/);
        if (match) {
          jsonObject.province = match[1] || '';
          jsonObject.city = match[2] || '';
          jsonObject.carrier = match[3] || '';
        }
        console.log('jsonObject.phoneNumber:', jsonObject.phoneNumber);
        console.log('jsonObject.province:', jsonObject.province);
        console.log('jsonObject.city:', jsonObject.city);
        console.log('jsonObject.carrier:', jsonObject.carrier);
      }
    }
  } catch (error) {
    console.error('Error extracting data:', error);
  }

  console.log('Final jsonObject:', jsonObject);
  return jsonObject;
}




// 生成输出信息
async function generateOutput(phoneNumber, nationalNumber, e164Number) {
  console.log('generateOutput called with:', phoneNumber, nationalNumber, e164Number);
  const queryResults = [];

  // 处理单个号码查询的函数
  async function handleNumberQuery(number, requestId) {
    queryPhoneInfo(number, requestId);
    return new Promise((resolve, reject) => {
      pendingPromises.set(requestId, resolve);

      // 设置超时
      const timeoutId = setTimeout(() => {
        if (pendingPromises.has(requestId)) {
          reject(new Error('Timeout waiting for response'));
          pendingPromises.delete(requestId);
          window.removeEventListener('message', messageListener);
        }
      }, 5000); // 5秒超时

      // 监听 message 事件
      function messageListener(event) {
        console.log('Received message in event listener:', event.data);
        console.log('Received message event.data.type:', event.data.type);

        if (event.data.type === `xhrResponse_${pluginId}`) {
          const detail = event.data.detail;
          const response = detail.response;
          const receivedRequestId = detail.requestId; // 使用 receivedRequestId 避免命名冲突

          console.log('requestId from detail:', receivedRequestId);
          console.log('event.data.detail.response:', response);

          // 检查 requestId 是否匹配
          if (receivedRequestId === requestId) {
            if (response.status >= 200 && response.status < 300) {
              console.log('response.responseText length:', response.responseText.length);
              console.log('response.responseText:', response.responseText);

              // 解析 HTML
              const parser = new DOMParser();
              const doc = parser.parseFromString(response.responseText, 'text/html');

              // 使用 JavaScript 代码提取数据
              const jsonObject = extractDataFromDOM(doc);
              console.log('Extracted information:', jsonObject);

              resolve(jsonObject); // 使用提取的数据 resolve Promise
              console.log('Resolved promise for requestId:', requestId);

              // 清理工作
              clearTimeout(timeoutId);
              pendingPromises.delete(requestId);
              // 移除事件监听器
              window.removeEventListener('message', messageListener);
            } else {
              console.error(`HTTP error! status: ${response.status}`);
              reject(new Error(`HTTP error! status: ${response.status}`));

              // 清理工作
              clearTimeout(timeoutId);
              pendingPromises.delete(requestId);
              // 移除事件监听器
              window.removeEventListener('message', messageListener);
            }
          } else {
            console.log('Received response for a different requestId:', receivedRequestId);
          }
        } else {
          console.log('Received unknown message type:', event.data.type);
        }
      }

      window.addEventListener('message', messageListener);
    });
  }

  // 对每个号码调用 handleNumberQuery 函数
  if (phoneNumber) {
    const phoneRequestId = Math.random().toString(36).substring(2);
    queryResults.push(handleNumberQuery(phoneNumber, phoneRequestId));
  }

  if (nationalNumber) {
    const nationalRequestId = Math.random().toString(36).substring(2);
    queryResults.push(handleNumberQuery(nationalNumber, nationalRequestId));
  }

  if (e164Number) {
    const e164RequestId = Math.random().toString(36).substring(2);
    queryResults.push(handleNumberQuery(e164Number, e164RequestId));
  }
  try {


       console.log('Returning result:', {
        //phoneNumber: result.phoneNumber,
      //  sourceLabel: result.sourceLabel,
      //  count: result.count,
      //  province: result.province,
     //   city: result.city,
     //   carrier: result.carrier,
    //    predefinedLabel: matchedLabel,
    //    source: pluginInfo.info.name,
    phoneNumber: phoneNumber,
    sourceLabel: "这是固定测试数据",
    count: 123,
    province: "广东",
    city: "深圳",
    carrier: "中国移动",
    source: "360",
    predefinedLabel: 'Fraud Scam Likely',
        });
      
      return {
        //phoneNumber: result.phoneNumber,
      //  sourceLabel: result.sourceLabel,
      //  count: result.count,
      //  province: result.province,
     //   city: result.city,
     //   carrier: result.carrier,
    //    predefinedLabel: matchedLabel,
    //    source: pluginInfo.info.name,
    phoneNumber: phoneNumber,
    sourceLabel: "这是固定测试数据",
    count: 123,
    province: "广东",
    city: "深圳",
    carrier: "中国移动",
    source: "360",
    predefinedLabel: 'Fraud Scam Likely',

        
      };
    });
  } catch (error) {
    console.error('Error in generateOutput:', error);
    return {
      error: error.message || 'Unknown error occurred during phone number lookup.',
    };
  }
}





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
