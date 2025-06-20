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

    // --- Unified Request Function ---
    function queryPhoneInfo(phoneNumber, externalRequestId) {
        // Generate a unique ID for *this specific phone number request*
        const phoneRequestId = Math.random().toString(36).substring(2);
        console.log(`queryPhoneInfo: phone=${phoneNumber}, externalRequestId=${externalRequestId}, phoneRequestId=${phoneRequestId}`);

        const url = `https://haoma.baidu.com/phoneSearch?search=${phoneNumber}&srcid=8757`;
        const method = 'GET';
        // 使用空headers对象，让sendRequest函数统一处理headers
        const headers = {};
        const body = null;

        // Pass BOTH the externalRequestId AND the internal phoneRequestId
        sendRequest(url, method, headers, body, externalRequestId, phoneRequestId);
    }

    // sendRequest function (now accepts both request IDs and handles CORS properly)
    function sendRequest(url, method, headers, body, externalRequestId, phoneRequestId) {
        // 确保所有百度域名都在同一个headers下，解决CORS问题
        const enhancedHeaders = {
            ...headers,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            'Referer': 'https://www.baidu.com/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Connection': 'keep-alive',
            'Origin': 'https://www.baidu.com',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        };

        const requestData = {
            url: url,
            method: method,
            headers: enhancedHeaders,
            body: body,
            externalRequestId: externalRequestId, // Include externalRequestId
            phoneRequestId: phoneRequestId,     // Include phoneRequestId
            pluginId: pluginId,
            // 添加CORS相关设置
            credentials: 'include',
            mode: 'cors',
            redirect: 'follow'
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

    // 完整替换整个HTML文档 - 自然加载所有内容，不进行任何人为控制
    function replaceEntireDocument(htmlString) {
        try {
            console.log('Starting document replacement...');
            console.log('Original HTML length:', htmlString.length);
            
            // 创建一个iframe来加载完整的HTML内容
            const iframe = document.createElement('iframe');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.style.position = 'fixed';
            iframe.style.top = '0';
            iframe.style.left = '0';
            iframe.style.zIndex = '9999';
            
            // 清空当前文档内容
            document.body.innerHTML = '';
            document.body.appendChild(iframe);
            
            // 获取iframe的document对象
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            
            // 设置必要的CORS头，确保所有百度域名都在同一个headers下
            const meta = iframeDoc.createElement('meta');
            meta.httpEquiv = 'Content-Security-Policy';
            meta.content = 'default-src * data: blob: \'unsafe-inline\' \'unsafe-eval\'; connect-src * data: blob: \'unsafe-inline\'; script-src * data: blob: \'unsafe-inline\' \'unsafe-eval\'; style-src * data: blob: \'unsafe-inline\';';
            
            // 写入完整的HTML内容，保持原始结构不变
            iframeDoc.open();
            iframeDoc.write('<!DOCTYPE html><html><head>');
            iframeDoc.write('<meta charset="utf-8">');
            iframeDoc.write(meta.outerHTML);
            
            // 提取并写入head内容
            const headMatch = htmlString.match(/<head[^>]*>(([\s\S](?!<\/head>))*[\s\S]*?)<\/head>/i);
            if (headMatch && headMatch[1]) {
                iframeDoc.write(headMatch[1]);
            }
            
            iframeDoc.write('</head><body>');
            
            // 提取并写入body内容
            const bodyMatch = htmlString.match(/<body[^>]*>(([\s\S](?!<\/body>))*[\s\S]*?)<\/body>/i);
            if (bodyMatch && bodyMatch[1]) {
                iframeDoc.write(bodyMatch[1]);
            } else {
                // 如果没有找到body标签，尝试写入整个HTML内容
                iframeDoc.write(htmlString);
            }
            
            iframeDoc.write('</body></html>');
            iframeDoc.close();
            
            console.log('Document replacement completed successfully');
            
            // 返回iframe的document对象，以便后续操作
            return iframeDoc;
        } catch (error) {
            console.error('Critical error in replaceEntireDocument:', error);
            
            // 最终备用方案：直接写入HTML
            document.open();
            document.write(htmlString);
            document.close();
            
            return document;
        }
    }

    // handleResponse 函数 (修改后适应iframe方式)
    function handleResponse(response) {
        console.log('handleResponse called with:', response);

        if (response.status >= 200 && response.status < 300) {
            // 使用完整文档替换方法，返回iframe的document对象
            const iframeDoc = replaceEntireDocument(response.responseText);
            
            // 创建一个计时器变量，用于超时检测
            let timeoutTimer = null;
            let maxWaitTime = 15000; // 等待时间15秒
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
                
                // 从iframe的document中查找元素
                const reportWrapper = iframeDoc.querySelector('.report-wrapper');
                if (reportWrapper && reportWrapper.textContent.trim() !== "") {
                    observer.disconnect();
                    if (timeoutTimer) clearTimeout(timeoutTimer);
                    
                    // 从iframe的DOM中解析数据
                    let result = extractDataFromRegularDOM(iframeDoc, response.phoneNumber);
                    processAndSendResult(result, response.externalRequestId);
                    return;
                }
                
                // 尝试查找root元素，确认页面是否已加载
                const rootElement = iframeDoc.querySelector('#root');
                if (rootElement && rootElement.children.length > 0) {
                    // 如果页面已加载但没有找到report-wrapper，再等待一段时间
                    if (Date.now() - startTime > maxWaitTime / 2) {
                        observer.disconnect();
                        if (timeoutTimer) clearTimeout(timeoutTimer);
                        
                        // 尝试从页面中提取任何可用数据
                        let result = extractDataFromRegularDOM(iframeDoc, response.phoneNumber);
                        processAndSendResult(result, response.externalRequestId);
                        return;
                    }
                }
            });

            const config = { childList: true, subtree: true, characterData: true, attributes: true };
            observer.observe(iframeDoc.body, config);
            
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
    function parseResponse(doc, phoneNumber) {
        return extractDataFromRegularDOM(doc, phoneNumber);
    }

    // 统一使用extractDataFromRegularDOM函数处理DOM数据提取
    function extractDataFromRegularDOM(doc, phoneNumber) {
        console.log('extractDataFromRegularDOM called with document');
        
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
            const reportWrapper = doc.querySelector('.report-wrapper');
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
            const locationElement = doc.querySelector('.location');
            if (locationElement) {
                const locationText = locationElement.textContent.trim();
                const match = locationText.match(/([一-龥]+)[\s ]*([一-龥]+)?/);
                if (match) {
                    result.province = match[1] || '';
                    result.city = match[2] || '';
                }
            }

            // 尝试提取电话号码
            const telNumElement = doc.querySelector('.tel-num');
            if (telNumElement && !result.phoneNumber) {
                result.phoneNumber = telNumElement.textContent.trim();
            }

            // 尝试提取更多信息
            const telInfoElement = doc.querySelector('.tel-info');
            if (telInfoElement) {
                // 可能包含更多信息，如运营商等
                console.log('Found tel-info element, content:', telInfoElement.textContent);
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
