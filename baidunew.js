(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
            id: 'baiPhoneNumberPlugin', // 插件ID,必须唯一
            name: 'bai', // 插件名称
            version: '1.72.0', // 插件版本
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            'Referer': 'https://www.baidu.com/',
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
    
    // 发送结果到Flutter
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

    // 解析HTML并正确处理head和body
    function parseAndInjectHTML(htmlString) {
        // 创建一个临时的DOM解析器
        const parser = new DOMParser();
        const parsedDoc = parser.parseFromString(htmlString, 'text/html');
        
        // 获取解析后的head和body内容
        const newHead = parsedDoc.head;
        const newBody = parsedDoc.body;
        
        // 处理head中的元素
        if (newHead) {
            // 获取所有head中的元素
            const headElements = Array.from(newHead.children);
            
            headElements.forEach(element => {
                // 检查是否已经存在相同的元素，避免重复
                const existing = document.head.querySelector(element.tagName.toLowerCase() + 
                    (element.src ? `[src="${element.src}"]` : '') +
                    (element.href ? `[href="${element.href}"]` : ''));
                
                if (!existing) {
                    // 克隆元素并添加到当前文档的head中
                    const clonedElement = element.cloneNode(true);
                    document.head.appendChild(clonedElement);
                    
                    // 为script和link元素添加加载监听
                    if (element.tagName.toLowerCase() === 'script' || element.tagName.toLowerCase() === 'link') {
                        clonedElement.onload = function() {
                            console.log(`Loaded: ${element.tagName} - ${element.src || element.href}`);
                        };
                        clonedElement.onerror = function() {
                            console.error(`Failed to load: ${element.tagName} - ${element.src || element.href}`);
                        };
                    }
                }
            });
        }
        
        // 处理body内容
        if (newBody) {
            // 等待head中的关键资源加载完成后再处理body
            waitForCriticalResources().then(() => {
                // 清空当前body并添加新内容
                document.body.innerHTML = '';
                
                // 将新body的所有子节点移动到当前body
                while (newBody.firstChild) {
                    document.body.appendChild(newBody.firstChild);
                }
                
                console.log('Body content injected successfully');
            });
        }
    }
    
    // 等待关键资源加载完成
    function waitForCriticalResources() {
        return new Promise((resolve) => {
            // 检查所有stylesheet是否加载完成
            const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
            const scripts = Array.from(document.querySelectorAll('script[src]'));
            
            let loadedCount = 0;
            const totalCount = stylesheets.length + scripts.length;
            
            if (totalCount === 0) {
                resolve();
                return;
            }
            
            function checkLoaded() {
                loadedCount++;
                if (loadedCount >= totalCount) {
                    resolve();
                }
            }
            
            // 监听stylesheet加载
            stylesheets.forEach(link => {
                if (link.sheet) {
                    checkLoaded();
                } else {
                    link.addEventListener('load', checkLoaded);
                    link.addEventListener('error', checkLoaded);
                }
            });
            
            // 监听script加载
            scripts.forEach(script => {
                if (script.readyState === 'complete') {
                    checkLoaded();
                } else {
                    script.addEventListener('load', checkLoaded);
                    script.addEventListener('error', checkLoaded);
                }
            });
            
            // 设置超时，避免无限等待
            setTimeout(() => {
                console.log('Timeout waiting for resources, proceeding anyway');
                resolve();
            }, 5000);
        });
    }

    // handleResponse 函数 (修改后)
    function handleResponse(response) {
        console.log('handleResponse called with:', response);

        if (response.status >= 200 && response.status < 300) {
            // 使用新的HTML解析和注入方法
            parseAndInjectHTML(response.responseText);
            
            // 创建一个计时器变量，用于超时检测
            let timeoutTimer = null;
            let maxWaitTime = 15000; // 增加等待时间到15秒，因为需要等待资源加载
            let startTime = Date.now();
            
            // 使用 MutationObserver 等待内容加载完成
            const observer = new MutationObserver((mutationsList, observer) => {
                // 检查是否超时
                if (Date.now() - startTime > maxWaitTime) {
                    observer.disconnect();
                    if (timeoutTimer) clearTimeout(timeoutTimer);
                    console.log('Observation timed out after', maxWaitTime, 'ms');
                    sendResultToFlutter('pluginError', { error: 'Timeout waiting for content to load' }, response.externalRequestId);
                    return;
                }
                
                // 1. 尝试找到 Shadow DOM 的宿主元素
                const shadowHost = document.querySelector('#__hcfy__');
                
                // 2. 如果找不到Shadow DOM宿主，尝试直接从document中查找元素
                if (!shadowHost) {
                    const reportWrapper = document.querySelector('.report-wrapper');
                    if (reportWrapper && reportWrapper.textContent.trim() !== "") {
                        observer.disconnect();
                        if (timeoutTimer) clearTimeout(timeoutTimer);
                        
                        // 从普通DOM中解析数据
                        let result = extractDataFromRegularDOM(document, response.phoneNumber);
                        processAndSendResult(result, response.externalRequestId);
                        return;
                    }
                } else {
                    // 3. 如果找到Shadow DOM宿主，尝试穿透Shadow DOM
                    if (shadowHost.shadowRoot) {
                        const targetElement = shadowHost.shadowRoot.querySelector('.report-wrapper');
                        
                        if (targetElement && targetElement.textContent.trim() !== "") {
                            observer.disconnect();
                            if (timeoutTimer) clearTimeout(timeoutTimer);
                            
                            // 从Shadow DOM中解析数据
                            let result = parseResponse(shadowHost.shadowRoot, response.phoneNumber);
                            processAndSendResult(result, response.externalRequestId);
                            return;
                        }
                    }
                }
            });

            const config = { childList: true, subtree: true, characterData: true, attributes: true };
            observer.observe(document.body, config);
            
            // 设置超时处理
            timeoutTimer = setTimeout(() => {
                observer.disconnect();
                console.log('Timeout reached after', maxWaitTime, 'ms');
                sendResultToFlutter('pluginError', { error: 'Timeout waiting for content to load' }, response.externalRequestId);
            }, maxWaitTime);

        } else {
            sendResultToFlutter('pluginError', { error: response.statusText }, response.externalRequestId);
        }
    }

    // 处理结果并发送到Flutter
    function processAndSendResult(result, externalRequestId) {
        // 确保结果对象包含所有必要字段
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
        
        // 尝试根据sourceLabel映射到预定义标签
        if (finalResult.sourceLabel && manualMapping[finalResult.sourceLabel]) {
            finalResult.predefinedLabel = manualMapping[finalResult.sourceLabel];
        }
        
        console.log('Sending result to Flutter:', finalResult);
        sendResultToFlutter('pluginResult', finalResult, externalRequestId);
    }

    // parseResponse 函数 (保持函数命名一致性)
    function parseResponse(shadowRoot, phoneNumber) {
        return extractDataFromRegularDOM(shadowRoot, phoneNumber);
    }

    // 统一使用extractDataFromRegularDOM函数处理DOM数据提取
    function extractDataFromRegularDOM(document, phoneNumber) {
        console.log('extractDataFromRegularDOM called with document:', document);
        
        // 创建一个结果对象
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
            // 在DOM中查找并提取数据
            const reportWrapper = document.querySelector('.report-wrapper');
            if (reportWrapper) {
                // 提取标签信息
                const reportNameElement = reportWrapper.querySelector('.report-name');
                if (reportNameElement) {
                    result.sourceLabel = reportNameElement.textContent.trim();
                }

                // 提取评分数量
                const reportTypeElement = reportWrapper.querySelector('.report-type');
                if (reportTypeElement) {
                    const reportTypeText = reportTypeElement.textContent.trim();
                    if (reportTypeText === '用户标记') {
                        result.count = 1;
                    }
                }
            }
            
            // 提取省份和城市
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
