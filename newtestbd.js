(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
    id: 'baiPhoneNumberPlugin', // 插件ID,必须唯一
    name: 'bai', // 插件名称
    version: '1.2.0', // 插件版本
    description: 'This is a plugin template.', // 插件描述
    author: 'Your Name', // 插件作者
        },
    };

    const predefinedLabels = [
        { label: 'Fraud Scam Likely' },
        { label: 'Spam Likely' },
        { label: 'Telemarketing' },
        { label: 'Robocall' },
        { label: 'Delivery' },
        { label: 'Takeaway' },
        { label: 'Ridesharing' },
        { label: 'Insurance' },
        { label: 'Loan' },
        { label: 'Customer Service' },
        { label: 'Unknown' },
        { label: 'Financial' },
        { label: 'Bank' },
        { label: 'Education' },
        { label: 'Medical' },
        { label: 'Charity' },
        { label: 'Other' },
        { label: 'Debt Collection' },
        { label: 'Survey' },
        { label: 'Political' },
        { label: 'Ecommerce' },
        { label: 'Risk' },
        { label: 'Agent' },
        { label: 'Recruiter' },
        { label: 'Headhunter' },
        { label: 'Silent Call(Voice Clone?)' },
    ];

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

    // --- Unified Request Function ---
    function queryPhoneInfo(phoneNumber, externalRequestId) {
        // Generate a unique ID for *this specific phone number request*
        const phoneRequestId = Math.random().toString(36).substring(2);
        console.log(`queryPhoneInfo: phone=${phoneNumber}, externalRequestId=${externalRequestId}, phoneRequestId=${phoneRequestId}`);

        const url = `https://www.baidu.com/s?wd=${phoneNumber}`;
        const method = 'GET';
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; arm_64; Android 14; SM-S711B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.199 YaBrowser/24.12.4.199.00 SA/3 Mobile Safari/537.36', // Example User-Agent
        };
        const body = null;

        // Pass BOTH the externalRequestId AND the internal phoneRequestId
        sendRequest(url, method, headers, body, externalRequestId, phoneRequestId);
    }

    // sendRequest function (now accepts both request IDs)
    function sendRequest(url, method, headers, body, externalRequestId, phoneRequestId) {
        const requestData = {
            url: url,
            method: method,
            headers: headers,
            body: body,
            externalRequestId: externalRequestId, // Include externalRequestId
            phoneRequestId: phoneRequestId,     // Include phoneRequestId
            pluginId: pluginId,
        };

        if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler('RequestChannel', JSON.stringify(requestData));
        } else {
            console.error("flutter_inappwebview is undefined");
        }
    }

    // handleResponse function (now receives both request IDs)
    function handleResponse(response) {
    console.log('handleResponse called with:', response);

    if (response.status >= 200 && response.status < 300) {
        // Use response.phoneNumber, which should be passed from Flutter
        let result = parseResponse(response.responseText, response.phoneNumber);

        console.log('First successful query completed:', result);

        if (result === null || result === undefined) {
            // Use response.externalRequestId for errors
            sendResultToFlutter('pluginError', { error: 'All attempts failed or timed out.' }, response.externalRequestId);
            return;
        }

        let matchedLabel = predefinedLabels.find(label => label.label === result.sourceLabel)?.label;
        if (!matchedLabel) {
            matchedLabel = manualMapping[result.sourceLabel];
        }
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
            predefinedLabel: matchedLabel,
            source: pluginInfo.info.name,
        };

        // Use response.externalRequestId for the result
        sendResultToFlutter('pluginResult', finalResult, response.externalRequestId);
    } else {
        // Use response.externalRequestId for errors
        sendResultToFlutter('pluginError', { error: response.statusText }, response.externalRequestId);
    }
}
    // Helper function: send result or error to Flutter (uses externalRequestId)
    function sendResultToFlutter(type, data, externalRequestId) {
        const message = {
            type: type,
            pluginId: pluginId,
            requestId: externalRequestId, // Correct: Use externalRequestId here
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


    // parseResponse function (defined by the plugin)
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
        carrier: "unknown",
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

        // --- 按照原逻辑，并添加解码 ---
        const infoRightElement = doc.querySelector('.info-right'); // info-right 还在
        console.log('infoRightElement:', infoRightElement);

        if (infoRightElement) {
            const reportWrapper = infoRightElement.querySelector('.report-wrapper'); // report-wrapper 还在
            console.log('reportWrapper:', reportWrapper);

            if (reportWrapper) {
                // 主要从 report-name 获取 sourceLabel，并解码
                const reportNameElement = reportWrapper.querySelector('.report-name');
                console.log('reportNameElement:', reportNameElement);
                if (reportNameElement) {
                    jsonObject.sourceLabel = decodeQuotedPrintable(reportNameElement.textContent.trim()); // 解码
                    console.log('jsonObject.sourceLabel:', jsonObject.sourceLabel);
                }

                // 只有 report-type 为 "用户标记" 时，count 才为 1
                const reportTypeElement = reportWrapper.querySelector('.report-type');
                console.log('reportTypeElement:', reportTypeElement);
                if (reportTypeElement) {
                    const reportTypeText = decodeQuotedPrintable(reportTypeElement.textContent.trim()); // 解码
                    if (reportTypeText === '用户标记') {
                        jsonObject.count = 1;
                        console.log('jsonObject.count:', jsonObject.count);
                    }
                }
            }

            // 提取 province 和 city，并解码
            const locationElement = infoRightElement.querySelector('.location');
            console.log('locationElement:', locationElement);
            if (locationElement) {
                const locationText = decodeQuotedPrintable(locationElement.textContent.trim()); // 解码
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
        // --- 原逻辑和解码结束 ---

    } catch (error) {
        console.error('Error extracting data:', error);
    }

    console.log('Final jsonObject:', jsonObject);
    console.log('Final jsonObject type:', typeof jsonObject);
    return jsonObject;
}

// Quoted-Printable 解码函数 (保持不变)
function decodeQuotedPrintable(str) {
    str = str.replace(/=3D/g, "=");
    str = str.replace(/=([0-9A-Fa-f]{2})/g, function (match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
    });
    str = str.replace(/=\r?\n/g, '');
    return str;
}

    // generateOutput function (modified)
    async function generateOutput(phoneNumber, nationalNumber, e164Number, externalRequestId) {
        console.log('generateOutput called with:', phoneNumber, externalRequestId);

        // Call queryPhoneInfo for each number format, passing the externalRequestId
        if (phoneNumber) {
            queryPhoneInfo(phoneNumber, externalRequestId);
        }
        if (nationalNumber) {
            queryPhoneInfo(nationalNumber, externalRequestId);
        }
        if (e164Number) {
            queryPhoneInfo(e164Number, externalRequestId);
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
            handleResponse: handleResponse,
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
