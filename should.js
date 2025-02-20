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
        // ...
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
        // ... (与之前相同, 不需要修改)
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
            // console.log('Document Object:', doc); // 这行可能导致问题，因为 doc 现在是字符串

            const bodyElement = doc.body;
            // console.log('Body Element:', bodyElement);  // 这行可能导致问题
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

    // generateOutput 函数 (修改)
    async function generateOutput(phoneNumber, nationalNumber, e164Number, externalRequestId) {
        console.log('generateOutput called with:', phoneNumber, externalRequestId);

        // 1. 构造请求参数 (现在在插件内部完成)
        // const url = `https://www.tellows.com/num/${phoneNumber}`; // 不再写死 URL
        const method = 'GET';
        const headers = {
            // 'X-Flutter-Intercept': 'true', // 不需要了
            'User-Agent': 'Mozilla/5.0 ...', // 您可以根据需要设置 User-Agent
        };
        const body = null; // GET 请求通常没有 body

        // 2. 调用 sendRequest 发送请求信息
        // sendRequest(url, method, headers, body, externalRequestId);
        // 处理多个号码 (phoneNumber, nationalNumber, e164Number)
        if (phoneNumber) {
            const url = `https://www.tellows.com/num/${phoneNumber}`;
            sendRequest(url, method, headers, body, externalRequestId);
        }
        if (nationalNumber) {
             const url = `https://www.tellows.com/num/${nationalNumber}`;
            sendRequest(url, method, headers, body, externalRequestId);
        }
        if (e164Number) {
            const url = `https://www.tellows.com/num/${e164Number}`;
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
