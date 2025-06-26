// Baidu Phone Query Plugin - Direct Injection Solution
(function() {
    // --- Plugin Configuration ---
    const PLUGIN_CONFIG = {
        id: 'baiduPhoneNumberPlugin',
        name: 'Baidu Phone Lookup (Direct Injection)',
        version: '5.0.0',
        description: 'Queries Baidu by directly injecting a parsing script into a proxied iframe.'
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
    // This function returns the parsing script as a string to be injected.
    function getParsingScript(pluginId, phoneNumberToQuery, manualMapping, requestId) {
        const script = `
            (function() {
                const PLUGIN_ID = '${pluginId}';
                const PHONE_NUMBER = '${phoneNumberToQuery}';
                const REQUEST_ID = '${requestId}';
                const manualMapping = ${JSON.stringify(manualMapping)};

                function sendResultToParent(result) {
                    console.log('[PARSER] Sending result to parent for requestId: ' + REQUEST_ID);
                    if (window.parent && window.parent.handleIframeResult) {
                        window.parent.handleIframeResult(REQUEST_ID, result);
                    } else {
                        console.error('[PARSER] Could not find window.parent.handleIframeResult function!');
                    }
                }

                function parseContent(doc) {
                    console.log('Attempting to parse content in document with title:', doc.title);
                    const result = {
                        phoneNumber: PHONE_NUMBER, sourceLabel: '', count: 0, province: '', city: '', carrier: '',
                        name: '', predefinedLabel: '', source: PLUGIN_ID, numbers: [], success: false, error: ''
                    };

                    try {
                        const container = doc.querySelector('.result-op.c-container.new-pmd, .c-container[mu], #results, #content_left');
                        if (!container) {
                            console.log('Could not find primary result container in this document.');
                            return null; // Indicate parsing failed in this doc
                        }

                        console.log('Found result container. Now parsing for data...');
                        
                        // --- STRATEGY 1: s-data (preferred) ---
                        let sData = null;
                        try {
                            const sDataContainer = container.querySelector('[data-s-data], [data-sdata]');
                            const sDataString = sDataContainer ? (sDataContainer.dataset.sData || sDataContainer.dataset.sdata) : null;
                            if (sDataString) sData = JSON.parse(sDataString);
                        } catch (e) { console.log('Could not parse s-data attribute', e); }

                        if (sData) {
                            console.log('Successfully parsed s-data object.');
                            if (sData.tellist || sData.showtitle || (sData.disp_data && sData.disp_data[0].p_tel)) {
                                result.name = sData.showtitle || sData.title || (sData.disp_data && sData.disp_data[0].p_name) || '';
                                if (sData.tellist && sData.tellist.tel) {
                                    result.numbers = sData.tellist.tel.map(t => ({ number: t.hot, name: t.name }));
                                } else if (sData.disp_data && sData.disp_data[0].p_tel) {
                                    result.numbers.push({ number: sData.disp_data[0].p_tel, name: 'Official' });
                                }
                                result.predefinedLabel = 'Customer Service';
                                result.success = true;
                            } else if (sData.tag) {
                                result.sourceLabel = sData.tag || '';
                                result.count = parseInt(sData.count, 10) || 0;
                                result.province = sData.prov || '';
                                result.city = sData.city || '';
                                result.carrier = sData.carrier || '';
                                result.success = true;
                            }
                        }

                        // --- STRATEGY 2: HTML Scraping (fallback) ---
                        if (!result.success) {
                            console.log('s-data failed, falling back to HTML scraping.');
                            const officialTitleEl = container.querySelector('.op-zx-title, h3.t, .op_official_title');
                            if (officialTitleEl && /官方|客服/.test(officialTitleEl.textContent)) {
                                result.name = officialTitleEl.textContent.trim();
                                container.querySelectorAll('.tell-list_2FE1Z .c-row, .op_mobilephone_content').forEach(node => {
                                    const numberEl = node.querySelector('.list-num_3MoU1, .op_mobilephone_number');
                                    const nameEl = node.querySelector('.list-title_22Pkn, .op_mobilephone_name');
                                    if (numberEl) result.numbers.push({ number: numberEl.textContent.trim(), name: nameEl ? nameEl.textContent.trim() : 'Number' });
                                });
                                if (result.numbers.length > 0) {
                                    result.predefinedLabel = 'Customer Service';
                                    result.success = true;
                                }
                            } else {
                                const labelEl = container.querySelector('.op_mobilephone_label, .cc-title_31ypU');
                                if (labelEl) {
                                    result.sourceLabel = labelEl.textContent.replace(/标记：|标记为：/, '').trim().split(/\s+/)[0];
                                    const locationEl = container.querySelector('.op_mobilephone_location, .cc-row_dDm_G');
                                    if (locationEl) {
                                        const locText = locationEl.textContent.replace(/归属地：/, '').trim();
                                        const [province, city, carrier] = locText.split(/\s+/);
                                        result.province = province || ''; result.city = city || ''; result.carrier = carrier || '';
                                    }
                                    result.success = true;
                                }
                            }
                        }

                        if (result.success) {
                            if (result.sourceLabel) {
                                for (const key in manualMapping) {
                                    if (result.sourceLabel.includes(key)) { result.predefinedLabel = manualMapping[key]; break; }
                                }
                            }
                            if (result.numbers.length === 0 && result.predefinedLabel === 'Customer Service') {
                                result.numbers.push({ number: PHONE_NUMBER, name: 'Main' });
                            }
                            return result;
                        }
                        return null; // Parsing in this doc failed
                    } catch (e) {
                        console.error('Error during parsing:', e);
                        result.error = e.toString();
                        return result;
                    }
                }

                let parsingCompleted = false;
                let attempts = 0;
                const MAX_ATTEMPTS = 15; // 7.5 seconds search

                function findAndParse() {
                    if (parsingCompleted) return;
                    attempts++;
                    console.log('[PARSER] Attempt #' + attempts + ' to find and parse content.');

                    let finalResult = null;
                    if (document.readyState === 'complete' || document.readyState === 'interactive') {
                       finalResult = parseContent(document);
                    }

                    if (finalResult) {
                        parsingCompleted = true;
                        sendResultToParent(finalResult);
                    } else if (attempts < MAX_ATTEMPTS) {
                        setTimeout(findAndParse, 500);
                    } else {
                        parsingCompleted = true;
                        console.error('[PARSER] Failed to find parsable content after all attempts.');
                        console.log('[PARSER] Final document outerHTML (first 2000 chars):', document.documentElement.outerHTML.substring(0, 2000));
                        sendResultToParent({ success: false, error: 'Timeout: Could not find parsable phone data in the iframe.' });
                    }
                }

                findAndParse();
            })();
        `;
        return script;
    }

    // This function is exposed on the window so the iframe can call it.
    window.handleIframeResult = function(requestId, result) {
        log(`Received result from iframe for requestId: ${requestId}`);
        if (activeIFrames.has(requestId)) {
            const finalResult = { requestId, ...result };
            sendPluginResult(finalResult);
            cleanupIframe(requestId);
        } else {
            logError(`Received result for an unknown or timed-out requestId: ${requestId}`);
        }
    };

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
            iframe.sandbox = 'allow-scripts allow-same-origin';
            
            const timeoutId = setTimeout(() => {
                logError(`Query timeout for requestId: ${requestId}`);
                sendPluginResult({ requestId, success: false, error: 'Query timed out after 30 seconds' });
                cleanupIframe(requestId);
            }, 30000);
            
            activeIFrames.set(requestId, { iframe, timeoutId });

            iframe.onload = function() {
                log(`Iframe loaded for requestId: ${requestId}. Attempting direct script injection.`);
                try {
                    if (!iframe.contentWindow || !iframe.contentWindow.document) {
                         throw new Error("Iframe contentWindow is not accessible.");
                    }
                    
                    const doc = iframe.contentWindow.document;
                    const scriptEl = doc.createElement('script');
                    scriptEl.type = 'text/javascript';
                    scriptEl.textContent = getParsingScript(PLUGIN_CONFIG.id, phoneNumber, manualMapping, requestId);

                    (doc.head || doc.body).appendChild(scriptEl);

                    log(`Successfully injected parsing script into iframe for requestId: ${requestId}`);

                } catch (e) {
                    logError(`Error injecting script into iframe for requestId ${requestId}:`, e);
                    sendPluginResult({ requestId, success: false, error: `Script injection failed: ${e.message}` });
                    cleanupIframe(requestId);
                }
            };

            iframe.onerror = function(error) {
                logError(`Iframe loading error for requestId ${requestId}:`, error);
                sendPluginResult({ requestId, success: false, error: `Iframe loading failed.` });
                cleanupIframe(requestId);
            };

            document.body.appendChild(iframe);
            iframe.src = proxyUrl;

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

    // Event listener for postMessage is no longer needed with the direct injection method.

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
