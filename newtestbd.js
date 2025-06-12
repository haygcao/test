(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
            id: 'baiPhoneNumberPlugin',
            name: 'bai',
            version: '1.6.0',
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

    // 增强版 Quoted-Printable 解码函数
    function decodeQuotedPrintable(str) {
        if (!str) return '';
        
        // 首先处理HTML实体
        str = str.replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&amp;/g, '&')
                 .replace(/&quot;/g, '"')
                 .replace(/&#x27;/g, "'");
        
        // 处理 =3D 为 =
        str = str.replace(/=3D/g, "=");
        
        // 处理UTF-8编码的字符（如 =E5=95=86 -> 商）
        str = str.replace(/=([0-9A-Fa-f]{2})/g, function (match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
        });
        
        // 移除软换行符
        str = str.replace(/=\r?\n/g, '');
        
        return str;
    }

    // 处理MHTML内容
    function processMHTMLContent(htmlContent) {
        console.log('Processing MHTML content...');
        
        // 创建临时DOM来处理内容
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // 递归处理所有文本节点
        function processTextNodes(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                node.textContent = decodeQuotedPrintable(node.textContent);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // 处理属性
                for (let attr of node.attributes || []) {
                    attr.value = decodeQuotedPrintable(attr.value);
                }
                // 递归处理子节点
                for (let child of node.childNodes) {
                    processTextNodes(child);
                }
            }
        }
        
        processTextNodes(tempDiv);
        return tempDiv.innerHTML;
    }

    // 改进的等待元素函数
    function waitForElement(selector, root = document, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = root.querySelector(selector);
            if (element && element.textContent.trim() !== '') {
                resolve(element);
                return;
            }

            let timeoutId;
            const observer = new MutationObserver((mutations) => {
                const element = root.querySelector(selector);
                if (element && element.textContent.trim() !== '') {
                    clearTimeout(timeoutId);
                    observer.disconnect();
                    resolve(element);
                }
            });

            timeoutId = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);

            observer.observe(root, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true
            });
        });
    }

    // 查询电话信息
    function queryPhoneInfo(phoneNumber, externalRequestId) {
        const phoneRequestId = Math.random().toString(36).substring(2);
        console.log(`queryPhoneInfo: phone=${phoneNumber}, externalRequestId=${externalRequestId}, phoneRequestId=${phoneRequestId}`);

        const url = `https://www.baidu.com/s?wd=${phoneNumber}`;
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

    // 处理响应的主函数
    async function handleResponse(response) {
        console.log('handleResponse called with:', response);

        if (response.status >= 200 && response.status < 300) {
            try {
                // 先处理MHTML内容
                const processedContent = processMHTMLContent(response.responseText);
                document.body.innerHTML = processedContent;
                
                console.log('Processed content set to document body');

                // 等待Shadow DOM宿主元素出现
                try {
                    await waitForElement('#__hcfy__', document, 15000);
                    console.log('Shadow DOM host found');
                    
                    const shadowHost = document.querySelector('#__hcfy__');
                    if (shadowHost && shadowHost.shadowRoot) {
                        console.log('Shadow root found, waiting for content...');
                        
                        // 等待Shadow DOM内容加载
                        try {
                            await waitForElement('.report-wrapper', shadowHost.shadowRoot, 15000);
                            console.log('Report wrapper found in shadow DOM');
                            
                            const result = parseResponse(shadowHost.shadowRoot, response.phoneNumber);
                            console.log('Parsed result:', result);
                            
                            // 添加预定义标签映射
                            if (result.sourceLabel && manualMapping[result.sourceLabel]) {
                                result.predefinedLabel = manualMapping[result.sourceLabel];
                            } else {
                                result.predefinedLabel = 'Unknown';
                            }
                            
                            sendResultToFlutter('pluginResult', result, response.externalRequestId);
                            
                        } catch (error) {
                            console.log('Report wrapper not found in shadow DOM, trying direct parse...');
                            // 尝试直接解析整个shadowRoot
                            const result = parseResponse(shadowHost.shadowRoot, response.phoneNumber);
                            sendResultToFlutter('pluginResult', result, response.externalRequestId);
                        }
                        
                    } else {
                        console.log('Shadow root not found, trying direct document parse...');
                        // 如果没有Shadow DOM，直接解析document
                        const result = parseResponse(document, response.phoneNumber);
                        sendResultToFlutter('pluginResult', result, response.externalRequestId);
                    }
                    
                } catch (error) {
                    console.log('Shadow DOM host not found, trying direct document parse...', error);
                    // 如果找不到Shadow DOM，直接解析document
                    const result = parseResponse(document, response.phoneNumber);
                    sendResultToFlutter('pluginResult', result, response.externalRequestId);
                }
                
            } catch (error) {
                console.error('Error processing response:', error);
                sendResultToFlutter('pluginError', { error: error.message }, response.externalRequestId);
            }
        } else {
            sendResultToFlutter('pluginError', { error: response.statusText }, response.externalRequestId);
        }
    }

    // 解析响应
    function parseResponse(root, phoneNumber) {
        return extractDataFromDOM(root, phoneNumber);
    }

    // 从DOM中提取数据
    function extractDataFromDOM(root, phoneNumber) {
        const jsonObject = {
            count: 0,
            sourceLabel: "",
            province: "",
            city: "",
            carrier: "unknown",
            phoneNumber: phoneNumber,
            name: ""
        };

        try {
            console.log('Extracting data from DOM...');
            
            // 多种选择器尝试
            const selectors = [
                '.report-wrapper',
                '[class*="report"]',
                '[class*="wrapper"]',
                '.c-row',
                '[class*="title"]'
            ];
            
            let reportWrapper = null;
            for (const selector of selectors) {
                reportWrapper = root.querySelector(selector);
                if (reportWrapper) {
                    console.log(`Found element with selector: ${selector}`);
                    break;
                }
            }

            if (reportWrapper) {
                // 提取标记信息
                const reportNameSelectors = [
                    '.report-name',
                    '[class*="name"]',
                    '[class*="title"]'
                ];
                
                for (const selector of reportNameSelectors) {
                    const element = reportWrapper.querySelector(selector);
                    if (element && element.textContent.trim()) {
                        jsonObject.sourceLabel = decodeQuotedPrintable(element.textContent.trim());
                        console.log(`Found sourceLabel: ${jsonObject.sourceLabel}`);
                        break;
                    }
                }

                // 检查是否为用户标记
                const reportTypeSelectors = [
                    '.report-type',
                    '[class*="type"]',
                    '[class*="marker"]'
                ];
                
                for (const selector of reportTypeSelectors) {
                    const element = reportWrapper.querySelector(selector);
                    if (element) {
                        const reportTypeText = decodeQuotedPrintable(element.textContent.trim());
                        console.log(`Found reportType: ${reportTypeText}`);
                        if (reportTypeText.includes('用户标记') || reportTypeText.includes('标记')) {
                            jsonObject.count = 1;
                        }
                        break;
                    }
                }
            }

            // 提取位置信息
            const locationSelectors = [
                '.location',
                '[class*="location"]',
                '[class*="address"]',
                '.c-row'
            ];
            
            for (const selector of locationSelectors) {
                const elements = root.querySelectorAll(selector);
                for (const element of elements) {
                    const locationText = decodeQuotedPrintable(element.textContent.trim());
                    console.log(`Checking location text: ${locationText}`);
                    
                    // 匹配中文地名
                    const match = locationText.match(/([\u4e00-\u9fa5]{2,})[\s\u00A0]*([\u4e00-\u9fa5]{2,})?/);
                    if (match) {
                        jsonObject.province = match[1] || '';
                        jsonObject.city = match[2] || '';
                        console.log(`Found location: ${jsonObject.province} ${jsonObject.city}`);
                        break;
                    }
                }
                if (jsonObject.province) break;
            }

            // 如果没有找到具体信息，尝试从整个root中提取
            if (!jsonObject.sourceLabel && !jsonObject.province) {
                console.log('Trying to extract from entire root content...');
                const allText = root.textContent || '';
                const decodedText = decodeQuotedPrintable(allText);
                console.log('Decoded text sample:', decodedText.substring(0, 500));
                
                // 尝试匹配常见标记词汇
                const markingWords = ['诈骗', '骚扰', '推销', '广告', '中介', '快递', '外卖', '保险', '贷款'];
                for (const word of markingWords) {
                    if (decodedText.includes(word)) {
                        jsonObject.sourceLabel = word;
                        jsonObject.count = 1;
                        break;
                    }
                }
                
                // 尝试匹配地名
                const locationMatch = decodedText.match(/([\u4e00-\u9fa5]{2,}省|[\u4e00-\u9fa5]{2,}市|[\u4e00-\u9fa5]{2,}区)/g);
                if (locationMatch && locationMatch.length > 0) {
                    jsonObject.province = locationMatch[0];
                    if (locationMatch.length > 1) {
                        jsonObject.city = locationMatch[1];
                    }
                }
            }

        } catch (error) {
            console.error('Error extracting data:', error);
        }

        console.log('Final extracted data:', jsonObject);
        return jsonObject;
    }

    // generateOutput函数
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

    // 初始化插件
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

    // 初始化插件
    initializePlugin();
})();
