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

        const url = `https://haoma.baidu.com/phoneSearch?search=${phoneNumber}&srcid=8757`;
        const method = 'GET';
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36', // Example User-Agent
    'Referer': 'https://www.baidu.com/', // 或搜索结果页 URL
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Connection': 'keep-alive',
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

// handleResponse 函数 (JavaScript)
function handleResponse(response) {
    console.log('handleResponse called with:', response);
    console.log('Initial response.responseText:', response.responseText); // Log initial responseText

    if (response.status >= 200 && response.status < 300) {
        console.log('Response status is OK (200-299)');

        // 1. 将 responseText 设置到 document.body.innerHTML
        document.body.innerHTML = response.responseText;
        console.log('document.body.innerHTML updated with response.responseText');
        console.log('Current document.body.innerHTML:', document.body.innerHTML);  // Added for debugging

        // 2. 等待包含数据的元素出现 (例如 .cc-title_31ypU)
        const checkInterval = setInterval(() => {
            const targetElement = document.querySelector('.report-wrapper'); // 或其他包含数据的元素
            console.log('Checking for targetElement (.report-wrapper):', targetElement); // Log the result of querySelector

            if (targetElement) {
                console.log('Target element found!');
                clearInterval(checkInterval); // 停止检查

                // 3. 调用 parseResponse，传入 document 和 phoneNumber
                console.log('Calling parseResponse with document and phoneNumber:', response.phoneNumber);
                let result = parseResponse(document, response.phoneNumber);
                console.log('parseResponse result:', result);


                // 4. 后续处理 (和之前一样，发送结果到 Flutter)
                console.log('First successful query completed:', result);

                if (result === null || result === undefined) {
                    console.error('parseResponse returned null or undefined. Sending error to Flutter.');
                    sendResultToFlutter('pluginError', { error: 'All attempts failed or timed out.' }, response.externalRequestId);
                    return;
                }

                console.log("Looking up predefined labels for source:", result.sourceLabel);
                let matchedLabel = predefinedLabels.find(label => label.label === result.sourceLabel)?.label;

                console.log("Predefined label match:", matchedLabel);
                if (!matchedLabel) {
                    console.log("No predefined label found. Checking manual mapping.");
                    matchedLabel = manualMapping[result.sourceLabel];
                    console.log("Manual mapping result:", matchedLabel);
                }

                if (!matchedLabel) {
                    console.log("No manual mapping found. Using 'Unknown'.");
                    matchedLabel = 'Unknown';
                }

                console.log("Final matched label:", matchedLabel);

                const finalResult = {
                    phoneNumber: result.phoneNumber,
                    sourceLabel: result.sourceLabel,
                    count: result.count,
                    province: result.province,
                    city: result.city,
                    carrier: result.carrier,
                    name: result.name, // 你可能需要从其他地方获取 name
                    predefinedLabel: matchedLabel,
                    source: pluginInfo.info.name,
                };
                console.log('Sending finalResult to Flutter:', finalResult);
                sendResultToFlutter('pluginResult', finalResult, response.externalRequestId);

            } else {
                console.log('Target element not yet found.  Continuing to check...');
            }
        }, 500); // 每 500 毫秒检查一次

    } else {
        console.error('Response status is NOT OK. Status:', response.status, 'StatusText:', response.statusText);
        // Use response.externalRequestId for errors
        sendResultToFlutter('pluginError', { error: response.statusText }, response.externalRequestId);
    }
}


// parseResponse 函数 (JavaScript)
function parseResponse(doc, phoneNumber) {
    // 不需要再创建 DOMParser 了，直接使用传入的 doc (document)
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
