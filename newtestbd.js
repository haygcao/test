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
                        const container = document.querySelector('.result-op.c-container.new-pmd, .c-container[mu]');
                        if (!container) {
                            console.log('Primary result container not found.');
                            return null; // Wait for mutation observer
                        }

                        let sData = null;
                        try {
                            if (container.dataset.sData) {
                                sData = JSON.parse(container.dataset.sData);
                            }
                        } catch (e) {
                            console.log('Failed to parse s-data attribute:', e);
                        }

                        // Strategy 1: Official/Company Number (prioritize this as it's more structured)
                        if (sData && sData.showtitle) {
                            console.log('Parsing as Official Number via s-data.');
                            result.name = sData.showtitle;
                            if (sData.tellist && sData.tellist.tel) {
                                result.numbers = sData.tellist.tel.map(t => ({ number: t.hot, name: t.name }));
                            }
                            result.success = true;
                        } else if (sData && sData.tag) { // Strategy 2: Marked/Harassment Number via s-data
                            console.log('Parsing as Marked Number via s-data.');
                            result.sourceLabel = sData.tag;
                            result.province = sData.prov || '';
                            result.city = sData.city || '';
                            result.carrier = sData.carrier || '';
                            result.success = true;
                        } else {
                            console.log('s-data parsing failed or not applicable, falling back to HTML scraping.');
                            // Fallback Strategy 3: HTML Scraping for Official Number
                            const officialTitleEl = container.querySelector('.op-zx-title, .c-title, h3');
                            if (officialTitleEl && officialTitleEl.textContent.includes('官方')) {
                                console.log('Parsing as Official Number via HTML.');
                                result.name = officialTitleEl.textContent.trim();
                                result.success = true;
                            } else {
                                // Fallback Strategy 4: HTML Scraping for Marked Number
                                const labelEl = container.querySelector('.op_mobilephone_label, .cc-title_31ypU');
                                if (labelEl) {
                                    console.log('Parsing as Marked Number via HTML.');
                                    result.sourceLabel = labelEl.textContent.replace('标记：', '').trim().split(/\s+/)[0];
                                    const locationEl = container.querySelector('.op_mobilephone_location, .cc-row_dDm_G');
                                    if (locationEl) {
                                        const locText = locationEl.textContent.replace('归属地：', '').trim();
                                        const parts = locText.split(/\s+/);
                                        result.province = parts[0] || '';
                                        result.city = parts[1] || '';
                                        result.carrier = parts[2] || '';
                                    }
                                    result.success = true;
                                }
                            }
                        }

                        if (result.sourceLabel && manualMapping[result.sourceLabel]) {
                            result.predefinedLabel = manualMapping[result.sourceLabel];
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
