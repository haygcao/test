(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
            id: 'tellowsPlugin',
            name: 'Tellows Plugin',
            version: '1.0.0',
            description: 'This plugin retrieves information about phone numbers.',
        },
    };

     // 插件可以定义它支持的预定义标签
    const predefinedLabels = [
       // ...
       { 'label': 'Fraud Scam Likely' },
        { 'label': 'Spam Likely' },
        { 'label': 'Telemarketing' },
        { 'label': 'Robocall' },
        { 'label': 'Delivery' },
        { 'label': 'Takeaway' },
        { 'label': 'Ridesharing' },
        { 'label': 'Insurance' },
        { 'label': 'Loan' },
        { 'label': 'Customer Service' },
        { 'label': 'Unknown' },
        { 'label': 'Financial' },
        { 'label': 'Bank' },
        { 'label': 'Education' },
        { 'label': 'Medical' },
        { 'label': 'Charity' },
        { 'label': 'Other' },
        { 'label': 'Debt Collection' },
        { 'label': 'Survey' },
        { 'label': 'Political' },
        { 'label': 'Ecommerce' },
        { 'label': 'Risk' },
        { 'label': 'Agent' },
        { 'label': 'Recruiter' },
        { 'label': 'Headhunter' },
        { 'label': 'Silent Call(Voice Clone?)' },
    ];

    // 手动映射表，用于将提取的标签映射到预定义标签
    const manualMapping = {
    '中介': 'Agent',             // 含义较广，包括房产中介等
    '房产中介': 'Agent',         // 细化为房地产经纪人
    '违规催收': 'Debt Collection',
    '快递物流': 'Delivery',
    '快递': 'Delivery',
    '教育培训': 'Education',
    '金融': 'Financial',
    '股票证券': 'Financial',   // 统一为金融
    '保险理财': 'Financial',   // 统一为金融
    '涉诈电话': 'Fraud Scam Likely',
    '诈骗': 'Fraud Scam Likely',
    '招聘': 'Recruiter',    // 招聘和猎头很多时候可以合并
    '猎头': 'Headhunter',
    '猎头招聘': 'Headhunter',
    '招聘猎头': 'Headhunter',
    '保险': 'Insurance',
    '保险推销': 'Insurance',
    '贷款理财': 'Loan',   
    '医疗卫生': 'Medical',  
    '其他': 'Other',
    '送餐外卖': 'Takeaway',
    '美团': 'Takeaway',
    '饿了么': 'Takeaway',
    '外卖': 'Takeaway',  
    '滴滴/优步': 'Ridesharing',
    '出租车': 'Ridesharing',
    '网约车': 'Ridesharing',
    '违法': 'Risk',
    '淫秽色情': 'Risk',
    '反动谣言': 'Risk', 
    '发票办证': 'Risk',
    '客服热线': 'Customer Service',
    '非应邀商业电话': 'Spam Likely',
    '广告': 'Spam Likely',
    '骚扰': 'Spam Likely', 
    '骚扰电话': 'Spam Likely', // 骚扰电话很多是诈骗    
    '广告营销': 'Telemarketing',
    '广告推销': 'Telemarketing',
    '旅游推广': 'Telemarketing',
    '食药推销': 'Telemarketing',      
    '推销': 'Telemarketing',
};
    // sendRequest 函数 (负责发送请求信息)
    function sendRequest(url, method, headers, body, requestId) {
        const requestData = {
            url: url,
            method: method,
            headers: headers,
            body: body,
            requestId: requestId,
            pluginId: pluginId,
        };

        // 使用 callHandler 将请求数据发送到 Flutter
        if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler('RequestChannel', JSON.stringify(requestData));
        } else {
            console.error("flutter_inappwebview is undefined");
        }
    }

    // handleResponse 函数 (处理来自 Flutter 的响应)
    function handleResponse(response) {
        console.log('handleResponse called with:', response);
        // response 包含 { requestId, status, statusText, responseText, headers }

        if (response.status >= 200 && response.status < 300) {
             // 调用 parseResponse 解析响应文本, 并传入phoneNumber
            let result = parseResponse(response.responseText,  response.phoneNumber);

            console.log('First successful query completed:', result);

            // Ensure result is not null or undefined
            if (result === null || result === undefined) {
              sendResultToFlutter('pluginError', { error: 'All attempts failed or timed out.' });
              return;
            }

            // Find a matching predefined label using the found sourceLabel
            let matchedLabel = predefinedLabels.find(label => label.label === result.sourceLabel)?.label;

            // If no direct match is found, try to find one in manualMapping
            if (!matchedLabel) {
                matchedLabel = manualMapping[result.sourceLabel];
            }

            // If no match is found in manualMapping, use 'Unknown'
            if (!matchedLabel) {
                matchedLabel = 'Unknown';
            }

            const finalResult = {
                phoneNumber: result.phoneNumber,
                sourceLabel: result.sourceLabel,
                count: result.count,
                province: result.province,
                city: result.city,
                carrier: result.carrier,
                name: result.name,
                predefinedLabel: matchedLabel, // Use the matched label
                source: pluginInfo.info.name,
            };
            // 通过 PluginResultChannel 将结果发送回 Flutter
            sendResultToFlutter('pluginResult', finalResult, response.requestId); // 包含 requestId

        } else {
            //如果失败了也需要返回给flutter
             sendResultToFlutter('pluginError', { error: response.statusText  },  response.requestId);        }
    }
    // 辅助函数：向 Flutter 发送结果或错误 (现在接收 requestId)
    function sendResultToFlutter(type, data, requestId) {
        const message = {
            type: type,
            pluginId: pluginId,
            requestId: requestId, // 包含 requestId
            data: data,
        };
        const messageString = JSON.stringify(message);
        console.log('Sending message to Flutter:', messageString);
        if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler('PluginResultChannel', messageString);
        } else {
            console.error("flutter_inappwebview is undefined");
        }
    }

    // parseResponse 函数 (由插件定义)
    function parseResponse(responseText, phoneNumber) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(responseText, 'text/html');
        return extractDataFromDOM(doc, phoneNumber);
    }

 function extractDataFromDOM(doc, phoneNumber) {
  const jsonObject = {
    count: 0,
    sourceLabel: "",
    province: "",
    city: "",
    carrier: "unknown", // 默认为 unknown
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

    // 提取 sourceLabel 和 count
    const infoRightElement = doc.querySelector('.info-right');
    console.log('infoRightElement:', infoRightElement);

    if (infoRightElement) {
      const reportWrapper = infoRightElement.querySelector('.report-wrapper');
      console.log('reportWrapper:', reportWrapper);

      if (reportWrapper) {
        const reportNameElement = reportWrapper.querySelector('.report-name');
        console.log('reportNameElement:', reportNameElement);
        if (reportNameElement) {
          jsonObject.sourceLabel = reportNameElement.textContent.trim();
          console.log('jsonObject.sourceLabel:', jsonObject.sourceLabel);
        }

        const reportTypeElement = reportWrapper.querySelector('.report-type');
        console.log('reportTypeElement:', reportTypeElement);
        if (reportTypeElement && reportTypeElement.textContent.trim() === '用户标记') {
          jsonObject.count = 1;
          console.log('jsonObject.count:', jsonObject.count);
        }
      }

      // 提取 province 和 city
      const locationElement = infoRightElement.querySelector('.location');
      console.log('locationElement:', locationElement);
      if (locationElement) {
        const locationText = locationElement.textContent.trim();
        console.log('locationText:', locationText);
        const match = locationText.match(/([\u4e00-\u9fa5]+)[\s ]*([\u4e00-\u9fa5]+)?/);
        if (match) {
          jsonObject.province = match[1] || '';
          jsonObject.city = match[2] || '';
        }
        console.log('jsonObject.province:', jsonObject.province);
        console.log('jsonObject.city:', jsonObject.city);
      }
    }


  } catch (error) {
    console.error('Error extracting data:', error);
  }

  console.log('Final jsonObject:', jsonObject);
  console.log('Final jsonObject type:', typeof jsonObject);
  return jsonObject;
}


    // generateOutput 函数 (修改)
    async function generateOutput(phoneNumber, nationalNumber, e164Number, externalRequestId) {
        console.log('generateOutput called with:', phoneNumber, externalRequestId);

        // 1. 构造请求参数 (现在在插件内部完成)
        // const url = `https://www.tellows.com/num/${phoneNumber}`; // 不再写死 URL
        const method = 'GET';
        const headers = {
            // 'X-Flutter-Intercept': 'true', // 不需要了
            'User-Agent': 'Mozilla/5.0 (Linux; arm_64; Android 14; SM-S711B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.199 YaBrowser/24.12.4.199.00 SA/3 Mobile Safari/537.36', // 您可以根据需要设置 User-Agent
        };
        const body = null; // GET 请求通常没有 body

        // 2. 调用 sendRequest 发送请求信息
        // sendRequest(url, method, headers, body, externalRequestId);
        // 处理多个号码 (phoneNumber, nationalNumber, e164Number)
        if (phoneNumber) {
            const url = `https://haoma.baidu.com/phoneSearch?search=${phoneNumber}&srcid=8757`;
            sendRequest(url, method, headers, body, externalRequestId);
        }
        if (nationalNumber) {
             const url = `https://haoma.baidu.com/phoneSearch?search=${nationalNumber}&srcid=8757`;
            sendRequest(url, method, headers, body, externalRequestId);
        }
        if (e164Number) {
            const url = `https://haoma.baidu.com/phoneSearch?search=${e164Number}&srcid=8757`;
            sendRequest(url, method, headers, body, externalRequestId);
        }

    }
    // Initialize plugin
    async function initializePlugin() {
        window.plugin = {};
        const thisPlugin = {
            id: pluginInfo.info.id,
            pluginId: pluginId,
            version: pluginInfo.info.version,
            generateOutput: generateOutput,
              handleResponse: handleResponse,  // 添加 handleResponse
            test: function () {
                console.log('Plugin test function called');
                return 'Plugin is working';
            }
        };

        window.plugin[pluginId] = thisPlugin;

        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
             window.flutter_inappwebview.callHandler('TestPageChannel', JSON.stringify({
                type: 'pluginLoaded',
                pluginId: pluginId,
            }));
            console.log('Notified Flutter that plugin is loaded');
        } else {
            console.error('flutter_inappwebview is not defined');
        }
    }

    // Initialize plugin
    initializePlugin();
})();
