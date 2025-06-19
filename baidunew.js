(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
            id: 'baiPhoneNumberPlugin',
            name: 'bai',
            version: '1.2.0',
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

    // 解析HTML内容并正确处理head和body
    function parseAndInjectHTML(htmlContent) {
        // 创建一个临时的DOM解析器
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // 获取head和body内容
        const newHead = doc.head;
        const newBody = doc.body;
        
        if (!newHead || !newBody) {
            console.error('Failed to parse HTML head or body');
            return false;
        }

        // 清空当前文档的head和body，但保留基本结构
        const currentHead = document.head;
        const currentBody = document.body;
        
        // 保存当前head中的重要元素（如果有的话）
        const importantElements = currentHead.querySelectorAll('meta[charset], meta[name="viewport"]');
        
        // 清空head内容但保留重要的meta标签
        currentHead.innerHTML = '';
        importantElements.forEach(el => currentHead.appendChild(el.cloneNode(true)));
        
        // 将新的head内容添加到当前head
        Array.from(newHead.children).forEach(element => {
            try {
                // 创建新元素而不是直接移动，避免跨文档问题
                const newElement = document.createElement(element.tagName);
                
                // 复制所有属性
                Array.from(element.attributes).forEach(attr => {
                    newElement.setAttribute(attr.name, attr.value);
                });
                
                // 复制内容
                if (element.innerHTML) {
                    newElement.innerHTML = element.innerHTML;
                }
                
                currentHead.appendChild(newElement);
                console.log('Added head element:', element.tagName, element.src || element.href || '');
            } catch (error) {
                console.error('Error adding head element:', error);
            }
        });
        
        // 清空并替换body内容
        currentBody.innerHTML = '';
        Array.from(newBody.children).forEach(element => {
            try {
                // 克隆元素到当前文档
                const clonedElement = element.cloneNode(true);
                currentBody.appendChild(clonedElement);
            } catch (error) {
                console.error('Error adding body element:', error);
            }
        });
        
        // 复制body的属性
        Array.from(newBody.attributes).forEach(attr => {
            currentBody.setAttribute(attr.name, attr.value);
        });
        
        console.log('HTML content injected successfully');
        return true;
    }

    // 等待资源加载完成
    function waitForResourcesLoaded(callback, timeout = 15000) {
        let timeoutTimer = null;
        let checkInterval = null;
        const startTime = Date.now();
        
        const checkResourcesLoaded = () => {
            // 检查是否超时
            if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                if (timeoutTimer) clearTimeout(timeoutTimer);
                console.log('Resource loading timed out');
                callback(false);
                return;
            }
            
            // 检查页面是否准备就绪
            if (document.readyState === 'complete') {
                // 额外等待一点时间确保动态内容加载
                setTimeout(() => {
                    clearInterval(checkInterval);
                    if (timeoutTimer) clearTimeout(timeoutTimer);
                    callback(true);
                }, 1000);
                return;
            }
        };
        
        // 定期检查
        checkInterval = setInterval(checkResourcesLoaded, 500);
        
        // 设置超时
        timeoutTimer = setTimeout(() => {
            clearInterval(checkInterval);
            console.log('Timeout reached while waiting for resources');
            callback(false);
        }, timeout);
        
        // 立即检查一次
        checkResourcesLoaded();
    }

    // 修改后的handleResponse函数
    function handleResponse(response) {
        console.log('handleResponse called with:', response);

        if (response.status >= 200 && response.status < 300) {
            // 正确解析并注入HTML
            const success = parseAndInjectHTML(response.responseText);
            
            if (!success) {
                sendResultToFlutter('pluginError', { error: 'Failed to parse HTML content' }, response.externalRequestId);
                return;
            }
            
            // 等待资源加载完成后再开始解析数据
            waitForResourcesLoaded((loaded) => {
                if (!loaded) {
                    console.warn('Resources may not be fully loaded, proceeding anyway');
                }
                
                // 开始解析数据
                startDataExtraction(response.phoneNumber, response.externalRequestId);
            });
            
        } else {
            sendResultToFlutter('pluginError', { error: response.statusText }, response.externalRequestId);
        }
    }

    // 数据提取逻辑
    function startDataExtraction(phoneNumber, externalRequestId) {
        let timeoutTimer = null;
        const maxWaitTime = 10000;
        const startTime = Date.now();
        
        const observer = new MutationObserver((mutationsList, observer) => {
            if (Date.now() - startTime > maxWaitTime) {
                observer.disconnect();
                if (timeoutTimer) clearTimeout(timeoutTimer);
                console.log('Data extraction timed out after', maxWaitTime, 'ms');
                sendResultToFlutter('pluginError', { error: 'Timeout waiting for content to load' }, externalRequestId);
                return;
            }
            
            // 尝试找到Shadow DOM宿主元素
            const shadowHost = document.querySelector('#__hcfy__');
            
            if (!shadowHost) {
                // 尝试从普通DOM中查找
                const reportWrapper = document.querySelector('.report-wrapper');
                if (reportWrapper && reportWrapper.textContent.trim() !== "") {
                    observer.disconnect();
                    if (timeoutTimer) clearTimeout(timeoutTimer);
                    
                    let result = extractDataFromRegularDOM(document, phoneNumber);
                    processAndSendResult(result, externalRequestId);
                    return;
                }
            } else {
                // 处理Shadow DOM
                if (shadowHost.shadowRoot) {
                    const targetElement = shadowHost.shadowRoot.querySelector('.report-wrapper');
                    
                    if (targetElement && targetElement.textContent.trim() !== "") {
                        observer.disconnect();
                        if (timeoutTimer) clearTimeout(timeoutTimer);
                        
                        let result = parseResponse(shadowHost.shadowRoot, phoneNumber);
                        processAndSendResult(result, externalRequestId);
                        return;
                    }
                }
            }
        });

        const config = { childList: true, subtree: true, characterData: true, attributes: true };
        observer.observe(document.body, config);
        
        timeoutTimer = setTimeout(() => {
            observer.disconnect();
            console.log('Timeout reached after', maxWaitTime, 'ms');
            sendResultToFlutter('pluginError', { error: 'Timeout waiting for content to load' }, externalRequestId);
        }, maxWaitTime);
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
