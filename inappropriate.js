// Plugin ID, each plugin must be unique
const pluginId = 'tellowsPlugin';

// Plugin information (保持不变)
const pluginInfo = {
    info: {
        id: 'tellowsPlugin',
        name: 'Tellows',
        version: '1.2.0',
        description: 'This plugin retrieves information about phone numbers from tellows.com.',
        author: 'Your Name',
    },
};

// Predefined label list (保持不变)
const predefinedLabels = [
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

// Manual mapping table (保持不变)
const manualMapping = {
    'Unknown': 'Unknown',
    'Trustworthy number': 'Other',
    'Sweepstakes, lottery': 'Spam Likely',
    'Debt collection company': 'Debt Collection',
    'Aggressive advertising': 'Telemarketing',
    'Survey': 'Survey',
    'Harassment calls': 'Spam Likely',
    'Cost trap': 'Fraud Scam Likely',
    'Telemarketer': 'Telemarketing',
    'Ping Call': 'Spam Likely',
    'SMS spam': 'Spam Likely',
    'Spam Call': 'Spam Likely',
};

// Function to extract data from DOM (保持不变)
function extractDataFromDOM(doc, phoneNumber) {
    // ... (保持不变，您的 HTML 解析逻辑) ...
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

// 公共函数：处理单个号码的查询
async function handleNumberQuery(number, requestId) {
    // 1. 构造请求体
    const requestData = {
        requestId: requestId,
        pluginId: pluginId,
        method: 'GET', // 假设都是 GET 请求
        url: `https://www.tellows.com/num/${number}`,
        headers: {
            // 您可以在这里添加一些默认的请求头，例如：
            'Content-Type': 'application/json',
            // 'User-Agent': '...', // 如果需要，可以在这里设置 User-Agent
        },
        // body: null, // GET 请求通常没有 body
    };

    // 2. 通过 FlutterChannel 将请求体发送给 Dart
    if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
        window.flutter_inappwebview.callHandler('FlutterChannel', JSON.stringify(requestData));
    } else {
        console.error('FlutterChannel (flutter_inappwebview) is not defined');
        return Promise.reject('FlutterChannel is not defined'); // 返回一个 rejected Promise
    }

    // 3. 返回一个 Promise，用于 Dart 侧等待结果
    return new Promise((resolve, reject) => {
        // 设置一个超时计时器
        const timeoutId = setTimeout(() => {
            reject(new Error('Timeout waiting for response from Dart'));
              window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify({
                    type: 'pluginError',
                    pluginId: pluginId,
                    requestId: requestId,
                    error: 'Timeout waiting for response from Dart',
                }));
        }, 5000); // 5 秒超时

        // 监听来自 Dart 的消息 (模拟 onmessage)
        window.addEventListener('message', function listener(event) {
            if (event.data.type === `xhrResponse_${pluginId}` && event.data.detail.requestId === requestId) {
                clearTimeout(timeoutId); // 取消超时计时器
                window.removeEventListener('message', listener); // 移除监听器
                const response = event.data.detail.response;

               if (response.status >= 200 && response.status < 300) {
                    // 请求成功, 解析返回的结果
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, 'text/html');
                    const result = extractDataFromDOM(doc, number);
                      resolve(result); // 解析 Promise
                } else {
                     console.error(`HTTP error! status: ${response.status}`);
                    reject(new Error(`HTTP error! status: ${response.status}`)); // 拒绝 Promise
                }
            }
        });
    });
}

// Function to generate output information
// Function to generate output information
async function generateOutput(phoneNumber, nationalNumber, e164Number, externalRequestId) {
    console.log('generateOutput called with:', phoneNumber, nationalNumber, e164Number, externalRequestId);

    try {
        let result;

        if (phoneNumber) {
            const phoneRequestId = Math.random().toString(36).substring(2);
            try {
                result = await handleNumberQuery(phoneNumber, phoneRequestId);
                 // 发送结果到 Flutter
                if(result){
                    window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify({
                        type: 'pluginResult',
                        requestId: phoneRequestId, // 使用 phoneRequestId
                        pluginId: pluginId,
                        data: result,
                    }));
                }
            } catch (error) {
                console.error('Error querying phoneNumber:', error);
            }
        }

        if (nationalNumber) {
            const nationalRequestId = Math.random().toString(36).substring(2);
            try {
                result = await handleNumberQuery(nationalNumber, nationalRequestId);
                if(result){
                      window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify({
                        type: 'pluginResult',
                        requestId: nationalRequestId, // 使用 nationalRequestId
                        pluginId: pluginId,
                        data: result,
                    }));
                }

            } catch (error) {
                console.error('Error querying nationalNumber:', error);
            }
        }

        if (e164Number) {
            const e164RequestId = Math.random().toString(36).substring(2);
            try {
                result = await handleNumberQuery(e164Number, e164RequestId);
                 if(result){
                    window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify({
                        type: 'pluginResult',
                        requestId: e164RequestId, // 使用 e164RequestId
                        pluginId: pluginId,
                        data: result,
                    }));
                }
            } catch (error) {
                console.error('Error querying e164Number:', error);
            }
        }

      // 如果没有任何结果
        if (!result) {
            window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify({
                type: 'pluginError',
                pluginId: pluginId,
                requestId: externalRequestId, // 使用 externalRequestId
                error: 'All attempts failed or timed out.',
            }));
        }


    } catch (error) {
        console.error('Error in generateOutput:', error);
         window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify({
                type: 'pluginError',
                pluginId: pluginId,
                requestId: externalRequestId,
                error: error.message || 'Unknown error occurred during phone number lookup.',
            }));
    }
}

// Initialize plugin (保持不变)
async function initializePlugin() {
    window.plugin = {};
    const thisPlugin = {
        id: pluginInfo.info.id,
        pluginId: pluginId,
        version: pluginInfo.info.version,
        generateOutput: generateOutput,
        test: function() {
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
        console.error('FlutterChannel (flutter_inappwebview) is not defined');
    }
}

// Initialize plugin
initializePlugin();
