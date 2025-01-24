
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
const predefinedLabels = [ // 修改：添加初始值
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
const manualMapping = { // 修改：添加初始值
  '标签1': 'Fraud Scam Likely', // 对应预设标签 "Fraud Scam Likely"
  '标签2': 'Spam Likely', // 对应预设标签 "Spam Likely"
  // ... 省略其他手动映射
  '标签22': 'Risk', // 对应预设标签 "Risk"
};




// 使用 Promise 来加载脚本// 因为app 没有内置npm包，所以只能引入url 或者打包
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
function extractDataFromDOM(doc, phoneNumber) {
  const jsonObject = {
    count: 0,
    sourceLabel: "",
    province: "",
    city: "",
    carrier: "",
    phoneNumber: phoneNumber
  };

  //从这里到你根据实际的html 的element 进行修改，
  // 提取标记次数 (count)
  const tipsElement = doc.querySelector('.mohe-tips .mohe-tips-zp');
  if (tipsElement) {
    const bElement = tipsElement.querySelector('b');
    if (bElement) {
      const count = parseInt(bElement.textContent.trim(), 10);
      if (!isNaN(count)) {
        jsonObject.count = count;
      }
    }
  }

  // 提取标记类型 (sourceLabel)
  const sourceLabelElement = doc.querySelector('.mohe-tips .mohe-tips-zp');
  if (sourceLabelElement) {
    let sourceLabelText = sourceLabelElement.textContent.trim()
                            .replace(/\d+/g, '')
                            .replace('用户标记', '')
                            .replace('位', '')
                            .replace('此号码近期被', '')
                            .replace('，', '')
                            .replace('！','')
                            .trim();
    jsonObject.sourceLabel = sourceLabelText;
  }

  // 提取归属地信息
  const locationElement = doc.querySelector('.gclearfix.mh-detail span:nth-child(2)');
  if (locationElement) {
    const locationText = locationElement.textContent.trim();
    // 使用 replace(/ /g, ' ') 将   替换成普通空格
    const locationParts = locationText.replace(/ /g, ' ').split(/\s+/); 
    jsonObject.province = locationParts[0] || '';
    jsonObject.city = locationParts[1] || '';
    jsonObject.carrier = locationParts[2] || '';
  }

  console.log('Extracted information:', jsonObject);
  return jsonObject;
}
//到这里需要你根据实际的html 的element 进行修改，



// 查询电话号码信息 (版本 A 的 queryPhoneNumber 函数)
// 查询电话号码信息
function queryPhoneInfo(phoneNumber,requestId) {

    ///  这里url 和headers 是你需要你修改的
  // 添加 pluginId 到消息中
    FlutterChannel.postMessage(JSON.stringify({
        pluginId: pluginId,
        method: 'GET',
        requestId:requestId, //将requestID 放到请求体里面 
        url: `https://www.so.com/s?q=${phoneNumber}`,
        headers: {
            "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',

        },
    }));
}
//// 这里url 和headers 是你需要你修改的




// 使用 Map 对象来存储 pending 的 Promise
const pendingPromises = new Map();


// 生成输出信息
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
    console.error('Error in generateOutput:', error);    // 返回错误信息给 Flutter
    return {
        error: error.message || 'Unknown error occurred during phone number lookup.',
    };
  }
}




// 在全局作用域中注册事件监听器
window.addEventListener('message', (event) => {
  console.log('Received message:', event.data); 
  if (event.data.type === `xhrResponse_${pluginId}`) {
    const response = event.data.response;
    if (response.status >= 200 && response.status < 300) {
      console.log('HTML content:', response.responseText); // 后期一定注释掉,打印 HTML 内容到 Flutter 日志,Android studio 打开flutter inspector,打开chrome://inspect/#devices,Remote Target,Inspect
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.responseText, 'text/html');

      // 使用 JavaScript 代码提取数据
      const jsonObject = extractDataFromDOM(doc, window.currentPhoneNumber); 
      console.log('Extracted information:', jsonObject);

          // 将数据传递回 Flutter,纯粹为了测试,后期测试后可以省略的
      FlutterChannel.postMessage(JSON.stringify({
        type: 'pluginResult',
        pluginId: pluginId,
        phoneNumber: window.currentPhoneNumber,
        data: jsonObject,
      }));

      // resolve 对应的 Promise
      const resolveFn = pendingPromises.get(window.currentPhoneNumber);
      if (resolveFn) {
        resolveFn(jsonObject);
        pendingPromises.delete(window.currentPhoneNumber); // 移除已处理的 Promise
      }

    } else {
      console.error(`HTTP error! status: ${response.status}`);

         // 将数据传递回 Flutter,纯粹为了测试,后期测试后可以省略的
      FlutterChannel.postMessage(JSON.stringify({
        type: 'pluginError',
        pluginId: pluginId,
        error: `HTTP error! status: ${response.status}`,
      }));
    }
  }
});

// 初始化插件
// 初始化插件
async function initializePlugin() {
  const librariesLoaded = await loadLibraries();
  if (librariesLoaded) {

 // 确保 window.plugin 被初始化为空对象
    window.plugin = {}; 
    // 创建一个新的插件对象
    const thisPlugin = { 
      id: pluginInfo.info.id,
      pluginId: pluginId,
      version: pluginInfo.info.version,
      queryPhoneInfo: queryPhoneInfo, 
      generateOutput: generateOutput,
      manualMapping: manualMapping,
      extractDataFromDOM: extractDataFromDOM,
      test: function () {
        console.log('Plugin test function called');
        return 'Plugin is working';
      }
    }; 

    // 将插件对象赋值给 window.plugin，以插件 ID 作为属性名
    window.plugin[pluginId] = thisPlugin;
    
    console.log('Plugin object set to window.plugin');
    console.log('window.plugin:', window.plugin);
console.log('pluginId:', pluginId); // 输出 pluginId 的值
    
    if (typeof TestPageChannel !== 'undefined') {
      TestPageChannel.postMessage(JSON.stringify({  // 修改：使用 JSON 格式发送消息
        type: 'pluginLoaded', // 修改：添加消息类型
        pluginId: pluginId, // 修改：添加插件 ID
      }));
      console.log('Notified Flutter that plugin is loaded');
      TestPageChannel.postMessage(JSON.stringify({ // 修改：使用 JSON 格式发送消息
        type: 'pluginReady', // 修改：添加消息类型
        pluginId: pluginId, // 修改：添加插件 ID
      })); 
    } else {
      console.error('FlutterChannel is not defined');
    }
  } else { //  **删除了重复的代码块** 
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

