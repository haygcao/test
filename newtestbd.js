(function () {
    if (window.plugin) return;

    const pluginId = 'bdPlugin';

    const pluginInfo = {
        info: {
            id: 'baiPhoneNumberPlugin',
            name: 'bai',
            version: '1.7.0',
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

    function queryPhoneInfo(phoneNumber, externalRequestId) {
        const phoneRequestId = Math.random().toString(36).substring(2);
        console.log(`queryPhoneInfo: phone=${phoneNumber}, externalRequestId=${externalRequestId}, phoneRequestId=${phoneRequestId}`);

        const url = `https://haoma.baidu.com/phoneSearch?search=${phoneNumber}&srcid=8757`;
        const method = 'GET';
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            'Referer': 'https://www.baidu.com/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Connection': 'keep-alive',
        };
        const body = null;

        sendRequest(url, method, headers, body, externalRequestId, phoneRequestId);
    }

    function sendRequest(url, method, headers, body, externalRequestId, phoneRequestId) {
        const requestData = {
            url: url,
            method: method,
            headers: headers,
            body: body,
            externalRequestId: externalRequestId,
            phoneRequestId: phoneRequestId,
            pluginId: pluginId,
        };

        if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler('RequestChannel', JSON.stringify(requestData));
        } else {
            console.error("flutter_inappwebview is undefined");
        }
    }

    // handleResponse 函数 (JavaScript) - 针对实际 HTML 结构
    function handleResponse(response) {
        console.log('handleResponse called with:', response);

        if (response.status >= 200 && response.status < 300) {
            // 将完整的 HTML 内容设置到 WebView 的文档中
            document.open();
            document.write(response.responseText);
            document.close();

            // 直接解析 HTML 内容
            // 添加一个小的延迟，确保 DOM 树完全构建
            setTimeout(() => {
                 try {
                    const result = parseResponse(document, response.phoneNumber); // 直接传入 document
                    sendResultToFlutter('pluginResult', result, response.externalRequestId, response.phoneRequestId);
                 } catch (e) {
                     console.error('Error parsing response in handleResponse:', e);
                     sendResultToFlutter('pluginError', { error: `Error parsing response: ${e.message}` }, response.externalRequestId, response.phoneRequestId);
                 }
            }, 100); // 延迟 100 毫秒

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
            const reportWrapper = document.querySelector('.comp-report'); // Changed selector to '.comp-report'
            console.log('Found .comp-report element:', reportWrapper); // Debugging line

            if (reportWrapper) {
                const reportNameElement = reportWrapper.querySelector('.report-name');
                 console.log('Found .report-name element:', reportNameElement); // Debugging line
                if (reportNameElement) {
                    jsonObject.sourceLabel = decodeQuotedPrintable(reportNameElement.textContent.trim());
                     console.log('Extracted sourceLabel:', jsonObject.sourceLabel); // Debugging line
                }

                const reportTypeElement = reportWrapper.querySelector('.report-type');
                 console.log('Found .report-type element:', reportTypeElement); // Debugging line
                if (reportTypeElement) {
                    const reportTypeText = decodeQuotedPrintable(reportTypeElement.textContent.trim());
                    console.log('Extracted reportTypeText:', reportTypeText); // Debugging line
                    if (reportTypeText === '用户标记') {
                        jsonObject.count = 1;
                         console.log('Set count to 1'); // Debugging line
                    }
                }
            }
            const locationElement = document.querySelector('.location'); // Changed selector to '.location'
            console.log('Found .location element:', locationElement); // Debugging line
            if (locationElement) {
                const locationText = decodeQuotedPrintable(locationElement.textContent.trim());
                 console.log('Extracted locationText:', locationText); // Debugging line
                const match = locationText.match(/([\u4e00-\u9fa5]+)[\s ]*([\u4e00-\u9fa5]+)?/);
                if (match) {
                    jsonObject.province = match[1] || '';
                    jsonObject.city = match[2] || '';
                     console.log('Extracted province:', jsonObject.province); // Debugging line
                     console.log('Extracted city:', jsonObject.city); // Debugging line
                }
            }

            if (jsonObject.sourceLabel && manualMapping[jsonObject.sourceLabel]) {
                jsonObject.predefinedLabel = manualMapping[jsonObject.sourceLabel];
            } else {
                jsonObject.predefinedLabel = 'Unknown';
            }
             console.log('Set predefinedLabel:', jsonObject.predefinedLabel); // Debugging line

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

    async function generateOutput(phoneNumber, nationalNumber, e164Number, externalRequestId) {
        console.log('generateOutput called with:', phoneNumber, externalRequestId);

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

    initializePlugin();
})();
