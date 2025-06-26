// Baidu Phone Query Plugin - Iframe Proxy Solution
(function() {
    // --- Plugin Configuration ---
    const PLUGIN_CONFIG = {
        id: 'baiduPhoneNumberPlugin',
        name: 'Baidu Phone Lookup (iframe Proxy)',
        version: '4.71.0',
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
                let parsingCompleted = false;

                function parseBaiduPage() {
                    if (parsingCompleted) return null;

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
                        // --- Strategy 0: Find the correct document to parse (handle nested iframes) ---
                        let docToParse = document;
                        const nestedIframe = document.querySelector('iframe');
                        if (nestedIframe) {
                            try {
                                const innerDoc = nestedIframe.contentDocument || nestedIframe.contentWindow.document;
                                if (innerDoc.readyState !== 'uninitialized') {
                                    console.log('Found nested iframe. Switching context to its document.');
                                    docToParse = innerDoc;
                                } else {
                                     console.log('Nested iframe found, but its document is not ready yet.');
                                }
                            } catch (e) {
                                console.warn('Could not access nested iframe, likely cross-origin. Parsing main document.', e);
                            }
                        }

                        // --- Strategy 1: Find the main container in the target document ---
                        const container = docToParse.querySelector('.result-op.c-container.new-pmd, .c-container[mu], #results, #content_left');
                        if (!container) {
                            console.log('Primary result container not found in the target document.');
                            return null; // Wait for mutation observer
                        }

                        // --- Strategy 2: Parse s-data from attribute or HTML comment ---
                        let sData = null;
                        try {
                            const sDataContainer = container.querySelector('[data-s-data], [data-sdata]');
                            const sDataString = sDataContainer ? (sDataContainer.dataset.sData || sDataContainer.dataset.sdata) : null;
                            if (sDataString) {
                                sData = JSON.parse(sDataString);
                                console.log('Parsed s-data from data attribute.');
                            } else {
                                const commentNodes = Array.from(docToParse.evaluate("//comment()", docToParse, null, XPathResult.ANY_TYPE, null));
                                for (const comment of commentNodes) {
                                    const match = comment.textContent.match(/s-data:\s*({.*})/);
                                    if (match && match[1]) {
                                        sData = JSON.parse(match[1]);
                                        console.log('Parsed s-data from HTML comment.');
                                        break;
                                    }
                                }
                            }
                        } catch (e) {
                            console.log('Failed to find or parse s-data:', e);
                        }

                        if (sData) {
                            if (sData.tellist || sData.showtitle || sData.officialUrl || (sData.disp_data && sData.disp_data.length > 0 && sData.disp_data[0].p_tel)) {
                                console.log('Parsing as Official Number via s-data.');
                                result.name = sData.showtitle || sData.title || (sData.disp_data && sData.disp_data[0].p_name) || container.querySelector('h3')?.textContent.trim() || '';
                                if (sData.tellist && sData.tellist.tel) {
                                    result.numbers = sData.tellist.tel.map(t => ({ number: t.hot, name: t.name }));
                                } else if (sData.disp_data && sData.disp_data[0].p_tel) {
                                    result.numbers.push({ number: sData.disp_data[0].p_tel, name: '官方号码' });
                                }
                                result.predefinedLabel = 'Customer Service';
                                result.success = true;
                            } else if (sData.tag || sData.markerTitle) {
                                console.log('Parsing as Marked Number via s-data.');
                                result.sourceLabel = sData.tag || sData.markerTitle.replace(/标记为：/, '') || '';
                                result.count = parseInt(sData.count, 10) || 0;
                                result.province = sData.prov || '';
                                result.city = sData.city || '';
                                result.carrier = sData.carrier || '';
                                result.success = true;
                            }
                        }

                        // --- Strategy 3: HTML Scraping if s-data fails ---
                        if (!result.success) {
                            console.log('s-data parsing failed, falling back to HTML scraping.');
                            const officialTitleEl = container.querySelector('.op-zx-title, .c-title h3, h3.t, .op_official_title');
                            if (officialTitleEl && /官方|客服/.test(officialTitleEl.textContent)) {
                                console.log('Parsing as Official Number via HTML scraping.');
                                result.name = officialTitleEl.textContent.trim();
                                const numberNodes = container.querySelectorAll('.tell-list_2FE1Z .c-row, .c-row.c-gap-top-small, .op_mobilephone_content');
                                numberNodes.forEach(node => {
                                    const numberEl = node.querySelector('.list-num_3MoU1, [class*="op_mobilephone_number"], .op_mobilephone_number');
                                    const nameEl = node.querySelector('.list-title_22Pkn, .op_mobilephone_name');
                                    if (numberEl) {
                                        const number = numberEl.textContent.trim();
                                        const name = nameEl ? nameEl.textContent.trim() : '号码';
                                        if (number) result.numbers.push({ number, name });
                                    }
                                });
                                if(result.numbers.length > 0) {
                                    result.predefinedLabel = 'Customer Service';
                                    result.success = true;
                                }
                            } else {
                                const labelEl = container.querySelector('.op_mobilephone_label, .cc-title_31ypU, [class*="op_mobilephone_tag"]');
                                if (labelEl) {
                                    console.log('Parsing as Marked Number via HTML scraping.');
                                    result.sourceLabel = labelEl.textContent.replace(/标记：|标记为：/, '').trim().split(/\s+/)[0];
                                    const locationEl = container.querySelector('.op_mobilephone_location, .cc-row_dDm_G, [class*="op_mobilephone_addr"]');
                                    if (locationEl) {
                                        const locText = locationEl.textContent.replace(/归属地：/, '').trim();
                                        const parts = locText.split(/\s+/);
                                        result.province = parts[0] || '';
                                        result.city = parts[1] || '';
                                        result.carrier = parts[2] || '';
                                    }
                                    result.success = true;
                                }
                            }
                        }

                        // --- Strategy 4: Final Mapping and Validation ---
                        if (result.success) {
                            if (result.sourceLabel) {
                                for (const key in manualMapping) {
                                    if (result.sourceLabel.includes(key)) {
                                        result.predefinedLabel = manualMapping[key];
                                        break;
                                    }
                                }
                            }
                            if (result.numbers.length === 0 && result.predefinedLabel === 'Customer Service') {
                                result.numbers.push({ number: PHONE_NUMBER, name: '主号码' });
                            }
                            return result;
                        }

                        return null; // Indicate parsing was inconclusive

                    } catch (e) {
                        console.error('Error parsing Baidu page:', e);
                        result.error = e.toString();
                        result.success = false;
                        return result;
                    }
                }

                function attemptParseAndFinish(observer) {
                    const result = parseBaiduPage();
                    if (result) {
                        parsingCompleted = true;
                        window.parent.postMessage({ type: 'phoneQueryResult', data: result }, '*');
                        if (observer) observer.disconnect();
                        console.log('Parsing complete. Observer disconnected.');
                    }
                }

                const observer = new MutationObserver(() => attemptParseAndFinish(observer));
                observer.observe(document.body, { childList: true, subtree: true });
                console.log('MutationObserver started on main document body.');

                // Also try parsing immediately and after a short delay
                setTimeout(() => attemptParseAndFinish(observer), 100); 
                setTimeout(() => attemptParseAndFinish(observer), 500); 
                setTimeout(() => attemptParseAndFinish(observer), 1500); // A final attempt
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
