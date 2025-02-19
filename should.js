// Plugin ID, each plugin must be unique
const pluginId = 'tellowsPlugin';

// Plugin information
const pluginInfo = {
  // Plugin information
  info: {
    id: 'tellowsPlugin', // Plugin ID, must be unique
    name: 'Tellows', // Plugin name
    version: '1.2.0', // Plugin version
    description: 'This plugin retrieves information about phone numbers from shouldianswer.com.', // Plugin description
    author: 'Your Name', // Plugin author
  },
};

// Predefined label list (you can adjust this list based on your needs)
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
    {'label': 'Debt Collection'},
    {'label': 'Survey'},
    {'label': 'Political'},
    {'label': 'Ecommerce'},
    {'label': 'Risk'},
    {'label': 'Agent'},
    {'label': 'Recruiter'},
    {'label': 'Headhunter'},
    {'label': 'Silent Call(Voice Clone?)'},  

];

// Manual mapping table to map source labels to predefined labels (updated based on shouldianswer.com labels)
const manualMapping = {
    'Unknown': 'Unknown',
    'Trustworthy number': 'Other', //  Could be mapped to something more specific if you have a "safe" category.
    'Sweepstakes, lottery': 'Spam Likely', //  Or 'Fraud Scam Likely', depending on context
    'Debt collection company': 'Debt Collection',
    'Aggressive advertising': 'Telemarketing', // Or 'Spam Likely'
    'Survey': 'Survey',
    'Harassment calls': 'Spam Likely',  // Or 'Fraud Scam Likely', if threats are involved
    'Cost trap': 'Fraud Scam Likely',
    'Telemarketer': 'Telemarketing',
    'Ping Call': 'Spam Likely', // Often associated with scams
    'SMS spam': 'Spam Likely',
    'Spam Call': 'Spam Likely', // Added, map label extracted "spam call" to predefined "Spam Likely"
};


// Using a Map object to store pending Promises  (不再需要)
// const pendingPromises = new Map();

// Function to query phone number information (修改: 使用 XMLHttpRequest, 添加 requestId 到 URL)
function queryPhoneInfo(phoneNumber, requestId) {
  console.log('queryPhoneInfo called with phoneNumber:', phoneNumber, 'and requestId:', requestId);

  return new Promise((resolve, reject) => {
    const url = `https://www.tellows.com/num/${phoneNumber}?requestId=${requestId}`; // 将 requestId 添加到 URL
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('X-Flutter-Intercept', 'true'); // 添加自定义头部
    xhr.timeout = 5000;

    xhr.onload = () => {
      // 由于我们在 Flutter 端拦截并修改了请求，这里的 xhr.status, xhr.responseText 等将不会是最终结果
      // 真正的响应处理在 Flutter 的 onLoadResource 中进行
      // 我们在这里只 resolve 一个空值，或者不 resolve/reject，让 Promise 保持 pending 状态
      // 这实际上是利用了 XMLHttpRequest 的机制，但我们并不真正使用它的结果
      resolve(); // 或者什么都不做
    };

     xhr.onerror = () => {
        // 这里的 onerror 仍然可能被触发 (例如，网络连接问题)
        reject(new Error('Network error'));
    };

    xhr.ontimeout = () => {
       // 超时也可能被触发
        reject(new Error('Request timed out'));
    };

    xhr.send();
  });
}

function extractDataFromDOM(doc, phoneNumber) {
    // ... (与之前版本相同, 不需要修改)
     const jsonObject = {
        count: 0,
        sourceLabel: "",
        province: "",
        city: "",
        carrier: "",
        phoneNumber: phoneNumber,
        name: "unknown",
        rate: 0
    };

    try {
        console.log('Document Object:', doc);

        const bodyElement = doc.body;
        console.log('Body Element:', bodyElement);
        if (!bodyElement) {
            console.error('Error: Could not find body element.');
            return jsonObject;
        }

        // --- Helper Function to find element by text ---
        function findElementByText(selector, text) {
            const elements = doc.querySelectorAll(selector);
            for (const element of elements) {
                if (element.textContent.includes(text)) {
                    return element;
                }
            }
            return null;
        }

        // 1. Extract Label (Priority 1: Types of call)
        const typesOfCallElement = findElementByText('b', "Types of call:"); // Find <b> containing the text
        if (typesOfCallElement) {
            const nextSibling = typesOfCallElement.nextSibling;
            if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE) {
                let labelText = nextSibling.textContent.trim();
                if (labelText) {
                    jsonObject.sourceLabel = labelText;
                }
            }
        }

        // 2. Extract Label (Priority 2: Score Image) - Only if sourceLabel is empty
        if (!jsonObject.sourceLabel) {
            const scoreImage = doc.querySelector('a[href*="tellows_score"] img.scoreimage');
            if (scoreImage) {
                const altText = scoreImage.alt;
                const scoreMatch = altText.match(/Score\s([789])/); //checks for 7, 8, or 9
                if (scoreMatch) {
                    jsonObject.sourceLabel = "Spam Call";
                }
            }
        }

        // 3. Extract Name (Caller ID) - ROBUST METHOD
    // 3. Extract Name (Caller ID) - Corrected: Directly select the span.callerId
    const callerIdElement = doc.querySelector('span.callerId');
    if (callerIdElement) {
        jsonObject.name = callerIdElement.textContent.trim();
    }


        // 4. Extract Rate and Count (using Ratings)
        // const ratingsElement = doc.querySelector('a[href="#complaint_list"] strong span'); // Original selector
        const ratingsElement = findElementByText('strong', "Ratings:"); // More robust way to locate

        if (ratingsElement) {
          const spanElement = ratingsElement.querySelector('span');
          if (spanElement) {
            const rateValue = parseInt(spanElement.textContent.trim(), 10) || 0;
            jsonObject.rate = rateValue;
            jsonObject.count = rateValue;
          }
        }
        // 5. Extract City and Province - CORRECTED LOGIC
        const cityElement = findElementByText('strong', "City:");
        if (cityElement) {
            let nextSibling = cityElement.nextSibling;
            while (nextSibling) {
                if (nextSibling.nodeType === Node.TEXT_NODE) {
                    let cityText = nextSibling.textContent.trim();

                    // Split by " - " to get "City" and "Country" parts
                    const parts = cityText.split('-');
                    if (parts.length > 0) {
                        jsonObject.city = parts[0].trim(); // The FIRST part is the city

                        // If there's a second part (countries), handle it
                        if (parts.length > 1) {
                            const countries = parts[1].trim().split(',').map(c => c.trim());
                            jsonObject.province = countries.join(", "); // Join with ", " for multiple countries
                        }
                    }
                    break; // Exit the loop once we've found the city text.
                }
                nextSibling = nextSibling.nextSibling;
            }
        }


    } catch (error) {
        console.error('Error extracting data:', error);
    }

    console.log('Final jsonObject:', jsonObject);
    console.log('Final jsonObject type:', typeof jsonObject);
    return jsonObject;
}

// Function to generate output information (修改: 使用 Promise 和 then/catch)
async function generateOutput(phoneNumber, nationalNumber, e164Number, externalRequestId) {
   console.log('generateOutput called with:', phoneNumber,  externalRequestId);

      // Helper function to send result or error to Flutter
    function sendResultToFlutter(type, data) {
        const message = {
            type: type,
            pluginId: pluginId,
            requestId: externalRequestId, // 使用 externalRequestId
            data: data,
        };
        const messageString = JSON.stringify(message);
        console.log('Sending message to Flutter:', messageString);

        // 使用 PluginResultChannel 发送消息
        if (typeof PluginResultChannel !== 'undefined') {
            PluginResultChannel.postMessage(messageString);
        } else {
            console.error('PluginResultChannel is not defined');
        }
    }

  // Process each number sequentially, use whichever returns a valid result first
  // 依次处理每个号码，使用第一个返回有效结果的
    try {
        let result;

        if (phoneNumber && !result) {
            try {
                // 注意：这里我们 await queryPhoneInfo，但实际上它不会 resolve 或 reject
                // 真正的响应处理在 Flutter 的 onLoadResource 中
                await queryPhoneInfo(phoneNumber, externalRequestId); // Pass externalRequestId
                 // 由于我们在 queryPhoneInfo 中不解析 HTML，这里不需要解析
                // result = extractDataFromDOM(doc, phoneNumber);  // 不需要这行
               // console.log('Query result for phoneNumber:', result); // 这里的 result 将是 undefined
              // 我们不需要在这里设置 result，因为实际的结果会在 onLoadResource 中获取
            } catch (error) {
                console.error('Error querying phoneNumber:', error);
              //即使出错也不要reject, 继续尝试其他号码
            }
        }

        if (nationalNumber && !result) {
          try {
                await queryPhoneInfo(nationalNumber, externalRequestId);
                // result = extractDataFromDOM(doc, nationalNumber); // 不需要这行
                // console.log('Query result for nationalNumber:', result); // 这里的 result 将是 undefined
            } catch (error) {
                console.error('Error querying nationalNumber:', error);
            }
        }

        if (e164Number && !result) {
            try {
                await queryPhoneInfo(e164Number, externalRequestId);
                // result = extractDataFromDOM(doc, e164Number); // 不需要这行
                // console.log('Query result for e164Number:', result); // 这里的 result 将是 undefined
            } catch (error) {
                console.error('Error querying e164Number:', error);
            }
        }

        // 由于真正的结果在 onLoadResource 中处理，这里我们不需要检查 result
        // 我们只需要确保 generateOutput 不要过早地 resolve 或 reject

    }  catch (error) {
        console.error('Error in generateOutput:', error);
          // 在这里，我们只处理 queryPhoneInfo 中可能发生的网络错误 (onerror, ontimeout)
        sendResultToFlutter('pluginError', { error: error.message || 'Unknown error occurred during phone number lookup.' });
    }
}

// 拦截器 (用于模拟 handleResponse)
window.xhrInterceptor = {
    originalXHR: window.XMLHttpRequest,
    requests: {},

     myXHR: function() {
        let xhr = new window.xhrInterceptor.originalXHR();
        let myRequestId;

        xhr.open = function(method, url) {
            myRequestId = Date.now().toString();
            this.method = method;
            this.url = url;
            // 重要: 将 *当前* XHR 对象存储到 requests 中
            window.xhrInterceptor.requests[myRequestId] = this;
            console.log('myXHR open:', method, url, myRequestId);
            return xhr.open.apply(xhr, arguments);
        };

        xhr.send = function(body) {
            console.log('myXHR send:', this.method, this.url, body, myRequestId);
            xhr.send.apply(xhr, arguments); // 必须实际发送请求
        };
        return xhr;
    },

    handleResponse: function(requestId, responseData) {
        console.log('handleResponse called with:', requestId, responseData);

        // 重要: 从 requests 中获取 *原始* XHR 对象
        const xhr = window.xhrInterceptor.requests[requestId];
        if (!xhr) {
            console.error("Request not found for requestId:", requestId);
            return;
        }

        // 清理 requests, 防止内存泄漏
        delete window.xhrInterceptor.requests[requestId];

        // 使用 Object.defineProperty 设置属性
        Object.defineProperty(xhr, 'readyState', { value: 4 });
        Object.defineProperty(xhr, 'status', { value: responseData.status });
        Object.defineProperty(xhr, 'statusText', { value: responseData.statusText || '' });
        Object.defineProperty(xhr, 'responseText', { value: responseData.responseText });
        Object.defineProperty(xhr, 'response', { value: responseData.responseText });

        // 模拟 getAllResponseHeaders() 方法 (返回字符串)
        let headersString = "";
        for (let key in responseData.headers) {
            headersString += key + ": " + responseData.headers[key] + "\r\n";
        }
        Object.defineProperty(xhr, 'getAllResponseHeaders', { value: function() { return headersString; } });

       // 触发 onreadystatechange 事件
        if (xhr.onreadystatechange) {
             console.log('Triggering onreadystatechange');
            xhr.onreadystatechange();
        } else {
           console.log('No onreadystatechange handler found');
        }

        // 解析 HTML 并提取数据 (在 handleResponse 中)
        const parser = new DOMParser();
        const doc = parser.parseFromString(responseData.responseText, 'text/html');
        const result = extractDataFromDOM(doc, ''); // 这里可以传递一个默认的电话号码，或者从 responseData 中获取

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

        // 构建最终结果
        const finalResult = {
            phoneNumber: result.phoneNumber, // Use extracted or default phone number
            sourceLabel: result.sourceLabel,
            count: result.count,
            province: result.province,
            city: result.city,
            carrier: result.carrier,
            name: result.name,
            predefinedLabel: matchedLabel,
            source: pluginInfo.info.name,
        };

        // 发送最终结果 (使用 PluginResultChannel)
        console.log('Sending final result to Flutter:', finalResult);

         // Helper function to send result or error to Flutter
        function sendResultToFlutter(type, data) {
            const message = {
                type: type,
                pluginId: pluginId,
                requestId: requestId, // 使用 handleResponse 的 requestId
                data: data,
            };
            const messageString = JSON.stringify(message);
            console.log('Sending message to Flutter:', messageString);

            // 使用 PluginResultChannel 发送消息
            if (typeof PluginResultChannel !== 'undefined') {
                PluginResultChannel.postMessage(messageString);
            } else {
                console.error('PluginResultChannel is not defined');
            }
        }
        sendResultToFlutter('pluginResult', finalResult);

    },
};

window.XMLHttpRequest = window.xhrInterceptor.myXHR; // 替换 XMLHttpRequest

// Initialize plugin
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

    if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
        window.flutter_inappwebview.callHandler('TestPageChannel', JSON.stringify({
            type: 'pluginLoaded',
            pluginId: pluginId,
        }));
        console.log('Notified Flutter that plugin is loaded');

        window.flutter_inappwebview.callHandler('TestPageChannel', JSON.stringify({
            type: 'pluginReady',
            pluginId: pluginId,
        }));
        console.log('Notified Flutter that plugin is ready');
    } else {
        console.error('TestPageChannel (flutter_inappwebview) is not defined');
    }
}

// Initialize plugin
initializePlugin();
