(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
            id: 'tellowsPlugin',
            name: 'Tellows Plugin',
            version: '1.6.0',
            description: 'This plugin retrieves information about phone numbers.',
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

    // handleResponse function (now receives both request IDs)
    function handleResponse(response) {
    console.log('handleResponse called with:', response);

    if (response.status >= 200 && response.status < 300) {
        // Use response.phoneNumber, which should be passed from Flutter
        let result = parseResponse(response.responseText, response.phoneNumber);

        console.log('First successful query completed:', result);

        if (result === null || result === undefined) {
            // Use response.externalRequestId for errors
            sendResultToFlutter('pluginError', { error: 'All attempts failed or timed out.' }, response.externalRequestId);
            return;
        }

        let matchedLabel = predefinedLabels.find(label => label.label === result.sourceLabel)?.label;
        if (!matchedLabel) {
            matchedLabel = manualMapping[result.sourceLabel];
        }
        if (!matchedLabel) {
            matchedLabel = 'Unknown';
        }

        const finalResult = {
            phoneNumber: result.phoneNumber,
            sourceLabel: result.sourceLabel,
            count: result.count,
            province: result.province,
            city: result.city,
            carrier: result.carrier,
            name: result.name,
            predefinedLabel: matchedLabel,
            source: pluginInfo.info.name,
        };

        // Use response.externalRequestId for the result
        sendResultToFlutter('pluginResult', finalResult, response.externalRequestId);
    } else {
        // Use response.externalRequestId for errors
        sendResultToFlutter('pluginError', { error: response.statusText }, response.externalRequestId);
    }
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


    // parseResponse function (defined by the plugin)
    function parseResponse(responseText, phoneNumber) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(responseText, 'text/html');
        
        // 处理动态脚本加载
        handleDynamicScripts(doc);
        
        return extractDataFromDOM(doc, phoneNumber);
    }

    // 处理动态加载的脚本
    function handleDynamicScripts(doc) {
        try {
            console.log('Handling dynamic scripts in document');
            
            // 收集所有脚本元素
            const scripts = doc.querySelectorAll('script');
            console.log(`Found ${scripts.length} script elements`);
            
            // 创建一个队列来存储所有脚本信息
            const scriptQueue = [];
            
            // 首先收集所有脚本信息
            for (let i = 0; i < scripts.length; i++) {
                const script = scripts[i];
                const src = script.getAttribute('src');
                
                if (src) {
                    console.log(`Found external script with src: ${src}`);
                    scriptQueue.push({
                        type: 'external',
                        src: src,
                        attributes: script.attributes,
                        element: script
                    });
                } else if (script.textContent) {
                    console.log('Found inline script');
                    scriptQueue.push({
                        type: 'inline',
                        content: script.textContent,
                        attributes: script.attributes,
                        element: script
                    });
                }
            }
            
            console.log(`Total scripts to process: ${scriptQueue.length}`);
            
            // 创建一个函数来按顺序处理脚本
            let currentIndex = 0;
            let loadedScripts = 0;
            const totalScripts = scriptQueue.length;
            
            function processNextScript() {
                if (currentIndex >= scriptQueue.length) {
                    console.log(`All scripts processed successfully (${loadedScripts}/${totalScripts})`);
                    return;
                }
                
                const scriptInfo = scriptQueue[currentIndex];
                const newScript = doc.createElement('script');
                
                // 复制原始脚本的所有属性
                for (let j = 0; j < scriptInfo.attributes.length; j++) {
                    const attr = scriptInfo.attributes[j];
                    if (attr.name !== 'src') { // src属性我们会单独处理
                        newScript.setAttribute(attr.name, attr.value);
                    }
                }
                
                // 处理脚本加载完成后的操作
                const handleScriptProcessed = () => {
                    loadedScripts++;
                    currentIndex++;
                    // 使用setTimeout确保不会堆栈溢出，并给浏览器一些时间处理当前脚本
                    setTimeout(processNextScript, 10);
                };
                
                if (scriptInfo.type === 'external') {
                    // 设置加载完成和错误处理回调
                    newScript.onload = function() {
                        console.log(`Script loaded (${loadedScripts+1}/${totalScripts}): ${scriptInfo.src}`);
                        handleScriptProcessed();
                    };
                    
                    newScript.onerror = function(error) {
                        console.error(`Failed to load script (${loadedScripts+1}/${totalScripts}): ${scriptInfo.src}`, error);
                        handleScriptProcessed(); // 即使出错也继续处理下一个脚本
                    };
                    
                    // 最后设置src属性，这样才会开始加载
                    newScript.src = scriptInfo.src;
                } else {
                    // 设置内联脚本内容
                    newScript.textContent = scriptInfo.content;
                    console.log(`Inline script processed (${loadedScripts+1}/${totalScripts})`);
                    // 内联脚本不需要等待加载，直接处理下一个
                    setTimeout(handleScriptProcessed, 0);
                }
                
                // 替换原始脚本
                if (scriptInfo.element.parentNode) {
                    scriptInfo.element.parentNode.replaceChild(newScript, scriptInfo.element);
                } else {
                    // 如果没有父节点，则添加到head或body
                    (doc.head || doc.body).appendChild(newScript);
                }
            }
            
            // 开始处理第一个脚本
            processNextScript();
            
            console.log('Dynamic scripts handling initiated');
        } catch (error) {
            console.error('Error handling dynamic scripts:', error);
        }
    }

    function extractDataFromDOM(doc, phoneNumber) {
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
            console.log('Document Object:', doc);
    
            const bodyElement = doc.body;
            console.log('Body Element:', bodyElement);
            if (!bodyElement) {
                console.error('Error: Could not find body element.');
                return jsonObject;
            }
    
            // --- 按照原逻辑，并添加解码 ---
            const infoRightElement = doc.querySelector('.info-right'); // info-right 还在
            console.log('infoRightElement:', infoRightElement);
    
            if (infoRightElement) {
                const reportWrapper = infoRightElement.querySelector('.report-wrapper'); // report-wrapper 还在
                console.log('reportWrapper:', reportWrapper);
    
                if (reportWrapper) {
                    // 主要从 report-name 获取 sourceLabel
                    const reportNameElement = reportWrapper.querySelector('.report-name');
                    console.log('reportNameElement:', reportNameElement);
                    if (reportNameElement) {
                        const reportNameText = reportNameElement.textContent.trim();
                        jsonObject.sourceLabel = reportNameText;
                        console.log('jsonObject.sourceLabel:', jsonObject.sourceLabel);
                    }
                                                                     
    
                    // 只有 report-type 为 "用户标记" 时，count 才为 1
                    const reportTypeElement = reportWrapper.querySelector('.report-type');
                    console.log('reportTypeElement:', reportTypeElement);
                    if (reportTypeElement) {
                        const reportTypeText = reportTypeElement.textContent.trim();
                        if (reportTypeText === '用户标记') {
                            jsonObject.count = 1;
                            console.log('jsonObject.count:', jsonObject.count);
                        }
                    }
                }
    
                // 提取 province 和 city，并解码
                const locationElement = infoRightElement.querySelector('.location');
                console.log('locationElement:', locationElement);
                if (locationElement) {
                    const locationText = locationElement.textContent.trim();
                    console.log('locationText:', locationText);
                  
                    const match = locationText.match(/([\u4e00-\u9fa5]+)[\s ]*([\u4e00-\u9fa5]+)?/);
                    if (match) {
                        jsonObject.province = match[1] || '';
                        jsonObject.city = match[2] || '';
                    }
                    console.log('jsonObject.province:', jsonObject.province);
                    console.log('jsonObject.city:', jsonObject.city);
                }
                
                // 提取运营商信息
                const carrierElement = infoRightElement.querySelector('.carrier');
                if (carrierElement) {
                    jsonObject.carrier = carrierElement.textContent.trim();
                    console.log('jsonObject.carrier:', jsonObject.carrier);
                }
                
                // 提取名称信息
                const nameElement = infoRightElement.querySelector('.name');
                if (nameElement) {
                    jsonObject.name = nameElement.textContent.trim();
                    console.log('jsonObject.name:', jsonObject.name);
                }
                
                // 尝试从电话号码元素获取
                const telNumElement = doc.querySelector('.tel-num');
                if (telNumElement && (!phoneNumber || phoneNumber === '')) {
                    jsonObject.phoneNumber = telNumElement.textContent.trim();
                    console.log('jsonObject.phoneNumber from tel-num:', jsonObject.phoneNumber);
                }
            }
            
            // 如果没有找到标准元素，尝试其他选择器
            if (!jsonObject.sourceLabel && !jsonObject.count) {
                // 尝试查找其他可能包含信息的元素
                const alternativeElements = doc.querySelectorAll('.c-container');
                if (alternativeElements && alternativeElements.length > 0) {
                    for (const element of alternativeElements) {
                        const text = element.textContent.trim();
                        if (text.includes(phoneNumber)) {
                            // 尝试提取标签信息
                            const labelMatch = text.match(/(骚扰|诈骗|推销|广告|快递|外卖|金融|房产|教育|招聘|医疗|政府|服务|商业|个人)/);
                            if (labelMatch) {
                                jsonObject.sourceLabel = labelMatch[0];
                            }
                            
                            // 尝试提取位置信息
                            const locationMatch = text.match(/([\u4e00-\u9fa5]{2,}省|[\u4e00-\u9fa5]{2,}市|[\u4e00-\u9fa5]{2,}区)/);
                            if (locationMatch) {
                                if (!jsonObject.province) {
                                    jsonObject.province = locationMatch[0];
                                } else if (!jsonObject.city) {
                                    jsonObject.city = locationMatch[0];
                                }
                            }
                            
                            // 尝试提取运营商信息
                            const carrierMatch = text.match(/(移动|联通|电信|虚拟运营商)/);
                            if (carrierMatch) {
                                jsonObject.carrier = carrierMatch[0];
                            }
                            
                            break;
                        }
                    }
                }
            }
            // --- 原逻辑和解码结束 ---
    
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
            extractDataFromDOM: extractDataFromDOM, // 添加提取数据函数，供外部调用
            handleDynamicScripts: handleDynamicScripts, // 添加处理动态脚本函数，供外部调用
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
