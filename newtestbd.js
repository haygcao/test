// Baidu Phone Query Plugin - Iframe Proxy Solution
(function() {
    // --- Plugin Configuration ---
    const PLUGIN_CONFIG = {
        id: 'baiduPhoneNumberPlugin',
        name: 'Baidu Phone Lookup (iframe Proxy)',
        version: '5.0.0',
        description: 'Queries Baidu for phone number information using an iframe proxy and postMessage.'
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
        '中介': 'Agent',
        '房产中介': 'Agent',
        '违规催收': 'Debt Collection',
        '快递物流': 'Delivery',
        '快递': 'Delivery',
        '教育培训': 'Education',
        '金融': 'Financial',
        '股票证券': 'Financial',
        '保险理财': 'Financial',
        '涉诈电话': 'Fraud Scam Likely',
        '诈骗': 'Fraud Scam Likely',
        '招聘': 'Recruiter',
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
        '骚扰电话': 'Spam Likely',
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
        console.log(`[${PLUGIN_CONFIG.id} v${PLUGIN_CONFIG.version}] ${message}`);
    }

    function logError(message, error) {
        console.error(`[${PLUGIN_CONFIG.id} v${PLUGIN_CONFIG.version}] ${message}`, error);
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

    // --- Core Logic: Script Generation and Query Initiation ---

    /**
     * Creates the script that will be executed inside the Baidu iframe.
     * This script performs the actual data parsing.
     */
    function getActualParsingLogic(pluginId, phoneNumberToQuery) {
        return `
            (function() {
                console.log('[Baidu-Parser] Executing inside iframe for: ${phoneNumberToQuery}');
                let results = [];
                let found = false;
                try {
                    const containers = document.querySelectorAll('#content_left > div.c-container');
                    console.log(\"[Baidu-Parser] Found \${containers.length} result containers.\");

                    containers.forEach((container, index) => {
                        const titleElement = container.querySelector('h3 a');
                        const snippetElement = container.querySelector('.c-abstract, .c-span-last');
                        if (titleElement) {
                            const title = titleElement.innerText.trim();
                            const url = titleElement.href;
                            const snippet = snippetElement ? snippetElement.innerText.trim() : '';
                            if (title.includes('${phoneNumberToQuery}') || snippet.includes('${phoneNumberToQuery}')) {
                                console.log(\"[Baidu-Parser] Match in container #\${index + 1}: \${title}\");
                                results.push({ title, url, snippet });
                                found = true;
                            }
                        }
                    });

                    if (!found && document.body.innerText.includes('${phoneNumberToQuery}')) {
                        console.log('[Baidu-Parser] Phone number found in raw page content.');
                        found = true;
                    }
                } catch (e) {
                    console.error('[Baidu-Parser] Parsing error:', e);
                    window.parent.postMessage({ type: 'phoneQueryResult', data: { pluginId: '${pluginId}', success: false, error: 'Parsing script failed: ' + e.toString(), phoneNumber: '${phoneNumberToQuery}' }}, '*');
                    return;
                }

                console.log(\"[Baidu-Parser] Parsing complete. Found: \${found}. Sending results.\");
                window.parent.postMessage({ type: 'phoneQueryResult', data: { pluginId: '${pluginId}', success: true, found, results, phoneNumber: '${phoneNumberToQuery}', source: 'Baidu Search' }}, '*');
            })();
        `;
    }

    /**
     * Creates the loader script that runs in the main plugin document.
     * Its only job is to post the actual parsing script into the iframe.
     */
    function getLoaderScript(pluginId, phoneNumberToQuery) {
        const actualParsingLogic = getActualParsingLogic(pluginId, phoneNumberToQuery);
        return `
          (function() {
            console.log('[Baidu-Loader] Attempting to post parsing script to iframe...');
            const iframe = document.querySelector('iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({ 
                    type: 'executeScript', 
                    script: \`${actualParsingLogic.replace(/`/g, '\\`')}\`
                }, '*');
                console.log('[Baidu-Loader] Script posted to iframe.');
            } else {
                console.error('[Baidu-Loader] Could not find iframe.');
                window.flutter_inappwebview.callHandler('phoneQueryResult', { pluginId: '${pluginId}', success: false, error: 'Could not find iframe element.', phoneNumber: '${phoneNumberToQuery}' });
            }
          })();
        `;
    }

    /**
     * Initiates the phone number query by creating and managing an iframe.
     */
    function initiateQuery(phoneNumber, requestId) {
        log(`Initiating query for '${phoneNumber}' (requestId: ${requestId})`);

        try {
            const targetSearchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(phoneNumber)}&ie=utf-8`;
            const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36' };
            const proxyUrl = `${PROXY_SCHEME}://${PROXY_HOST}${PROXY_PATH_FETCH}?targetUrl=${encodeURIComponent(targetSearchUrl)}&headers=${encodeURIComponent(JSON.stringify(headers))}`;
            log(`Iframe proxy URL: ${proxyUrl}`);

            const iframe = document.createElement('iframe');
            iframe.id = `query-iframe-${requestId}`;
            iframe.style.display = 'none';
            iframe.sandbox = 'allow-scripts allow-same-origin';
            activeIFrames.set(requestId, iframe);

            iframe.onload = function() {
                log(`Iframe loaded for requestId ${requestId}.`);
                const loaderScript = getLoaderScript(PLUGIN_CONFIG.id, phoneNumber);
                try {
                    eval(loaderScript);
                } catch (e) {
                    logError(`Error evaluating loader script for requestId ${requestId}:`, e);
                    sendPluginResult({ requestId, success: false, error: `Failed to eval loader script: ${e.message}` });
                    cleanupIframe(requestId);
                }
            };

            iframe.onerror = function() {
                logError(`Iframe error for requestId ${requestId}`);
                sendPluginResult({ requestId, success: false, error: 'Iframe loading failed.' });
                cleanupIframe(requestId);
            };

            document.body.appendChild(iframe);
            iframe.src = proxyUrl;

            setTimeout(() => {
                if (activeIFrames.has(requestId)) {
                    logError(`Query timeout for requestId: ${requestId}`);
                    sendPluginResult({ requestId, success: false, error: 'Query timed out after 30 seconds' });
                    cleanupIframe(requestId);
                }
            }, 30000);

        } catch (error) {
            logError(`Error in initiateQuery for requestId ${requestId}:`, error);
            sendPluginResult({ requestId, success: false, error: `Query initiation failed: ${error.message}` });
        }
    }

    /**
     * Main entry point called by the application.
     */
    function generateOutput(phoneNumber, nationalNumber, e164Number, requestId) {
        log(`generateOutput called for requestId: ${requestId}`);
        const numberToQuery = phoneNumber || nationalNumber || e164Number;
        if (numberToQuery) {
            initiateQuery(numberToQuery, requestId);
        } else {
            sendPluginResult({ requestId, success: false, error: 'No valid phone number provided.' });
        }
    }

    // --- Event Listener for iframe results ---
    window.addEventListener('message', function(event) {
        // Basic validation of the message
        if (!event.data || event.data.type !== 'phoneQueryResult' || !event.data.data || !event.data.data.pluginId) {
            return;
        }

        // Ensure the message is from our plugin
        if (event.data.data.pluginId !== PLUGIN_CONFIG.id) {
            return;
        }

        let requestId = null;
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
            logError('Received postMessage from an untracked iframe.', event.data);
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
            generateOutput: generateOutput
        };

        log(`Plugin registered: window.plugin.${PLUGIN_CONFIG.id}`);
        sendPluginLoaded();
    }

    initialize();

})();
