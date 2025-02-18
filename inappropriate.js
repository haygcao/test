(function (pluginId) {
    if (!window.plugin) {
        window.plugin = {};
    }

    if (!window.plugin[pluginId]) {
        window.plugin[pluginId] = {};
    }

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
    // Function to query phone number information
    function queryPhoneInfo(phoneNumber, requestId) {
      console.log('queryPhoneInfo called with phoneNumber:', phoneNumber, 'and requestId:', requestId);
      // 使用 callHandler 发送请求
      window.flutter_inappwebview.callHandler('FlutterChannel', JSON.stringify({
        pluginId: pluginId,
        method: 'GET',
        requestId: requestId,
        url: `https://www.tellows.com/num/${phoneNumber}`, // Updated URL
        headers: {
          "User-Agent": 'Mozilla/5.0 (Linux; arm_64; Android 14; SM-S711B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.199 YaBrowser/24.12.4.199.00 SA/3 Mobile Safari/537.36',
        },
      }));
    }

    function extractDataFromDOM(doc, phoneNumber) {
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


  // Function to generate output information, async
    async function generateOutput(phoneNumber, nationalNumber, e164Number, externalRequestId) {
        console.log('generateOutput called with:', phoneNumber, nationalNumber, e164Number, externalRequestId);
        // 使用 Promise 封装 handleNumberQuery,支持多个号码
        function handleNumberQuery(number, requestId) {
            return new Promise((resolve, reject) => {
                queryPhoneInfo(number, requestId); // 发送请求

                // 设置超时
                const timeoutId = setTimeout(() => {
                    reject(new Error('Timeout waiting for response for number: ' + number));
                }, 5000); // 5 秒超时

                // 监听来自 Flutter 的消息
                function messageListener(event) {
                    try{
                        const message = JSON.parse(event.data);
                         console.log('Received message from Flutter:', message, 'for requestId:', requestId, 'message type:', message.type);
                        if (message.type === 'xhrResponse_' + pluginId) {
                            const detail = message.detail;
                              if (detail && detail.response && detail.requestId === requestId) {

                                    const response = detail.response;
                                    console.log('Received xhrResponse:', response);

                                    // 解析 HTML
                                    const parser = new DOMParser();
                                    const doc = parser.parseFromString(response.responseText, 'text/html');

                                    // 提取数据
                                    const jsonObject = extractDataFromDOM(doc, number);
                                     console.log('Extracted information:', jsonObject);
                                    // 清除超时
                                    clearTimeout(timeoutId);

                                    // 解决 Promise
                                    resolve(jsonObject);
                                    window.removeEventListener('message', messageListener); //
                                }
                        }
                    }catch (e) {
                        console.error('Error handling message from Flutter:', e);
                    }

                }
                window.addEventListener('message', messageListener);
            });
        }

         // Process each number sequentially, use whichever returns a valid result first
        try {
            let result;

            if (phoneNumber) {
            const phoneRequestId = Math.random().toString(36).substring(2);
            try {
                result = await handleNumberQuery(phoneNumber, phoneRequestId);
                console.log('Query result for phoneNumber:', result);
            } catch (error) {
                console.error('Error querying phoneNumber:', error);
            }
            }

            if (nationalNumber) {
            const nationalRequestId = Math.random().toString(36).substring(2);
            try {
                result = await handleNumberQuery(nationalNumber, nationalRequestId);
                console.log('Query result for nationalNumber:', result);
            } catch (error) {
                console.error('Error querying nationalNumber:', error);
            }
            }

            if (e164Number) {
            const e164RequestId = Math.random().toString(36).substring(2);
            try {
                result = await handleNumberQuery(e164Number, e164RequestId);
                console.log('Query result for e164Number:', result);
            } catch (error) {
                console.error('Error querying e164Number:', error);
            }
            }

            console.log('First successful query completed:', result);
            console.log('First successful query completed type:', typeof result);
            // If no result, reject
            if (!result) {
                throw new Error('All attempts failed or timed out.');
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
            // window.flutter_inappwebview.callHandler('PluginResultChannel', ...);
            // 发送最终结果
            window.flutter_inappwebview.callHandler('PluginResultChannel', {
                type: 'pluginResult',
                requestId: externalRequestId, // 使用传入的 requestId
                pluginId: pluginId,
                data: finalResult
            });

            return finalResult;
        }catch (error) {
            console.error('Error in generateOutput:', error);
            // 通过 callHandler 发送错误消息
            window.flutter_inappwebview.callHandler('PluginResultChannel', {
                type: 'pluginError',
                pluginId: pluginId,
                error: error.message || 'Unknown error occurred during phone number lookup.',
            });
            return { error: error.message || 'Unknown error occurred during phone number lookup.' };
        }
    }
    // Initialize plugin
    async function initializePlugin() {
        window.plugin = {};
        const thisPlugin = {
            id: pluginInfo.info.id,
            pluginId: pluginId,
            version: pluginInfo.info.version,
            queryPhoneInfo: queryPhoneInfo, // 确保这里是正确的引用
            generateOutput: generateOutput, // 确保这里是正确的引用
            test: function () {
            console.log('Plugin test function called');
            return 'Plugin is working';
            }
        };

        window.plugin[pluginId] = thisPlugin;
         // 使用 callHandler 发送 pluginLoaded 和 pluginReady
        window.flutter_inappwebview.callHandler('TestPageChannel', { type: 'pluginLoaded', pluginId: pluginId });
        window.flutter_inappwebview.callHandler('TestPageChannel', { type: 'pluginReady', pluginId: pluginId });
    }

    // Initialize plugin
    initializePlugin();

    window.checkPluginStatus = function(pluginId) {
      return window.plugin && window.plugin[pluginId];
    }

})('testPlugin'); // 立即调用，传入 pluginId
