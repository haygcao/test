(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
    id: 'baiPhoneNumberPlugin', // 插件ID,必须唯一
    name: 'bai', // 插件名称
    version: '1.20.0', // 插件版本
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
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'Connection': 'keep-alive',
            'X-Requested-With': 'XMLHttpRequest'
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

// 处理响应的函数
function handleResponse(response) {
    console.log('Handling response');
    if (!response || !response.responseText) {
        console.error('Invalid response received');
        sendResultToFlutter('pluginError', { error: 'Invalid response received' }, response.externalRequestId);
        return;
    }

    try {
        // 创建一个隐藏的iframe来加载响应内容
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none'; // 隐藏iframe
        document.body.appendChild(iframe);
        
        // 获取iframe的document对象
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        
        // 清空iframe文档
        iframeDoc.open();
        
        // 写入完整的HTML响应，这样head会自然加载到head，body会自然加载到body
        iframeDoc.write(response.responseText);
        iframeDoc.close();
        
        console.log('Response loaded into iframe');
        
        // 立即尝试解析
        try {
            console.log('Attempting immediate parse from iframe');
            let result = parseResponse(iframeDoc, response.phoneNumber);
            processAndSendResult(result, response.externalRequestId);
        } catch (error) {
            console.log('Immediate parse failed, setting up observer on iframe', error);
            // 如果立即解析失败，设置MutationObserver和超时处理，传入iframe文档
            setupObserverAndTimeout(response, iframeDoc);
        }
    } catch (error) {
        console.error('Error handling response with iframe:', error);
        
        // 如果iframe方法失败，回退到div容器方法
        try {
            console.log('Falling back to div container method');
            const container = document.createElement('div');
            container.innerHTML = response.responseText;
            document.body.appendChild(container);
            
            // 立即尝试解析
            try {
                console.log('Attempting immediate parse with div container');
                let result = parseResponse(document, response.phoneNumber);
                processAndSendResult(result, response.externalRequestId);
            } catch (parseError) {
                console.log('Immediate parse failed with div container, setting up observer', parseError);
                // 如果立即解析失败，设置MutationObserver和超时处理
                setupObserverAndTimeout(response);
            }
        } catch (fallbackError) {
            console.error('Both methods failed:', fallbackError);
            sendResultToFlutter('pluginError', { error: fallbackError.toString() }, response.externalRequestId);
        }
    }
}

// 设置MutationObserver和超时处理的函数
function setupObserverAndTimeout(response, docToObserve) {
    console.log('Setting up MutationObserver and timeout');
    const maxWaitTime = 10000; // 10秒超时
    const startTime = Date.now();
    let timeoutTimer;
    
    // 确定要观察的文档对象
    const targetDoc = docToObserve || document;
    const targetBody = targetDoc.body || targetDoc.documentElement;
    
    console.log('Observing document:', targetDoc === document ? 'main document' : 'iframe document');
    
    // 使用 MutationObserver 等待 DOM 元素出现
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
        const shadowHost = targetDoc.querySelector('#__hcfy__');
        
        // 2. 如果找不到Shadow DOM宿主，尝试直接从targetDoc中查找元素
        if (!shadowHost) {
            // 使用增强的查找方法
            let found = false;
            const allElements = targetDoc.querySelectorAll('*');
            for (let i = 0; i < allElements.length; i++) {
                if (allElements[i].className && 
                    (allElements[i].className.includes('report-wrapper') || 
                     allElements[i].className.includes('location'))) {
                    found = true;
                    break;
                }
            }
            
            if (found) {
                observer.disconnect();
                if (timeoutTimer) clearTimeout(timeoutTimer);
                
                // 从普通DOM中解析数据
                console.log('Found relevant elements in document');
                let result = parseResponse(targetDoc, response.phoneNumber);
                processAndSendResult(result, response.externalRequestId);
                return;
            }
        } else {
            // 3. 如果找到Shadow DOM宿主，尝试穿透Shadow DOM
            if (shadowHost.shadowRoot) {
                // 使用增强的查找方法
                let found = false;
                const allElements = shadowHost.shadowRoot.querySelectorAll('*');
                for (let i = 0; i < allElements.length; i++) {
                    if (allElements[i].className && 
                        (allElements[i].className.includes('report-wrapper') || 
                         allElements[i].className.includes('location'))) {
                        found = true;
                        break;
                    }
                }
                
                if (found) {
                    observer.disconnect();
                    if (timeoutTimer) clearTimeout(timeoutTimer);
                    
                    // 从Shadow DOM中解析数据
                    console.log('Found relevant elements in shadowRoot');
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
        
        // 超时时，尝试最后一次解析
        console.log('Attempting final parse before timeout');
        let finalResult = parseResponse(document, response.phoneNumber);
        if (finalResult && (finalResult.sourceLabel || finalResult.province)) {
            console.log('Successfully parsed data in final attempt');
            processAndSendResult(finalResult, response.externalRequestId);
        } else {
            sendResultToFlutter('pluginError', { error: 'Timeout waiting for content to load' }, response.externalRequestId);
        }
    }, maxWaitTime);
        }

   
   
   


// Helper function: send result or error to Flutter (uses externalRequestId)
function sendResultToFlutter(type, data, externalRequestId) {
    const message = {
        type: type,
        pluginId: pluginId,
        requestId: externalRequestId, // Correct: Use externalRequestId here
        data: data,
    };
    const messageString = JSON.stringify(message);
    console.log('Sending message to Flutter:', messageString);
    if (window.flutter_inappwebview) {
        window.flutter_inappwebview.callHandler('PluginResultChannel', messageString);
    } else {
        console.error("flutter_inappwebview is undefined");
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



// parseResponse 函数 (定义：接收 document 或 shadowRoot 或 HTML字符串)
function parseResponse(docOrShadowRootOrHtml, phoneNumber) {
    console.log('parseResponse called with type:', typeof docOrShadowRootOrHtml);
    
    // 如果输入是字符串（HTML文本），先解析成DOM
    if (typeof docOrShadowRootOrHtml === 'string') {
        console.log('Input is HTML string, parsing to DOM');
        const parser = new DOMParser();
        const doc = parser.parseFromString(docOrShadowRootOrHtml, 'text/html');
        return extractDataFromDOM(doc, phoneNumber);
    }
    
    // 确保docOrShadowRootOrHtml是有效的对象
    if (!docOrShadowRootOrHtml || !docOrShadowRootOrHtml.querySelector) {
        console.error('Invalid document object provided to parseResponse');
        throw new Error('Invalid document object');
    }
    
    console.log('Document object type:', docOrShadowRootOrHtml.constructor.name);
    console.log('Document has body:', !!docOrShadowRootOrHtml.body);
    
    // 否则直接使用输入的DOM对象
    return extractDataFromDOM(docOrShadowRootOrHtml, phoneNumber);
}

// extractDataFromDOM 函数 (从 document 或 shadowRoot 查找元素)
function extractDataFromDOM(docOrShadowRoot, phoneNumber) {
    console.log('extractDataFromDOM called with phoneNumber:', phoneNumber);
    
    // 确保docOrShadowRoot是有效的Document或Element对象
    if (!docOrShadowRoot || (!docOrShadowRoot.querySelector && !docOrShadowRoot.querySelectorAll)) {
        console.error('Invalid document object provided to extractDataFromDOM');
        throw new Error('Invalid document object for data extraction');
    }
    
    // 记录文档信息，帮助调试
    console.log('Document in extractDataFromDOM:', 
        docOrShadowRoot === document ? 'main document' : 
        (docOrShadowRoot.nodeName === '#document' ? 'iframe document' : 'other DOM element'));
    
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
        // 在DOM中查找并提取数据 - 增强查找逻辑以适应不同的DOM结构
        // 首先尝试直接查找元素
        let reportWrapper = docOrShadowRoot.querySelector('.report-wrapper');
        
        // 如果找不到，尝试在整个文档中查找
        if (!reportWrapper && docOrShadowRoot.querySelectorAll) {
            console.log('Trying to find elements in the entire document');
            // 尝试查找所有可能的元素
            const allElements = docOrShadowRoot.querySelectorAll('*');
            for (let i = 0; i < allElements.length; i++) {
                if (allElements[i].className && allElements[i].className.includes('report-wrapper')) {
                    reportWrapper = allElements[i];
                    break;
                }
            }
        }
        
        if (reportWrapper) {
            console.log('Found report-wrapper:', reportWrapper);
            // 提取标签信息
            const reportNameElement = reportWrapper.querySelector('.report-name');
            if (reportNameElement) {
                result.sourceLabel = reportNameElement.textContent.trim();
                console.log('Found sourceLabel:', result.sourceLabel);
            }

            // 提取评分数量
            const reportTypeElement = reportWrapper.querySelector('.report-type');
            if (reportTypeElement) {
                const reportTypeText = reportTypeElement.textContent.trim();
                console.log('Found reportType:', reportTypeText);
                if (reportTypeText === '用户标记') {
                    result.count = 1;
                }
            }
        } else {
            console.log('Could not find report-wrapper element');
        }
        
        // 提取省份和城市
        let locationElement = docOrShadowRoot.querySelector('.location');
        
        // 如果找不到，尝试在整个文档中查找
        if (!locationElement && docOrShadowRoot.querySelectorAll) {
            const allElements = docOrShadowRoot.querySelectorAll('*');
            for (let i = 0; i < allElements.length; i++) {
                if (allElements[i].className && allElements[i].className.includes('location')) {
                    locationElement = allElements[i];
                    break;
                }
            }
        }
        
        if (locationElement) {
            console.log('Found location element:', locationElement);
            const locationText = locationElement.textContent.trim();
            console.log('Location text:', locationText);
            const match = locationText.match(/([一-龥]+)[\s ]*([一-龥]+)?/);
            if (match) {
                result.province = match[1] || '';
                result.city = match[2] || '';
                console.log('Extracted province:', result.province, 'city:', result.city);
            }
        } else {
            console.log('Could not find location element');
            
            // 如果没有找到任何元素，记录所有可用的类名以帮助调试
            if (!result.sourceLabel && !result.province) {
                console.log('No data extracted, logging all available class names for debugging');
                const allElements = docOrShadowRoot.querySelectorAll('*');
                const classNames = new Set();
                for (let i = 0; i < allElements.length; i++) {
                    if (allElements[i].className) {
                        allElements[i].className.split(' ').forEach(cls => {
                            if (cls) classNames.add(cls);
                        });
                    }
                }
                console.log('Available class names:', Array.from(classNames).join(', '));
            }
        }
    } catch (error) {
        console.error('Error extracting data:', error);
    }

    console.log('Extracted result:', result);
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
