// Baidu Phone Query Plugin - Iframe Proxy Solution
(function() {
    // --- Plugin Configuration ---
    const PLUGIN_CONFIG = {
        id: 'baiduPhoneNumberPlugin',
        name: 'Baidu Phone Lookup (iframe Proxy)',
        version: '4.81.0',
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
        // IMPORTANT: This function returns a string that will be executed inside the sandboxed iframe.
        // All functions and variables must be self-contained.
        const script = `
            (function() {
                console.log('[PARSER] Executing parsing script...');
                const PLUGIN_ID = '${pluginId}';
                const PHONE_NUMBER = '${phoneNumberToQuery}';
                const manualMapping = ${JSON.stringify(manualMapping)};
                let parsingCompleted = false;
                let attempts = 0;
                const MAX_ATTEMPTS = 10; // 10 * 500ms = 5 seconds search

                function sendResult(result) {
                    if (parsingCompleted) return;
                    parsingCompleted = true;
                    console.log('[PARSER] Sending result to parent:', result);
                    window.parent.postMessage({ type: 'phoneQueryResult', data: result }, '*');
                }

                function parseContent(doc) {
                    console.log('[PARSER] Attempting to parse content in document with title:', doc.title);
                    const result = {
                        phoneNumber: PHONE_NUMBER, sourceLabel: '', count: 0, province: '', city: '', carrier: '',
                        name: '', predefinedLabel: '', source: PLUGIN_ID, numbers: [], success: false, error: ''
                    };

                    try {
                        const container = doc.querySelector('.result-op.c-container.new-pmd, .c-container[mu], #results, #content_left');
                        if (!container) {
                            console.log('[PARSER] Could not find primary result container in this document.');
                            return null; // Indicate parsing failed in this doc
                        }

                        console.log('[PARSER] Found result container. Now parsing for data...');
                        
                        let sData = null;
                        try {
                            const sDataContainer = container.querySelector('[data-s-data], [data-sdata]');
                            const sDataString = sDataContainer ? (sDataContainer.dataset.sData || sDataContainer.dataset.sdata) : null;
                            if (sDataString) sData = JSON.parse(sDataString);
                        } catch (e) { console.log('[PARSER] Could not parse s-data attribute', e); }

                        if (sData) {
                            console.log('[PARSER] Successfully parsed s-data object.');
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

                        if (!result.success) {
                            console.log('[PARSER] s-data failed, falling back to HTML scraping.');
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
                        return null;
                    } catch (e) {
                        console.error('[PARSER] Error during parsing:', e);
                        result.error = e.toString();
                        return result;
                    }
                }

                function findAndParse() {
                    if (parsingCompleted) return;
                    attempts++;
                    console.log('[PARSER] Attempt #' + attempts + ' to find and parse content.');

                    let targetDoc = null;

                    if (document.readyState === 'complete' && document.querySelector('#content_left')) {
                        console.log('[PARSER] Found #content_left in the main document.');
                        targetDoc = document;
                    } else {
                        const frames = document.querySelectorAll('iframe');
                        console.log('[PARSER] Main document not ready or no content, found ' + frames.length + ' iframe(s).');
                        for (let i = 0; i < frames.length; i++) {
                            try {
                                const frameDoc = frames[i].contentDocument;
                                if (frameDoc && frameDoc.readyState === 'complete' && frameDoc.querySelector('#content_left')) {
                                    console.log('[PARSER] Found #content_left in a nested iframe.');
                                    targetDoc = frameDoc;
                                    break;
                                }
                            } catch (e) {
                                console.warn('[PARSER] Could not access an iframe document, likely cross-origin.');
                            }
                        }
                    }

                    if (targetDoc) {
                        console.log('[PARSER] Found target document. Parsing...');
                        const finalResult = parseContent(targetDoc);
                        if (finalResult) {
                            sendResult(finalResult);
                        } else {
                           console.log('[PARSER] Found document but parsing returned null. This might be a page without results.');
                           sendResult({ success: false, error: 'Found Baidu page, but no parsable phone data was found.' });
                        }
                    } else if (attempts < MAX_ATTEMPTS) {
                        console.log('[PARSER] Target content not found yet. Retrying in 500ms...');
                        setTimeout(findAndParse, 500);
                    } else {
                        console.error('[PARSER] Failed to find target content after all attempts.');
                        console.log('[PARSER] Final document outerHTML:', document.documentElement.outerHTML.substring(0, 3000));
                        sendResult({ success: false, error: 'Could not find the Baidu content within the iframe structure.' });
                    }
                }

                findAndParse();
            })();
        `;
        return script;
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
                log(`Iframe loaded for requestId: ${requestId}. Will post script shortly.`);
                // 短暂延时以确保 iframe 内的 message listener 已经准备好
                setTimeout(() => {
                    try {
                        log(`Posting script to iframe for requestId: ${requestId}`);
                        iframe.contentWindow.postMessage({
                            type: 'executeScript',
                            script: getParsingScript(PLUGIN_CONFIG.id, phoneNumber, manualMapping)
                        }, '*'); // 在生产环境中，应指定确切的目标源
                        log(`Script posted successfully for requestId: ${requestId}`);
                    } catch (e) {
                        logError(`Error posting script to iframe for requestId ${requestId}:`, e);
                        sendPluginResult({ requestId, success: false, error: `postMessage failed: ${e.message}` });
                        cleanupIframe(requestId);
                    }
                }, 100); // 100ms delay
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
