(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin'; // Ensure pluginId matches Flutter

    const pluginInfo = {
        info: {
            id: 'baiPhoneNumberPlugin',
            name: 'bai',
            version: '1.8.0',
            description: 'This is a plugin template.',
            author: 'Your Name',
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
        '中介': 'Agent',
        '房产中介': 'Agent',
        '违规催收': 'Debt Collection',
        '快递物流': 'Delivery',
        '快递': 'Delivery',
        '教育培训': 'Education',
        '金融': 'Financial',
        '股票证券': 'Financial',
        '保险理财': 'Financial',
        '涉诈电话': 'Fraud Scam Likely',
        '诈骗': 'Fraud Scam Likely',
        '招聘': 'Recruiter',
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
        '骚扰电话': 'Spam Likely',
        '广告营销': 'Telemarketing',
        '广告推销': 'Telemarketing',
        '旅游推广': 'Telemarketing',
        '食药推销': 'Telemarketing',
        '推销': 'Telemarketing',
    };

    // Retain queryPhoneInfo and sendRequest for consistency, although HTTP is done in Flutter
    function queryPhoneInfo(phoneNumber, externalRequestId) {
        const phoneRequestId = Math.random().toString(36).substring(2);
        console.log(`queryPhoneInfo: phone=${phoneNumber}, externalRequestId=${externalRequestId}, phoneRequestId=${phoneRequestId}`);

        // In this revised approach, this function primarily serves to trigger the process
        // and doesn't actually send an HTTP request from JS.
        // The actual HTTP request is initiated from Flutter.

        // We need a way to tell Flutter to initiate the HTTP request
        // and then pass the response back to handleResponse.
        // This requires a new mechanism or reusing an existing channel.
        // Let's assume Flutter calls generateOutput directly with the response
        // or calls handleResponse directly with the response.

        // Based on your original code structure, Flutter calls generateOutput,
        // which *then* calls queryPhoneInfo, which *then* calls sendRequest.
        // sendRequest then calls the Flutter handler to *make* the HTTP request.
        // Flutter receives the response and calls handleResponse in JS.
        // This circular dependency seems overly complex.

        // Let's simplify: Flutter makes the HTTP request directly.
        // Flutter receives the response.
        // Flutter then calls a JS function (e.g., handlePageHtml)
        // in the loaded WebView, passing the HTML content.
        // The JS function then parses this HTML content.

        // So, we remove the HTTP related functions from JS and modify generateOutput.
        // Flutter will call generateOutput with the HTML content and request details.
    }

     // Removed sendRequest

    // handleResponse 函数 (JavaScript) - 接收完整的响应对象，并在其中解析 HTML
    // Flutter will call this function directly with the response data.
    function handleResponse(response) {
        console.log('handleResponse called with:', response);

        if (response.status >= 200 && response.status < 300) {
            const htmlContent = response.responseText; // Get the HTML content

            // 使用 DOMParser 解析接收到的 HTML 内容
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');

            // 在解析后的文档中查找和提取数据
            try {
                const result = parseResponse(doc, response.phoneNumber); // Pass the parsed document
                sendResultToFlutter('pluginResult', result, response.externalRequestId, response.phoneRequestId);
            } catch (e) {
                console.error('Error parsing HTML content in handleResponse:', e);
                sendResultToFlutter('pluginError', { error: `Error parsing HTML content: ${e.message}` }, response.externalRequestId, response.phoneRequestId);
            }

        } else {
            // 处理非成功状态码
            sendResultToFlutter('pluginError', { error: response.statusText }, response.externalRequestId, response.phoneRequestId);
        }
    }


    // parseResponse 函数 (接收 document 对象)
    function parseResponse(document, phoneNumber) {
        return extractDataFromDOM(document, phoneNumber);
    }

    // extractDataFromDOM 函数 (从 document 查找元素)
    function extractDataFromDOM(document, phoneNumber) {
        const jsonObject = {
            count: 0,
            sourceLabel: "",
            province: "",
            city: "",
            carrier: "unknown",
            phoneNumber: phoneNumber,
            predefinedLabel: ""
        };

        try {
            // 直接在 document 中查找元素
            const reportWrapper = document.querySelector('.comp-report');
            console.log('Found .comp-report element:', reportWrapper);

            if (reportWrapper) {
                const reportNameElement = reportWrapper.querySelector('.report-name');
                 console.log('Found .report-name element:', reportNameElement);
                if (reportNameElement) {
                    jsonObject.sourceLabel = decodeQuotedPrintable(reportNameElement.textContent.trim());
                     console.log('Extracted sourceLabel:', jsonObject.sourceLabel);
                }

                const reportTypeElement = reportWrapper.querySelector('.report-type');
                 console.log('Found .report-type element:', reportTypeElement);
                if (reportTypeElement) {
                    const reportTypeText = decodeQuotedPrintable(reportTypeElement.textContent.trim());
                    console.log('Extracted reportTypeText:', reportTypeText);
                    if (reportTypeText === '用户标记') {
                        jsonObject.count = 1;
                         console.log('Set count to 1');
                    }
                }
            }
            const locationElement = document.querySelector('.tel-info .location'); // More specific selector
            console.log('Found .tel-info .location element:', locationElement);
            if (locationElement) {
                const locationText = decodeQuotedPrintable(locationElement.textContent.trim());
                 console.log('Extracted locationText:', locationText);
                const match = locationText.match(/([\u4e00-\u9fa5]+)[\s ]*([\u4e00-\u9fa5]+)?/);
                if (match) {
                    jsonObject.province = match[1] || '';
                    jsonObject.city = match[2] || '';
                     console.log('Extracted province:', jsonObject.province);
                     console.log('Extracted city:', jsonObject.city);
                }
            }

            if (jsonObject.sourceLabel && manualMapping[jsonObject.sourceLabel]) {
                jsonObject.predefinedLabel = manualMapping[jsonObject.sourceLabel];
            } else {
                jsonObject.predefinedLabel = 'Unknown';
            }
             console.log('Set predefinedLabel:', jsonObject.predefinedLabel);

        } catch (error) {
            console.error('Error extracting data:', error);
        }

        return jsonObject;
    }

    function decodeQuotedPrintable(str) {
        str = str.replace(/=3D/g, "=");
        str = str.replace(/=([0-9A-Fa-f]{2})/g, function (match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
        });
        str = str.replace(/=\r?\n/g, '');
        return str;
    }

    // Modified generateOutput function - Flutter calls handleResponse directly with the response
    // This generateOutput might not be directly used in the new flow, but keep for potential future use or testing
    async function generateOutput(phoneNumber, nationalNumber, e164Number, requestId) {
         console.log('generateOutput called with:', phoneNumber, requestId);
         // This function's role is now replaced by Flutter calling handleResponse directly.
         // You might keep it for testing purposes or a different workflow.
    }


    function sendResultToFlutter(type, data, externalRequestId, phoneRequestId) {
        const resultMessage = {
            type: type,
            pluginId: pluginId,
            requestId: phoneRequestId,
            data: data,
            externalRequestId: externalRequestId,
        };
        console.log('Sending result to Flutter:', resultMessage);
        if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify(resultMessage));
        } else {
            console.error("flutter_inappwebview is undefined");
        }
    }

    async function initializePlugin() {
        window.plugin = {};
        const thisPlugin = {
            id: pluginInfo.info.id,
            pluginId: pluginId,
            version: pluginInfo.info.version,
            // generateOutput: generateOutput, // Removed from here
            handleResponse: handleResponse, // Expose handleResponse
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

    initializePlugin();
})();
