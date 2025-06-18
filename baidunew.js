(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
    id: 'baiPhoneNumberPlugin', // 插件ID,必须唯一
    name: 'bai', // 插件名称
    version: '1.2.0', // 插件版本
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

    // 查询电话号码信息
    function queryPhoneInfo(phoneNumber, externalRequestId) {
        console.log('queryPhoneInfo called with:', phoneNumber, externalRequestId);
        
        // 构建查询URL
        const url = `https://www.baidu.com/s?wd=${encodeURIComponent(phoneNumber)}`;
        
        // 发送请求
        sendRequest(url, phoneNumber, externalRequestId);
    }

    // 发送请求
    function sendRequest(url, phoneNumber, externalRequestId) {
        console.log('sendRequest called with:', url, phoneNumber, externalRequestId);
        
        // 创建一个新的XMLHttpRequest对象
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        
        // 设置响应类型
        xhr.responseType = 'text';
        
        // 设置请求头
        xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // 处理响应
        xhr.onload = function() {
            // 创建一个临时的DOM解析器
            const parser = new DOMParser();
            const doc = parser.parseFromString(xhr.responseText, 'text/html');
            
            const response = {
                status: xhr.status,
                statusText: xhr.statusText,
                document: doc,
                phoneNumber: phoneNumber,
                url: url
            };
            
            handleResponse(response, externalRequestId);
        };
        
        // 处理错误
        xhr.onerror = function() {
            console.error('Request failed');
            sendResultToFlutter('pluginError', { error: 'Request failed' }, externalRequestId);
        };
        
        // 发送请求
        xhr.send();
    }

// 发送结果到Flutter
function sendResultToFlutter(type, data, externalRequestId) {
    console.log(`sendResultToFlutter: type=${type}, data=`, data, `, externalRequestId=${externalRequestId}`);
    
    if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
        const message = {
            type: type,
            data: data,
            externalRequestId: externalRequestId,
            pluginId: pluginId
        };
        
        window.flutter_inappwebview.callHandler('ResultChannel', JSON.stringify(message));
    } else {
        console.error('flutter_inappwebview is not defined');
    }
}

// 等待元素出现的函数
function waitForElement(parent, selector, timeout) {
    return new Promise((resolve, reject) => {
        // 首先检查元素是否已经存在
        const element = parent.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }
        
        // 设置超时
        const timeoutId = setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timeout waiting for ${selector}`));
        }, timeout);
        
        // 创建一个观察器来监视DOM变化
        const observer = new MutationObserver((mutations) => {
            const element = parent.querySelector(selector);
            if (element) {
                observer.disconnect();
                clearTimeout(timeoutId);
                resolve(element);
            }
        });
        
        // 开始观察
        observer.observe(parent, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        });
    });
}

// 处理响应
function handleResponse(response, externalRequestId) {
    console.log('handleResponse called with response:', response);
    
    // 如果响应为空或无效，返回空结果
    if (!response || !response.document) {
        console.error('Invalid response or missing document');
        processAndSendResult({ phoneNumber: response.phoneNumber }, externalRequestId);
        return;
    }
    
    // 使用传入的电话号码
    let phoneNumber = response.phoneNumber;
    
    // 如果无法获取电话号码，返回空结果
    if (!phoneNumber) {
        console.error('No phone number provided');
        processAndSendResult({ phoneNumber: '' }, externalRequestId);
        return;
    }
    
    // 检查是否存在Shadow DOM
    const shadowHost = response.document.querySelector('#content_left');
    if (shadowHost && shadowHost.shadowRoot) {
        console.log('Shadow DOM found, using shadowRoot for data extraction');
        // 等待DOM元素出现
        waitForElement(shadowHost.shadowRoot, '.report-wrapper', 5000)
            .then(() => {
                // 使用parseResponse提取数据
                const result = parseResponse(shadowHost.shadowRoot, phoneNumber);
                processAndSendResult(result, externalRequestId);
            })
            .catch(error => {
                console.error('Error waiting for Shadow DOM element:', error);
                // 尝试从普通DOM提取数据
                const result = parseResponse(response.document, phoneNumber);
                processAndSendResult(result, externalRequestId);
            });
    } else {
        console.log('No Shadow DOM found, using regular DOM for data extraction');
        // 使用parseResponse提取数据
        const result = parseResponse(response.document, phoneNumber);
        processAndSendResult(result, externalRequestId);
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
        source: pluginInfo.info.name
    };
    
    // 尝试根据sourceLabel映射到预定义标签
    if (finalResult.sourceLabel && manualMapping[finalResult.sourceLabel]) {
        finalResult.predefinedLabel = manualMapping[finalResult.sourceLabel];
    }
    
    console.log('Sending result to Flutter:', finalResult);
    sendResultToFlutter('pluginResult', finalResult, externalRequestId);
}

// parseResponse function (defined by the plugin)
function parseResponse(doc, phoneNumber) {
    return extractDataFromDOM(doc, phoneNumber);
}

function extractDataFromDOM(doc, phoneNumber) {
    const jsonObject = {
        count: 0,
        sourceLabel: "",
        province: "",
        city: "",
        carrier: "unknown",
        phoneNumber: phoneNumber,
        name: "unknown",
        rate: 0
    };

    try {
        // 在DOM中查找并提取数据
        const reportWrapper = doc.querySelector('.report-wrapper');
        if (reportWrapper) {
            // 提取标签信息
            const reportNameElement = reportWrapper.querySelector('.report-name');
            if (reportNameElement) {
                jsonObject.sourceLabel = reportNameElement.textContent.trim();
            }

            // 提取评分数量
            const reportTypeElement = reportWrapper.querySelector('.report-type');
            if (reportTypeElement) {
                const reportTypeText = reportTypeElement.textContent.trim();
                if (reportTypeText === '用户标记') {
                    jsonObject.count = 1;
                }
            }
        }
        
        // 提取省份和城市
        const locationElement = doc.querySelector('.location');
        if (locationElement) {
            const locationText = locationElement.textContent.trim();
            const match = locationText.match(/([\u4e00-\u9fa5]+)[\s ]*([\u4e00-\u9fa5]+)?/);
            if (match) {
                jsonObject.province = match[1] || '';
                jsonObject.city = match[2] || '';
            }
        }
    } catch (error) {
        console.error('Error extracting data:', error);
    }

    console.log('Final jsonObject:', jsonObject);
    console.log('Final jsonObject type:', typeof jsonObject);
    return jsonObject;
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
