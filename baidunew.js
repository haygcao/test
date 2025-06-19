(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
    id: 'baiPhoneNumberPlugin', // 插件ID,必须唯一
    name: 'bai', // 插件名称
    version: '1.3.0', // 插件版本
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36', // Example User-Agent
    'Referer': 'https://www.baidu.com/', // 或搜索结果页 URL
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

// handleResponse 函数 (JavaScript)
function handleResponse(response) {
    console.log('handleResponse called with:', response);

    // 定义在函数顶部，确保所有代码块都能访问
    let timeoutTimer = null;
    const maxWaitTime = 10000; // 最大等待时间10秒
    let startTime = Date.now();

    if (response.status >= 200 && response.status < 300) {
        try {
            // 创建一个临时的iframe来加载响应内容，避免覆盖当前页面
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none'; // 隐藏iframe
            document.body.appendChild(iframe);
            
            // 设置iframe内容
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(response.responseText);
            iframeDoc.close();
            
            // 将iframe中的head元素复制到主文档
            const headElements = iframeDoc.head.children;
            for (let i = 0; i < headElements.length; i++) {
                try {
                    // 只复制样式和脚本，避免复制meta标签导致的编码问题
                    const element = headElements[i];
                    if (element.tagName === 'STYLE' || element.tagName === 'SCRIPT' || element.tagName === 'LINK') {
                        const clone = element.cloneNode(true);
                        document.head.appendChild(clone);
                    }
                } catch (e) {
                    console.error('Error copying head element:', e);
                }
            }
            
            // 将iframe中的body内容复制到主文档的一个容器div中
            const contentDiv = document.createElement('div');
            contentDiv.id = 'baidu-content-container';
            contentDiv.innerHTML = iframeDoc.body.innerHTML;
            document.body.appendChild(contentDiv);
            
            console.log('HTML structure processed via iframe');
            
            // 设置响应数据到window对象，以便后续处理
            window.baiduResponseData = {
                phoneNumber: response.phoneNumber,
                contentDiv: contentDiv
            };
            
            // 移除iframe
            document.body.removeChild(iframe);
        } catch (error) {
            console.error('Error processing HTML structure:', error);
            // 清除计时器，避免内存泄漏
            if (timeoutTimer) {
                clearTimeout(timeoutTimer);
                timeoutTimer = null;
            }
            sendResultToFlutter('pluginError', { error: 'Error processing HTML structure' }, response.externalRequestId);
            return;
        }
        
        // 重置开始时间
        startTime = Date.now();
        
        // 使用 setTimeout 给页面一些时间加载和渲染
        timeoutTimer = setTimeout(() => {
            try {
                // 从我们创建的contentDiv中提取数据，而不是从整个document中提取
                if (window.baiduResponseData && window.baiduResponseData.contentDiv) {
                    const contentDiv = window.baiduResponseData.contentDiv;
                    const phoneNumber = window.baiduResponseData.phoneNumber;
                    
                    // 1. 尝试找到 Shadow DOM 的宿主元素
                    const shadowHost = contentDiv.querySelector('#__hcfy__');
                    
                    // 2. 如果找不到Shadow DOM宿主，尝试直接从contentDiv中查找元素
                    if (!shadowHost) {
                        const reportWrapper = contentDiv.querySelector('.report-wrapper');
                        if (reportWrapper && reportWrapper.textContent.trim() !== "") {
                            // 从普通DOM中解析数据
                            let result = extractDataFromRegularDOM(contentDiv, phoneNumber);
                            processAndSendResult(result, response.externalRequestId);
                            return;
                        }
                    } else {
                        // 3. 如果找到Shadow DOM宿主，尝试穿透Shadow DOM
                        if (shadowHost.shadowRoot) {
                            const targetElement = shadowHost.shadowRoot.querySelector('.report-wrapper');
                            
                            if (targetElement && targetElement.textContent.trim() !== "") {
                                // 从Shadow DOM中解析数据
                                let result = parseResponse(phoneNumber, shadowHost.shadowRoot);
                                processAndSendResult(result, response.externalRequestId);
                                return;
                            }
                        }
                    }
                }
                
                // 如果没有找到数据，尝试再次解析
                console.log('No data found in initial check, trying direct DOM extraction');
                let result = extractDataFromRegularDOM(document, response.phoneNumber);
                processAndSendResult(result, response.externalRequestId);
            } catch (error) {
                console.error('Error extracting data:', error);
                sendResultToFlutter('pluginError', { error: 'Error extracting data from page' }, response.externalRequestId);
            } finally {
                // 清除计时器，避免内存泄漏
                if (timeoutTimer) {
                    clearTimeout(timeoutTimer);
                    timeoutTimer = null;
                }
            }
        }, 2000); // 给页面2秒时间加载
        
        // 添加超时检查，确保在maxWaitTime时间内完成数据提取
        setTimeout(() => {
            // 如果timeoutTimer仍然存在，说明数据提取尚未完成
            if (timeoutTimer) {
                clearTimeout(timeoutTimer);
                timeoutTimer = null;
                console.error('Data extraction timed out after', maxWaitTime, 'ms');
                sendResultToFlutter('pluginError', { error: 'Data extraction timed out' }, response.externalRequestId);
            }
        }, maxWaitTime);

    } else {
        // 清除计时器，避免内存泄漏
        if (timeoutTimer) {
            clearTimeout(timeoutTimer);
            timeoutTimer = null;
        }
        sendResultToFlutter('pluginError', { error: response.statusText }, response.externalRequestId);
    }
}

// 电话号码直接从参数获取，不需要从URL提取

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
function parseResponse(phoneNumber, container = document) {
  return extractDataFromRegularDOM(container, phoneNumber);
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
