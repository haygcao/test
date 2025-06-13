(function () { 
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
            id: 'baiPhoneNumberPlugin',
            name: 'bai',
            version: '1.55.0',
            description: 'This is a plugin template.',
            author: 'Your Name',
        },
    };

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

    // 存储待处理的请求
    let pendingRequests = new Map();

    // 直接导航到百度页面
    function queryPhoneInfo(phoneNumber, externalRequestId) {
        const phoneRequestId = Math.random().toString(36).substring(2);
        console.log(`queryPhoneInfo: phone=${phoneNumber}, externalRequestId=${externalRequestId}, phoneRequestId=${phoneRequestId}`);

        // 存储请求信息，用于页面加载完成后处理
        pendingRequests.set(phoneRequestId, {
            phoneNumber: phoneNumber,
            externalRequestId: externalRequestId,
            phoneRequestId: phoneRequestId
        });

        const url = `https://haoma.baidu.com/phoneSearch?search=${phoneNumber}&srcid=8757`;
        
        // 通知 Flutter 导航到百度页面
        const navigationData = {
            action: 'navigate',
            url: url,
            phoneRequestId: phoneRequestId,
            pluginId: pluginId,
        };

        if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler('NavigationChannel', JSON.stringify(navigationData));
        } else {
            console.error("flutter_inappwebview is undefined");
        }
    }

    // 页面加载完成后的处理函数
    function handlePageLoaded(phoneRequestId) {
        console.log('handlePageLoaded called with phoneRequestId:', phoneRequestId);
        
        const requestInfo = pendingRequests.get(phoneRequestId);
        if (!requestInfo) {
            console.error('Request info not found for phoneRequestId:', phoneRequestId);
            return;
        }

        // 等待页面完全加载和JavaScript执行
        setTimeout(() => {
            try {
                const result = extractDataFromCurrentPage(requestInfo.phoneNumber);
                sendResultToFlutter('pluginResult', result, requestInfo.externalRequestId);
                pendingRequests.delete(phoneRequestId);
            } catch (error) {
                console.error('Error extracting data:', error);
                sendResultToFlutter('pluginError', { error: error.message }, requestInfo.externalRequestId);
                pendingRequests.delete(phoneRequestId);
            }
        }, 3000); // 等待3秒让页面完全加载
    }

    // 从当前页面提取数据（这时我们已经在百度的真实页面上了）
    function extractDataFromCurrentPage(phoneNumber) {
        const jsonObject = {
            count: 0,
            sourceLabel: "",
            province: "",
            city: "",
            carrier: "unknown",
            phoneNumber: phoneNumber
        };

        try {
            // 首先尝试从普通DOM中查找
            let reportWrapper = document.querySelector('.report-wrapper');
            
            // 如果普通DOM中找不到，尝试查找Shadow DOM
            if (!reportWrapper) {
                const shadowHost = document.querySelector('#__hcfy__');
                if (shadowHost && shadowHost.shadowRoot) {
                    reportWrapper = shadowHost.shadowRoot.querySelector('.report-wrapper');
                    console.log('Found reportWrapper in shadow DOM');
                }
            }

            if (reportWrapper) {
                const reportNameElement = reportWrapper.querySelector('.report-name');
                if (reportNameElement) {
                    jsonObject.sourceLabel = decodeQuotedPrintable(reportNameElement.textContent.trim());
                    console.log('Found sourceLabel:', jsonObject.sourceLabel);
                }

                const reportTypeElement = reportWrapper.querySelector('.report-type');
                if (reportTypeElement) {
                    const reportTypeText = decodeQuotedPrintable(reportTypeElement.textContent.trim());
                    if (reportTypeText === '用户标记') {
                        jsonObject.count = 1;
                    }
                    console.log('Found reportType:', reportTypeText);
                }
            }

            // 查找位置信息
            let locationElement = document.querySelector('.location');
            if (!locationElement) {
                const shadowHost = document.querySelector('#__hcfy__');
                if (shadowHost && shadowHost.shadowRoot) {
                    locationElement = shadowHost.shadowRoot.querySelector('.location');
                }
            }

            if (locationElement) {
                const locationText = decodeQuotedPrintable(locationElement.textContent.trim());
                const match = locationText.match(/([\u4e00-\u9fa5]+)[\s ]*([\u4e00-\u9fa5]+)?/);
                if (match) {
                    jsonObject.province = match[1] || '';
                    jsonObject.city = match[2] || '';
                    console.log('Found location:', jsonObject.province, jsonObject.city);
                }
            }

            // 映射标签
            if (jsonObject.sourceLabel && manualMapping[jsonObject.sourceLabel]) {
                jsonObject.predefinedLabel = manualMapping[jsonObject.sourceLabel];
            } else {
                jsonObject.predefinedLabel = 'Unknown';
            }

        } catch (error) {
            console.error('Error extracting data from current page:', error);
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
            handlePageLoaded: handlePageLoaded, // 新增的函数
            extractDataFromCurrentPage: extractDataFromCurrentPage, // 导出供外部调用
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
