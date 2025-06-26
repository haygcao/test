// Baidu Phone Query Plugin - Iframe Proxy Solution
(function() {
    // --- Plugin Configuration ---
    const PLUGIN_CONFIG = {
        id: 'baiduPhoneNumberPlugin',
        name: 'Baidu Phone Lookup (iframe Proxy)',
        version: '4.91.0',
        description: 'Queries Baidu for phone number information using an iframe proxy.'
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
    '商业营销': 'Telemarketing',
    '广告推销': 'Telemarketing',
    '旅游推广': 'Telemarketing',
    '食药推销': 'Telemarketing',      
    '推销': 'Telemarketing',
};    
    // --- Constants ---
    const PROXY_SCHEME = "https";
    const PROXY_HOST = "flutter-webview-proxy.internal";
    const PROXY_PATH_FETCH = "/fetch";

    // --- State ---
    const activeIFrames = new Map();

    // --- Logging ---
    function log(message) {
        console.log(`[${PLUGIN_CONFIG.id}] ${message}`);
    }

    function logError(message, error) {
        console.error(`[${PLUGIN_CONFIG.id}] ${message}`, error);
    }

    // --- Communication with Flutter ---
    function sendToFlutter(channel, data) {
        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler(channel, JSON.stringify(data));
        } else {
            logError(`Cannot send to Flutter on channel '${channel}', handler not available.`);
        }
    }

    function sendPluginResult(result) {
        log(`Sending result to Flutter: ${JSON.stringify(result)}`);
        sendToFlutter('PluginResultChannel', result);
    }

    function sendPluginLoaded() {
        log('Plugin loaded, notifying Flutter.');
        sendToFlutter('TestPageChannel', {
            type: 'pluginLoaded',
            pluginId: PLUGIN_CONFIG.id,
            version: PLUGIN_CONFIG.version
        });
    }

    // --- Iframe Management ---
    function cleanupIframe(requestId) {
        const iframe = activeIFrames.get(requestId);
        if (iframe) {
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
            activeIFrames.delete(requestId);
            log(`Cleaned up iframe for requestId: ${requestId}`);
        }
    }

    // --- Parsing Logic (to be injected into the iframe) ---
    function getParsingScript(pluginId, phoneNumberToQuery, manualMapping) {
        return `
            (function() {
                const PLUGIN_ID = '${pluginId}';
                const PHONE_NUMBER = '${phoneNumberToQuery}';
                const manualMapping = ${JSON.stringify(manualMapping)};

                function parseBaiduPage() {
                    const result = {
                        phoneNumber: PHONE_NUMBER,
                        sourceLabel: '',
                        count: 0,
                        province: '',
                        city: '',
                        carrier: '',
                        name: '',
                        predefinedLabel: '',
                        source: PLUGIN_ID,
                        numbers: [],
                        success: false,
                        error: ''
                    };

                    try {
                        // 查找主容器 - 扩展选择器以包含更多可能的容器类型
                        const container = document.querySelector('.result-op.c-container.new-pmd, .c-container[mu], .new-pmd, div.new-pmd, .ms_company_number_2oq_O');
                        if (!container) {
                            console.log('Primary result container not found.');
                            return null; // Wait for mutation observer
                        }

                        // 尝试解析s-data属性 - 增强提取逻辑
                        let sData = null;
                        try {
                            // 首先尝试从HTML注释中提取s-data
                            const htmlContent = container.innerHTML;
                            const sDataMatch = htmlContent.match(/<!--s-data:(.*?)-->/s);
                            if (sDataMatch && sDataMatch[1]) {
                                try {
                                    sData = JSON.parse(sDataMatch[1]);
                                    console.log('Successfully parsed s-data from HTML comment');
                                } catch (e) {
                                    console.log('Failed to parse s-data from HTML comment:', e);
                                }
                            }
                            
                            // 如果从注释中提取失败，尝试从元素属性中提取
                            if (!sData) {
                                // 查找包含s-data的元素 - 扩展选择器
                                const sDataElements = document.querySelectorAll('div[data-s-data], div[data-sdata], .new-pmd, [data-s-data], [data-sdata], div.new-pmd, div[s-data], .ms_company_number_2oq_O');
                                
                                for (let i = 0; i < sDataElements.length && !sData; i++) {
                                    const element = sDataElements[i];
                                    // 尝试多种可能的属性名
                                    const sDataStr = element.getAttribute('data-s-data') || 
                                                    element.getAttribute('data-sdata') || 
                                                    element.getAttribute('s-data');
                                    
                                    if (sDataStr) {
                                        try {
                                            sData = JSON.parse(sDataStr);
                                            console.log('Successfully parsed s-data from element attribute');
                                            break;
                                        } catch (e) {
                                            console.log('Failed to parse s-data from element attribute:', e);
                                        }
                                    }
                                }
                            }
                            
                            // 如果仍然没有找到s-data，尝试从整个文档中查找注释
                            if (!sData) {
                                const docHtml = document.documentElement.innerHTML;
                                const allComments = docHtml.match(/<!--s-data:(.*?)-->/gs);
                                if (allComments && allComments.length > 0) {
                                    for (const comment of allComments) {
                                        const dataMatch = comment.match(/<!--s-data:(.*?)-->/s);
                                        if (dataMatch && dataMatch[1]) {
                                            try {
                                                sData = JSON.parse(dataMatch[1]);
                                                console.log('Successfully parsed s-data from document comment');
                                                break;
                                            } catch (e) {
                                                console.log('Failed to parse s-data from document comment:', e);
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.log('Failed to parse s-data attribute:', e);
                        }

                        // 策略1: 从s-data解析官方号码信息 - 增强判断逻辑
                        if (sData && (sData.showtitle || sData.title || (sData.tellist && sData.tellist.tel))) {
                            console.log('Parsing as Official Number via s-data.');
                            result.name = sData.showtitle || sData.title || '官方电话';
                            if (sData.tellist && sData.tellist.tel) {
                                result.numbers = sData.tellist.tel.map(t => ({ number: t.hot, name: t.name }));
                            }
                            result.success = true;
                        } 
                        // 策略2: 从s-data解析标记号码信息 - 增强判断逻辑
                        else if (sData && (sData.tag || sData.text || sData.markerTitle || sData.markerLabel)) {
                            console.log('Parsing as Marked Number via s-data.');
                            result.sourceLabel = sData.tag || sData.text || sData.markerTitle || sData.markerLabel || '商业营销';
                            result.province = sData.prov || '';
                            result.city = sData.city || '';
                            result.carrier = sData.carrier || '';
                            result.success = true;
                        } 
                        // 策略3: 从HTML解析官方号码信息
                        else {
                            console.log('s-data parsing failed or not applicable, falling back to HTML scraping.');
                            
                            // 检查是否是官方页面 - 增强判断逻辑
                            let isOfficialPage = false;
                            let officialName = '';
                            
                            // 尝试从h3标题中提取官方号码信息 - 扩展选择器
                            const officialTitleEl = container.querySelector('.c-title h3, h3 a, h3, .c-title a, .c-title');
                            if (officialTitleEl) {
                                const titleText = officialTitleEl.textContent.trim();
                                if (titleText.includes('客服') || titleText.includes('官方') || 
                                    titleText.includes('热线') || titleText.includes('服务') ||
                                    titleText.includes('电话')) {
                                    isOfficialPage = true;
                                    officialName = titleText;
                                    console.log('Detected official page from title:', officialName);
                                }
                            }
                            
                            // 检查是否有电话号码列表元素，这也是官方页面的特征 - 扩展选择器
                            const tellListElements = container.querySelectorAll('.tell-list_2FE1Z, .list-num_3MoU1, .ms_company_number_2oq_O');
                            if (tellListElements && tellListElements.length > 0) {
                                isOfficialPage = true;
                                console.log('Detected official page from tell-list elements');
                            }
                            
                            // 如果是官方页面
                            if (isOfficialPage) {
                                console.log('Parsing as Official Number via HTML title.');
                                result.name = officialName || '官方电话';
                                
                                // 尝试提取电话号码列表 - 方法1：使用特定类选择器
                                const numberContainers = container.querySelectorAll('.tell-list_2FE1Z');
                                if (numberContainers && numberContainers.length > 0) {
                                    numberContainers.forEach(container => {
                                        const numberEl = container.querySelector('.list-num_3MoU1');
                                        const nameEl = container.querySelector('.list-title_22Pkn');
                                        if (numberEl && nameEl) {
                                            const number = numberEl.textContent.trim();
                                            const name = nameEl.textContent.trim();
                                            if (number) result.numbers.push({ number, name });
                                        }
                                    });
                                }
                                
                                // 方法2：如果方法1没有找到号码，尝试其他选择器
                                if (result.numbers.length === 0) {
                                    const numberEls = container.querySelectorAll('.list-num_3MoU1');
                                    const nameEls = container.querySelectorAll('.list-title_22Pkn');
                                    
                                    if (numberEls.length === nameEls.length) {
                                        for (let i = 0; i < numberEls.length; i++) {
                                            const number = numberEls[i].textContent.trim();
                                            const name = nameEls[i].textContent.trim();
                                            if (number) result.numbers.push({ number, name });
                                        }
                                    }
                                }
                                
                                // 方法3：直接查找特定的电话号码元素
                                if (result.numbers.length === 0) {
                                    const allNumberElements = document.querySelectorAll('.list-num_3MoU1, .tell-list_2FE1Z .list-num_3MoU1');
                                    allNumberElements.forEach(el => {
                                        const number = el.textContent.trim();
                                        if (number) {
                                            // 尝试找到相关的名称元素
                                            let name = '客服电话';
                                            const parentEl = el.closest('.tell-list_2FE1Z');
                                            if (parentEl) {
                                                const nameEl = parentEl.querySelector('.list-title_22Pkn');
                                                if (nameEl) {
                                                    name = nameEl.textContent.trim();
                                                }
                                            }
                                            result.numbers.push({ number, name });
                                        }
                                    });
                                }
                                
                                result.success = result.numbers.length > 0;
                            } 
                            // 策略4: 从HTML解析标记号码信息
                            else {
                                // 检查是否是标记号码页面
                                let isMarkedPage = false;
                                let markerLabel = '';
                                
                                // 尝试多种可能的标记元素选择器 - 扩展选择器
                                const possibleLabelSelectors = [
                                    '.cc-title_31ypU', 
                                    '.op_mobilephone_label', 
                                    '.marker-color_3IDoi', 
                                    '.c-text-red-border',
                                    '.c-row.c-gap-top-cc.cc-title_31ypU',
                                    '.c-row .marker-color_3IDoi',
                                    '.c-row .c-text-red-border'
                                ];
                                
                                for (const selector of possibleLabelSelectors) {
                                    const labelEl = container.querySelector(selector);
                                    if (labelEl) {
                                        const labelText = labelEl.textContent.replace('标记：', '').trim();
                                        if (labelText) {
                                            isMarkedPage = true;
                                            markerLabel = labelText.split(/\s+/)[0];
                                            console.log('Detected marked page with label:', markerLabel);
                                            break;
                                        }
                                    }
                                }
                                
                                // 如果没有找到标记，但有特定的标记页面结构，也认为是标记页面
                                if (!isMarkedPage) {
                                    const markerStructure = container.querySelector('.c-row.c-gap-top-xsmall, .mark-tip_3WkLJ');
                                    if (markerStructure) {
                                        isMarkedPage = true;
                                        // 尝试从结构中提取标记文本
                                        markerLabel = markerStructure.textContent.trim();
                                        if (markerLabel.includes('商业营销')) {
                                            markerLabel = '商业营销';
                                        }
                                        console.log('Detected marked page from structure with label:', markerLabel);
                                    }
                                }
                                
                                // 备用方案：如果仍然没有找到标记，但页面结构符合标记页面特征
                                if (!isMarkedPage) {
                                    // 检查是否有特定的div结构
                                    const divRows = container.querySelectorAll('.c-row');
                                    for (const row of divRows) {
                                        const rowText = row.textContent.trim();
                                        if (rowText.includes('商业营销') || rowText.includes('用户标记')) {
                                            isMarkedPage = true;
                                            markerLabel = '商业营销';
                                            console.log('Detected marked page from row text:', rowText);
                                            break;
                                        }
                                    }
                                }
                                
                                if (isMarkedPage) {
                                    console.log('Parsing as Marked Number via HTML label.');
                                    result.sourceLabel = markerLabel || '商业营销'; // 默认值，如果无法提取
                                    
                                    // 尝试提取位置信息 - 扩展选择器
                                    const locationSelectors = [
                                        '.cc-row_dDm_G', 
                                        '.op_mobilephone_location', 
                                        '.c-row.c-gap-top.c-gap-top-cc',
                                        '.c-row.c-gap-top-cc',
                                        '.c-row:not(.c-gap-top-cc):not(.c-gap-top-xsmall)'
                                    ];
                                    
                                    for (const selector of locationSelectors) {
                                        const locationEls = container.querySelectorAll(selector);
                                        for (const locationEl of locationEls) {
                                            const locText = locationEl.textContent.replace('归属地：', '').trim();
                                            if (locText && !locText.includes('商业营销') && !locText.includes('用户标记')) {
                                                const parts = locText.split(/\s+/);
                                                result.province = parts[0] || '';
                                                result.city = parts[1] || '';
                                                result.carrier = parts[2] || '';
                                                console.log('Found location info:', locText);
                                                break;
                                            }
                                        }
                                        if (result.province) break;
                                    }
                                    
                                    result.success = true;
                                }
                            }
                        }

                        // 根据sourceLabel设置predefinedLabel
                        if (result.sourceLabel && manualMapping[result.sourceLabel]) {
                            result.predefinedLabel = manualMapping[result.sourceLabel];
                            console.log('Set predefinedLabel to:', result.predefinedLabel, 'from sourceLabel:', result.sourceLabel);
                        }

                        if (!result.success) {
                            console.log('All parsing strategies failed.');
                            return null;
                        }
                                    result.success = true;
                                } else {
                                    result.name = container.querySelector('h3 a')?.textContent.trim() || '';
                                    const numberNodes = container.querySelectorAll('.tell-list_2FE1Z, .c-row');
                                    numberNodes.forEach(node => {
                                        const numberEl = node.querySelector('.list-num_3MoU1, .list-num');
                                        const nameEl = node.querySelector('.list-title_22Pkn, .list-title');
                                        if (numberEl && nameEl) {
                                            const number = numberEl.textContent.trim();
                                            const name = nameEl.textContent.trim();
                                            if (number) result.numbers.push({ number, name });
                                        }
                                    });
                                    result.success = result.numbers.length > 0;
                                }
                            }
                        }

                        // If after all strategies, we have no specific data, it's a failure for this parser.
                        if (!result.success) {
                            console.log('All parsing strategies failed for the container.');
                            // We don't set success to true here, let the observer decide if it's a final failure.
                            return null; // Return null to indicate parsing was inconclusive
                        }
                        
                        console.log('No parsable content found.');

                        // Use the global manualMapping to set predefinedLabel from sourceLabel
                        if (result.sourceLabel) {
                            for (const key in manualMapping) {
                                if (result.sourceLabel.includes(key)) {
                                    result.predefinedLabel = manualMapping[key];
                                    break; // Stop after first match
                                }
                            }
                        }

                        if (result.numbers.length > 0 || result.phoneNumber) {
                            result.success = true;
                        } else {
                            // If we are here and have no number, it means parsing failed.
                            // Returning null is better to let the observer know to keep trying.
                            return null;
                        }

                        // Final cleanup of the returned object to match user request
                        const finalResult = {
                            phoneNumber: result.phoneNumber,
                            sourceLabel: result.sourceLabel,
                            count: result.count,
                            province: result.province,
                            city: result.city,
                            carrier: result.carrier,
                            name: result.name,
                            predefinedLabel: result.predefinedLabel,
                            source: result.source,
                            numbers: result.numbers,
                            success: result.success,
                            error: result.error
                        };

                        return finalResult;

                    } catch (e) {
                        console.error('Error parsing Baidu page:', e);
                        result.error = e.toString();
                        result.success = false;
                        return result;
                    }
                }

                const observer = new MutationObserver((mutations, obs) => {
                    const result = parseBaiduPage();
                    if (result) {
                        // Only send message if parsing was successful or resulted in an error
                        if (result.success || result.error) {
                             window.parent.postMessage({ type: 'phoneQueryResult', data: result }, '*');
                             obs.disconnect();
                        }
                    }
                });

                observer.observe(document.body, { childList: true, subtree: true });

                // Also try parsing immediately in case content is already there
                const initialResult = parseBaiduPage();
                if (initialResult) {
                    if (initialResult.success || initialResult.error) {
                        window.parent.postMessage({ type: 'phoneQueryResult', data: initialResult }, '*');
                        observer.disconnect();
                    }
                }
            })();
        `;
    }

    // --- Main Query Function ---
    function initiateQuery(phoneNumber, requestId) {
        log(`Initiating query for '${phoneNumber}' with requestId: ${requestId}`);

        try {
            const targetSearchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(phoneNumber)}&ie=utf-8`;
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
            };
            const proxyUrl = `${PROXY_SCHEME}://${PROXY_HOST}${PROXY_PATH_FETCH}?targetUrl=${encodeURIComponent(targetSearchUrl)}&headers=${encodeURIComponent(JSON.stringify(headers))}`;
            log(`Using proxy URL: ${proxyUrl}`);

            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.sandbox = 'allow-scripts allow-same-origin'; // Necessary for script injection and postMessage
            activeIFrames.set(requestId, iframe);

            iframe.onload = function() {
                log(`Iframe loaded for requestId: ${requestId}. Posting script for execution.`);
                try {
                    // 使用 postMessage 发送要执行的脚本
                    iframe.contentWindow.postMessage({
                        type: 'executeScript',
                        script: getParsingScript(PLUGIN_CONFIG.id, phoneNumber, manualMapping)
                    }, '*'); // 在生产环境中，应指定确切的目标源
                    log(`Parsing script posted to iframe for requestId: ${requestId}`);
                } catch (e) {
                    logError(`Error posting script to iframe for requestId ${requestId}:`, e);
                    sendPluginResult({ requestId, success: false, error: `postMessage failed: ${e.message}` });
                    cleanupIframe(requestId);
                }
            };

            iframe.onerror = function(error) {
                logError(`Iframe error for requestId ${requestId}:`, error);
                sendPluginResult({ requestId, success: false, error: `Iframe loading failed: ${error}` });
                cleanupIframe(requestId);
            };

            document.body.appendChild(iframe);
            iframe.src = proxyUrl;

            // Timeout for the whole operation
            setTimeout(() => {
                if (activeIFrames.has(requestId)) {
                    logError(`Query timeout for requestId: ${requestId}`);
                    sendPluginResult({ requestId, success: false, error: 'Query timed out after 30 seconds' });
                    cleanupIframe(requestId);
                }
            }, 30000);

        } catch (error) {
            logError(`Error initiating query for requestId ${requestId}:`, error);
            sendPluginResult({ requestId, success: false, error: `Query initiation failed: ${error.message}` });
        }
    }
    
    /**
     * This is the main entry point called by external code.
     * It was missing in the previous incorrect version.
     */
    function generateOutput(phoneNumber, nationalNumber, e164Number, requestId) {
        log(`generateOutput called for requestId: ${requestId}`);
        // For Baidu, we typically only need one number, let's use the first valid one.
        const numberToQuery = phoneNumber || nationalNumber || e164Number;
        if (numberToQuery) {
            initiateQuery(numberToQuery, requestId);
        } else {
            const errorMsg = 'No valid phone number provided.';
            logError(errorMsg);
            sendPluginResult({ requestId, success: false, error: errorMsg });
        }
    }

    // --- Event Listener for iframe results ---
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'phoneQueryResult') {
            let requestId = null;
            // Find which iframe sent this message
            for (const [id, iframe] of activeIFrames.entries()) {
                if (iframe.contentWindow === event.source) {
                    requestId = id;
                    break;
                }
            }

            if (requestId) {
                log(`Received result via postMessage for requestId: ${requestId}`);
                const result = { requestId, ...event.data.data };
                sendPluginResult(result);
                cleanupIframe(requestId);
            } else {
                logWarn('Received postMessage result from an unknown iframe.');
            }
        }
    });

    // --- Plugin Initialization ---
    function initialize() {
        if (window.plugin && window.plugin[PLUGIN_CONFIG.id]) {
            log('Plugin already initialized.');
            return;
        }

        if (!window.plugin) {
            window.plugin = {};
        }

        window.plugin[PLUGIN_CONFIG.id] = {
            info: PLUGIN_CONFIG,
            generateOutput: generateOutput // Main entry point
        };

        log(`Plugin registered under window.plugin.${PLUGIN_CONFIG.id}`);

        sendPluginLoaded();
    }

    initialize();

})();
