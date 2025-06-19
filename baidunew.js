(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
            id: 'baiPhoneNumberPlugin',
            name: 'bai',
            version: '1.29.0',
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

    function sendResultToFlutter(channel, data, externalRequestId) {
        const resultData = {
            ...data,
            externalRequestId: externalRequestId,
            pluginId: pluginId,
        };

        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify({
                type: channel,
                data: resultData,
            }));
            console.log(`Sent ${channel} to Flutter:`, resultData);
        } else {
            console.error('flutter_inappwebview is not defined');
        }
    }

    // 安全地加载CSS资源
    function loadCSSFromHTML(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const head = doc.head;
        
        if (!head) return;
        
        // 只加载CSS文件，避免加载可能导致CORS问题的脚本
        const cssLinks = head.querySelectorAll('link[rel="stylesheet"]');
        const styleElements = head.querySelectorAll('style');
        
        cssLinks.forEach(link => {
            // 检查是否已存在相同的CSS链接
            const existing = document.querySelector(`link[href="${link.href}"]`);
            if (!existing && link.href && !link.href.includes('miao.baidu.com')) {
                try {
                    const newLink = document.createElement('link');
                    newLink.rel = 'stylesheet';
                    newLink.type = 'text/css';
                    newLink.href = link.href;
                    newLink.onerror = () => console.warn('Failed to load CSS:', link.href);
                    document.head.appendChild(newLink);
                    console.log('Loaded CSS:', link.href);
                } catch (error) {
                    console.warn('Error loading CSS:', error);
                }
            }
        });
        
        // 添加内联样式
        styleElements.forEach(style => {
            try {
                const newStyle = document.createElement('style');
                newStyle.textContent = style.textContent;
                document.head.appendChild(newStyle);
                console.log('Added inline CSS');
            } catch (error) {
                console.warn('Error adding inline CSS:', error);
            }
        });
    }

    // 安全地处理HTML内容，只提取DOM结构，不执行脚本
    function processHTMLSafely(htmlContent) {
        try {
            // 首先尝试加载CSS资源
            loadCSSFromHTML(htmlContent);
            
            // 移除所有可能导致问题的脚本标签和特定属性
            let cleanHTML = htmlContent
                // 移除script标签
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                // 移除inline事件处理器
                .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
                // 移除可能导致CORS问题的特定域名请求
                .replace(/https?:\/\/miao\.baidu\.com[^"'\s>]*/gi, '')
                // 移除document.write相关内容
                .replace(/document\.write[^;]*;?/gi, '');
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(cleanHTML, 'text/html');
            const body = doc.body;
            
            if (!body) {
                console.error('Failed to parse HTML body');
                return false;
            }
            
            // 清空当前body并添加新内容
            document.body.innerHTML = '';
            
            // 复制body属性
            Array.from(body.attributes).forEach(attr => {
                try {
                    document.body.setAttribute(attr.name, attr.value);
                } catch (error) {
                    console.warn('Error setting body attribute:', error);
                }
            });
            
            // 复制body内容
            Array.from(body.children).forEach(element => {
                try {
                    const clonedElement = element.cloneNode(true);
                    // 确保克隆的元素不包含事件处理器
                    removeEventHandlers(clonedElement);
                    document.body.appendChild(clonedElement);
                } catch (error) {
                    console.warn('Error adding body element:', error);
                }
            });
            
            console.log('HTML content processed safely');
            return true;
            
        } catch (error) {
            console.error('Error processing HTML:', error);
            return false;
        }
    }

    // 递归移除元素及其子元素的事件处理器
    function removeEventHandlers(element) {
        if (!element || !element.attributes) return;
        
        // 移除所有on*属性
        const attributes = Array.from(element.attributes);
        attributes.forEach(attr => {
            if (attr.name.toLowerCase().startsWith('on')) {
                element.removeAttribute(attr.name);
            }
        });
        
        // 递归处理子元素
        if (element.children) {
            Array.from(element.children).forEach(child => {
                removeEventHandlers(child);
            });
        }
    }

    // 等待DOM内容稳定
    function waitForContentStable(callback, maxWait = 8000) {
        let timeoutTimer = null;
        let stableTimer = null;
        let lastChangeTime = Date.now();
        const startTime = Date.now();
        
        const observer = new MutationObserver(() => {
            lastChangeTime = Date.now();
            
            // 清除之前的稳定计时器
            if (stableTimer) {
                clearTimeout(stableTimer);
            }
            
            // 设置新的稳定计时器
            stableTimer = setTimeout(() => {
                observer.disconnect();
                if (timeoutTimer) clearTimeout(timeoutTimer);
                callback(true);
            }, 2000); // 2秒内无变化则认为稳定
        });
        
        // 开始观察
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true
        });
        
        // 设置总超时
        timeoutTimer = setTimeout(() => {
            observer.disconnect();
            if (stableTimer) clearTimeout(stableTimer);
            console.log('Content stability check timed out');
            callback(false);
        }, maxWait);
        
        // 如果页面已经有内容，立即检查
        setTimeout(() => {
            const hasContent = document.body.children.length > 0;
            if (hasContent) {
                // 等待一小段时间看是否还有变化
                setTimeout(() => {
                    const currentTime = Date.now();
                    if (currentTime - lastChangeTime > 1000) {
                        observer.disconnect();
                        if (timeoutTimer) clearTimeout(timeoutTimer);
                        if (stableTimer) clearTimeout(stableTimer);
                        callback(true);
                    }
                }, 1500);
            }
        }, 500);
    }

    // 修改后的handleResponse函数
    function handleResponse(response) {
        console.log('handleResponse called with:', response);

        if (response.status >= 200 && response.status < 300) {
            // 安全地处理HTML内容
            const success = processHTMLSafely(response.responseText);
            
            if (!success) {
                sendResultToFlutter('pluginError', { error: 'Failed to process HTML content safely' }, response.externalRequestId);
                return;
            }
            
            // 等待内容稳定后开始数据提取
            waitForContentStable((stable) => {
                if (!stable) {
                    console.warn('Content may not be fully stable, proceeding anyway');
                }
                
                // 开始数据提取
                startDataExtraction(response.phoneNumber, response.externalRequestId);
            });
            
        } else {
            sendResultToFlutter('pluginError', { error: response.statusText }, response.externalRequestId);
        }
    }

    // 数据提取逻辑
    function startDataExtraction(phoneNumber, externalRequestId) {
        console.log('Starting data extraction for phone:', phoneNumber);
        
        // 给DOM一些时间来完成渲染
        setTimeout(() => {
            try {
                // 首先尝试直接从DOM提取数据
                let result = extractDataFromRegularDOM(document, phoneNumber);
                
                // 如果没有找到数据，尝试查找Shadow DOM
                if (!result.sourceLabel && !result.province) {
                    const shadowHost = document.querySelector('#__hcfy__');
                    if (shadowHost && shadowHost.shadowRoot) {
                        result = extractDataFromRegularDOM(shadowHost.shadowRoot, phoneNumber);
                    }
                }
                
                // 如果仍然没有数据，尝试其他常见的选择器
                if (!result.sourceLabel && !result.province) {
                    result = tryAlternativeSelectors(document, phoneNumber);
                }
                
                processAndSendResult(result, externalRequestId);
                
            } catch (error) {
                console.error('Error in data extraction:', error);
                sendResultToFlutter('pluginError', { error: 'Data extraction failed: ' + error.message }, externalRequestId);
            }
        }, 1000);
    }

    // 尝试其他可能的选择器
    function tryAlternativeSelectors(doc, phoneNumber) {
        const result = {
            phoneNumber: phoneNumber,
            sourceLabel: '',
            count: 0,
            province: '',
            city: '',
            carrier: '',
            name: '',
            rate: 0,
            predefinedLabel: '',
            pluginId: pluginId
        };
        
        try {
            // 尝试更多可能的选择器
            const possibleSelectors = [
                '.report-wrapper .report-name',
                '.phone-info .label',
                '.tag-content',
                '.phone-tag',
                '[class*="report"]',
                '[class*="tag"]',
                '[class*="label"]'
            ];
            
            for (const selector of possibleSelectors) {
                const element = doc.querySelector(selector);
                if (element && element.textContent.trim()) {
                    result.sourceLabel = element.textContent.trim();
                    result.count = 1;
                    break;
                }
            }
            
            // 尝试提取地理位置信息
            const locationSelectors = [
                '.location',
                '.phone-location',
                '.area-info',
                '[class*="location"]',
                '[class*="area"]'
            ];
            
            for (const selector of locationSelectors) {
                const element = doc.querySelector(selector);
                if (element && element.textContent.trim()) {
                    const locationText = element.textContent.trim();
                    const match = locationText.match(/([一-龥]+)[\s ]*([一-龥]+)?/);
                    if (match) {
                        result.province = match[1] || '';
                        result.city = match[2] || '';
                        break;
                    }
                }
            }
            
        } catch (error) {
            console.error('Error in alternative selector extraction:', error);
        }
        
        return result;
    }

    function processAndSendResult(result, externalRequestId) {
        const finalResult = {
            phoneNumber: result.phoneNumber || '',
            sourceLabel: result.sourceLabel || '',
            count: result.count || 0,
            province: result.province || '',
            city: result.city || '',
            carrier: result.carrier || '',
            name: result.name || '',
            rate: result.rate || 0,
            predefinedLabel: '',
            pluginId: pluginId
        };
        
        if (finalResult.sourceLabel && manualMapping[finalResult.sourceLabel]) {
            finalResult.predefinedLabel = manualMapping[finalResult.sourceLabel];
        }
        
        console.log('Sending result to Flutter:', finalResult);
        sendResultToFlutter('pluginResult', finalResult, externalRequestId);
    }

    function parseResponse(shadowRoot, phoneNumber) {
        return extractDataFromRegularDOM(shadowRoot, phoneNumber);
    }

    function extractDataFromRegularDOM(document, phoneNumber) {
        console.log('extractDataFromRegularDOM called with document:', document);
        
        let result = {
            phoneNumber: phoneNumber,
            sourceLabel: '',
            count: 0,
            province: '',
            city: '',
            carrier: '',
            name: '',
            rate: 0,
            predefinedLabel: '',
            pluginId: pluginId
        };

        try {
            const reportWrapper = document.querySelector('.report-wrapper');
            if (reportWrapper) {
                const reportNameElement = reportWrapper.querySelector('.report-name');
                if (reportNameElement) {
                    result.sourceLabel = reportNameElement.textContent.trim();
                }

                const reportTypeElement = reportWrapper.querySelector('.report-type');
                if (reportTypeElement) {
                    const reportTypeText = reportTypeElement.textContent.trim();
                    if (reportTypeText === '用户标记') {
                        result.count = 1;
                    }
                }
            }
            
            const locationElement = document.querySelector('.location');
            if (locationElement) {
                const locationText = locationElement.textContent.trim();
                const match = locationText.match(/([一-龥]+)[\s ]*([一-龥]+)?/);
                if (match) {
                    result.province = match[1] || '';
                    result.city = match[2] || '';
                }
            }
        } catch (error) {
            console.error('Error extracting data from DOM:', error);
        }

        console.log('Extracted result from DOM:', result);
        return result;
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
