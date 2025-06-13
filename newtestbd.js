(function () { 
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
            id: 'baiPhoneNumberPlugin',
            name: 'bai',
            version: '1.30.0',
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
        '商业营销': 'Telemarketing', // 添加从示例中看到的标签
    };

    // 存储待处理的请求
    const pendingRequests = new Map();

    function queryPhoneInfo(phoneNumber, externalRequestId) {
        const phoneRequestId = Math.random().toString(36).substring(2);
        console.log(`queryPhoneInfo: phone=${phoneNumber}, externalRequestId=${externalRequestId}, phoneRequestId=${phoneRequestId}`);

        // 存储请求信息，用于后续处理响应
        pendingRequests.set(phoneRequestId, {
            phoneNumber: phoneNumber,
            externalRequestId: externalRequestId,
            timestamp: Date.now()
        });

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

    // 改进的响应处理函数
    function handleResponse(response) {
        console.log('handleResponse called with:', response);
        
        const requestInfo = pendingRequests.get(response.phoneRequestId);
        if (!requestInfo) {
            console.error('No pending request found for phoneRequestId:', response.phoneRequestId);
            return;
        }

        const phoneNumber = requestInfo.phoneNumber;
        const externalRequestId = requestInfo.externalRequestId;

        if (response.status >= 200 && response.status < 300) {
            // 清空当前页面内容并插入新的HTML
            document.documentElement.innerHTML = response.responseText;
            
            console.log('HTML content loaded, waiting for dynamic content...');
            
            // 使用更强大的等待策略
            waitForContentToLoad(phoneNumber, externalRequestId, response.phoneRequestId);
            
        } else {
            console.error('HTTP Error:', response.status, response.statusText);
            sendResultToFlutter('pluginError', { 
                error: `HTTP ${response.status}: ${response.statusText}` 
            }, externalRequestId);
            pendingRequests.delete(response.phoneRequestId);
        }
    }

    // 等待内容加载的函数
    function waitForContentToLoad(phoneNumber, externalRequestId, phoneRequestId, attempt = 0) {
        const maxAttempts = 50; // 最多等待10秒 (50 * 200ms)
        const delay = 200; // 每次检查间隔200ms

        console.log(`Attempt ${attempt + 1}/${maxAttempts} to find content...`);

        // 尝试多种选择器来查找内容
        const selectors = [
            '.report-wrapper .report-name',
            '.comp-report .report-name', 
            '.tel-info .report-name',
            '[class*="report-name"]',
            '.report-wrapper',
            '.comp-report'
        ];

        let foundElement = null;
        let targetText = '';

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const text = element.textContent.trim();
                if (text && text !== '' && !text.includes('loading') && !text.includes('加载')) {
                    foundElement = element;
                    targetText = text;
                    console.log(`Found content with selector "${selector}": "${text}"`);
                    break;
                }
            }
            if (foundElement) break;
        }

        if (foundElement && targetText) {
            // 找到内容，开始解析
            console.log('Content found, parsing...');
            setTimeout(() => {
                const result = parseResponse(document, phoneNumber);
                sendResultToFlutter('pluginResult', result, externalRequestId);
                pendingRequests.delete(phoneRequestId);
            }, 100); // 稍微延迟确保所有内容都加载完成
            
        } else if (attempt < maxAttempts - 1) {
            // 继续等待
            setTimeout(() => {
                waitForContentToLoad(phoneNumber, externalRequestId, phoneRequestId, attempt + 1);
            }, delay);
            
        } else {
            // 超时，尝试解析现有内容或返回错误
            console.log('Timeout waiting for content, attempting to parse existing DOM...');
            const result = parseResponse(document, phoneNumber);
            
            if (result.sourceLabel || result.count > 0) {
                sendResultToFlutter('pluginResult', result, externalRequestId);
            } else {
                console.log('No meaningful content found after timeout');
                sendResultToFlutter('pluginError', { 
                    error: 'Timeout: Unable to load dynamic content' 
                }, externalRequestId);
            }
            pendingRequests.delete(phoneRequestId);
        }
    }

    // 改进的解析函数
    function parseResponse(doc, phoneNumber) {
        return extractDataFromDOM(doc, phoneNumber);
    }

    // 改进的数据提取函数
    function extractDataFromDOM(doc, phoneNumber) {
        const jsonObject = {
            count: 0,
            sourceLabel: "",
            predefinedLabel: "",
            province: "",
            city: "",
            carrier: "unknown",
            phoneNumber: phoneNumber,
            name: ""
        };

        try {
            console.log('Starting DOM extraction...');
            
            // 尝试多种方式查找报告包装器
            let reportWrapper = doc.querySelector('.report-wrapper');
            if (!reportWrapper) {
                reportWrapper = doc.querySelector('.comp-report');
            }
            if (!reportWrapper) {
                // 尝试更宽泛的查找
                const reportElements = doc.querySelectorAll('[class*="report"]');
                for (const element of reportElements) {
                    if (element.textContent.trim()) {
                        reportWrapper = element;
                        break;
                    }
                }
            }

            if (reportWrapper) {
                console.log('Found report wrapper');
                
                // 提取报告名称
                const reportNameSelectors = ['.report-name', '[class*="report-name"]'];
                for (const selector of reportNameSelectors) {
                    const reportNameElement = reportWrapper.querySelector(selector);
                    if (reportNameElement && reportNameElement.textContent.trim()) {
                        const sourceLabel = decodeQuotedPrintable(reportNameElement.textContent.trim());
                        jsonObject.sourceLabel = sourceLabel;
                        
                        // 映射到预定义标签
                        jsonObject.predefinedLabel = manualMapping[sourceLabel] || sourceLabel;
                        console.log(`Found source label: ${sourceLabel} -> ${jsonObject.predefinedLabel}`);
                        break;
                    }
                }

                // 提取报告类型
                const reportTypeSelectors = ['.report-type', '[class*="report-type"]'];
                for (const selector of reportTypeSelectors) {
                    const reportTypeElement = reportWrapper.querySelector(selector);
                    if (reportTypeElement && reportTypeElement.textContent.trim()) {
                        const reportTypeText = decodeQuotedPrintable(reportTypeElement.textContent.trim());
                        console.log(`Found report type: ${reportTypeText}`);
                        if (reportTypeText === '用户标记' || reportTypeText.includes('标记')) {
                            jsonObject.count = 1;
                        }
                        break;
                    }
                }
            } else {
                console.log('Report wrapper not found, trying alternative methods...');
                
                // 尝试直接搜索关键文本
                const allElements = doc.querySelectorAll('*');
                for (const element of allElements) {
                    const text = element.textContent.trim();
                    if (text && Object.keys(manualMapping).some(key => text.includes(key))) {
                        console.log(`Found potential label in element: ${text}`);
                        for (const [chinese, english] of Object.entries(manualMapping)) {
                            if (text.includes(chinese)) {
                                jsonObject.sourceLabel = chinese;
                                jsonObject.predefinedLabel = english;
                                jsonObject.count = 1;
                                break;
                            }
                        }
                        break;
                    }
                }
            }

            // 提取位置信息
            const locationSelectors = ['.location', '[class*="location"]'];
            for (const selector of locationSelectors) {
                const locationElement = doc.querySelector(selector);
                if (locationElement && locationElement.textContent.trim()) {
                    const locationText = decodeQuotedPrintable(locationElement.textContent.trim());
                    console.log(`Found location: ${locationText}`);
                    const match = locationText.match(/([\u4e00-\u9fa5]+)[\s]+([\u4e00-\u9fa5]+)?/);
                    if (match) {
                        jsonObject.province = match[1] || '';
                        jsonObject.city = match[2] || '';
                    }
                    break;
                }
            }

            console.log('Extraction completed:', jsonObject);
            
        } catch (error) {
            console.error('Error extracting data:', error);
        }

        return jsonObject;
    }

    // Quoted-Printable 解码函数
    function decodeQuotedPrintable(str) {
        if (!str) return str;
        
        try {
            // 处理URL编码的中文字符
            str = str.replace(/%([0-9A-Fa-f]{2})/g, function(match, p1) {
                return String.fromCharCode(parseInt(p1, 16));
            });
            
            // 处理Quoted-Printable编码
            str = str.replace(/=([0-9A-Fa-f]{2})/g, function(match, p1) {
                return String.fromCharCode(parseInt(p1, 16));
            });
            
            str = str.replace(/=\r?\n/g, '');
            str = str.replace(/=3D/g, "=");
            
            return str;
        } catch (e) {
            console.error('Error decoding:', e);
            return str;
        }
    }

    // 发送结果到Flutter
    function sendResultToFlutter(type, data, externalRequestId) {
        const message = {
            type: type,
            pluginId: pluginId,
            requestId: externalRequestId,
            data: data
        };

        console.log('Sending result to Flutter:', message);

        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify(message));
        } else {
            console.error('flutter_inappwebview is not available');
        }
    }

    // generateOutput 函数
    async function generateOutput(phoneNumber, nationalNumber, e164Number, externalRequestId) {
        console.log('generateOutput called with:', phoneNumber, externalRequestId);

        // 清理超时的请求
        const now = Date.now();
        for (const [key, value] of pendingRequests.entries()) {
            if (now - value.timestamp > 30000) { // 30秒超时
                pendingRequests.delete(key);
            }
        }

        // 按优先级查询电话号码
        if (phoneNumber) {
            queryPhoneInfo(phoneNumber, externalRequestId);
        } else if (nationalNumber) {
            queryPhoneInfo(nationalNumber, externalRequestId);
        } else if (e164Number) {
            queryPhoneInfo(e164Number, externalRequestId);
        }
    }

    // 初始化插件
    async function initializePlugin() {
        console.log('Initializing plugin...');
        
        window.plugin = window.plugin || {};
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

    // 立即初始化插件
    initializePlugin();
})();
