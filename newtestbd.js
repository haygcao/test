(function () { 
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
            id: 'baiPhoneNumberPlugin',
            name: 'bai',
            version: '1.52.0',
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

    // 修改的 handleResponse 函数 - 正确处理完整HTML
    function handleResponse(response) {
        console.log('handleResponse called with:', response);

        if (response.status >= 200 && response.status < 300) {
            // 直接替换整个document内容，包括head和body
            document.open();
            document.write(response.responseText);
            document.close();

            // 使用 MutationObserver 等待页面内容加载完成
            const observer = new MutationObserver((mutationsList, observer) => {
                // 检查是否有Shadow DOM宿主元素
                const shadowHost = document.querySelector('#__hcfy__');
                
                if (shadowHost) {
                    // 检查Shadow DOM是否已加载
                    if (shadowHost.shadowRoot) {
                        const targetElement = shadowHost.shadowRoot.querySelector('.report-wrapper');
                        
                        if (targetElement && targetElement.textContent.trim() !== "") {
                            observer.disconnect();
                            let result = parseResponse(shadowHost.shadowRoot, response.phoneNumber);
                            sendResultToFlutter('pluginResult', result, response.externalRequestId);
                            return;
                        }
                    }
                } else {
                    // 检查普通DOM元素
                    const reportWrapper = document.querySelector('.report-wrapper');
                    if (reportWrapper && reportWrapper.textContent.trim() !== "") {
                        observer.disconnect();
                        let result = parseResponse(document, response.phoneNumber);
                        sendResultToFlutter('pluginResult', result, response.externalRequestId);
                        return;
                    }
                }
            });

            const config = { childList: true, subtree: true, characterData: true, attributes: true };
            observer.observe(document.body, config);

            // 设置超时，防止无限等待
            setTimeout(() => {
                observer.disconnect();
                let result = parseResponse(document, response.phoneNumber);
                sendResultToFlutter('pluginResult', result, response.externalRequestId);
            }, 10000); // 10秒超时

        } else {
            sendResultToFlutter('pluginError', { error: response.statusText }, response.externalRequestId);
        }
    }

    // parseResponse 函数 - 支持Shadow DOM和普通DOM
    function parseResponse(documentOrShadowRoot, phoneNumber) {
        return extractDataFromDOM(documentOrShadowRoot, phoneNumber);
    }

    // extractDataFromDOM 函数 - 统一的数据提取逻辑
    function extractDataFromDOM(documentOrShadowRoot, phoneNumber) {
        const jsonObject = {
            count: 0,
            sourceLabel: "",
            province: "",
            city: "",
            carrier: "unknown",
            phoneNumber: phoneNumber
        };

        try {
            // 查找报告包装器
            const reportWrapper = documentOrShadowRoot.querySelector('.report-wrapper');

            if (reportWrapper) {
                const reportNameElement = reportWrapper.querySelector('.report-name');
                if (reportNameElement) {
                    jsonObject.sourceLabel = decodeQuotedPrintable(reportNameElement.textContent.trim());
                }

                const reportTypeElement = reportWrapper.querySelector('.report-type');
                if (reportTypeElement) {
                    const reportTypeText = decodeQuotedPrintable(reportTypeElement.textContent.trim());
                    if (reportTypeText === '用户标记') {
                        jsonObject.count = 1;
                    }
                }
            }

            // 查找位置元素
            const locationElement = documentOrShadowRoot.querySelector('.location');
            if (locationElement) {
                const locationText = decodeQuotedPrintable(locationElement.textContent.trim());
                const match = locationText.match(/([\u4e00-\u9fa5]+)[\s ]*([\u4e00-\u9fa5]+)?/);
                if (match) {
                    jsonObject.province = match[1] || '';
                    jsonObject.city = match[2] || '';
                }
            }

            // 映射标签
            if (jsonObject.sourceLabel && manualMapping[jsonObject.sourceLabel]) {
                jsonObject.predefinedLabel = manualMapping[jsonObject.sourceLabel];
            } else {
                jsonObject.predefinedLabel = 'Unknown';
            }

        } catch (error) {
            console.error('Error extracting data:', error);
        }

        console.log('Extracted data:', jsonObject);
        return jsonObject;
    }

    // Quoted-Printable 解码函数
    function decodeQuotedPrintable(str) {
        str = str.replace(/=3D/g, "=");
        str = str.replace(/=([0-9A-Fa-f]{2})/g, function (match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
        });
        str = str.replace(/=\r?\n/g, '');
        return str;
    }

    // 发送结果到Flutter
    function sendResultToFlutter(type, data, externalRequestId) {
        const message = {
            type: type,
            pluginId: pluginId,
            requestId: externalRequestId,
            data: data
        };

        if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify(message));
        } else {
            console.error("flutter_inappwebview is undefined");
        }
    }

    // generateOutput function
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
