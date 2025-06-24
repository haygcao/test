// Baidu Phone Query Plugin - Iframe Proxy Solution
(function() {
    // --- Plugin Configuration ---
    const PLUGIN_CONFIG = {
        id: 'baiduPhoneNumberPlugin',
        name: 'Baidu Phone Lookup (iframe Proxy)',
        version: '4.1.0',
        description: 'Queries Baidu for phone number information using an iframe proxy.'
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
    function getParsingScript() {
        return `
            (function() {
                function parseBaiduPage() {
                    const result = {
                        phoneNumber: '',
                        sourceLabel: '',
                        predefinedLabel: '',
                        province: '',
                        city: '',
                        carrier: '',
                        name: '',
                        count: 0,
                        success: false
                    };

                    try {
                        // Example: Find the main result container
                        const container = document.querySelector('.c-container[mu]');
                        if (!container) {
                             console.log('Main container not found.');
                             return null; // Not ready yet
                        }

                        const phoneText = container.querySelector('h3 > a')?.textContent || '';
                        const phoneMatch = phoneText.match(/[0-9\-]+/);
                        if(phoneMatch) result.phoneNumber = phoneMatch[0];

                        const opContainer = container.querySelector('.op_mobilephone_container');
                        if(opContainer) {
                            const locationEl = opContainer.querySelector('.op_mobilephone_location');
                            if(locationEl) {
                                const locText = locationEl.textContent.replace('归属地：', '').trim();
                                const parts = locText.split(/\s+/);
                                result.province = parts[0] || '';
                                result.city = parts[1] || '';
                                result.carrier = parts[2] || '';
                            }
                            const labelEl = opContainer.querySelector('.op_mobilephone_label');
                            if(labelEl) {
                                result.sourceLabel = labelEl.textContent.replace('标记：', '').trim();
                            }
                        }
                        
                        result.count = [result.province, result.city, result.carrier, result.sourceLabel].filter(Boolean).length;
                        result.success = result.count > 0;
                        return result;
                    } catch (e) {
                        console.error('Error parsing Baidu page:', e);
                        result.error = e.toString();
                        return result;
                    }
                }

                // Use MutationObserver to wait for the content to be ready
                const observer = new MutationObserver((mutations, obs) => {
                    const result = parseBaiduPage();
                    if (result) {
                        window.parent.postMessage({ type: 'phoneQueryResult', data: result }, '*');
                        obs.disconnect(); // Stop observing once we have a result
                    }
                });

                // Start observing
                observer.observe(document.body, { childList: true, subtree: true });

                // Also try parsing immediately in case content is already there
                const initialResult = parseBaiduPage();
                if (initialResult) {
                    window.parent.postMessage({ type: 'phoneQueryResult', data: initialResult }, '*');
                    observer.disconnect();
                }
            })();
        `;
    }

    // --- Main Query Function ---
    function initiateQuery(phoneNumber, requestId) {
        log(`Initiating query for '${phoneNumber}' with requestId: ${requestId}`);

        try {
            const baiduSearchUrl = `https://haoma.baidu.com/phoneSearch?search=${phoneNumber}&srcid=8757`;
            const proxyUrl = `${PROXY_SCHEME}://${PROXY_HOST}${PROXY_PATH_FETCH}?targetUrl=${encodeURIComponent(baiduSearchUrl)}`;
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
                        script: getParsingScript()
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
        if (window.baiduPhoneNumberPlugin) {
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
