// Truecaller API Plugin - Iframe Proxy Solution
// Based on bd action copy.js template logic and format

(function() {
    // --- Plugin Configuration ---
    const PLUGIN_CONFIG = {
        id: 'truecallerApi',
        name: 'Truecaller API (Iframe Proxy)',
        version: '1.0.7',
        description: 'Queries Truecaller API for phone number information using an iframe proxy.'
    };

    // Standard Label Mapping
    const predefinedLabels = [
          { 'label': 'Fraud Scam Likely' },
          { 'label': 'Spam Likely' },
          { 'label': 'Telemarketing' },
          { 'label': 'Robocall' },
          { 'label': 'Delivery' },
          { 'label': 'Takeaway' },
          { 'label': 'Ridesharing' },
          { 'label': 'Insurance' },
          { 'label': 'Loan' },
          { 'label': 'Customer Service' },
          { 'label': 'Unknown' },
          { 'label': 'Financial' },
          { 'label': 'Bank' },
          { 'label': 'Education' },
          { 'label': 'Medical' },
          { 'label': 'Charity' },
          { 'label': 'Other' },
          { 'label': 'Debt Collection' },
          { 'label': 'Survey' },
          { 'label': 'Political' },
          { 'label': 'Ecommerce' },
          { 'label': 'Risk' },
          { 'label': 'Agent' },
          { 'label': 'Recruiter' },
          { 'label': 'Headhunter' },
          { 'label': 'Silent Call Voice Clone' },
          { 'label': 'Internet' },
          { 'label': 'Travel Ticketing' },
          { 'label': 'Application Software' },
          { 'label': 'Entertainment' },
          { 'label': 'Government' },
          { 'label': 'Local Services' },
          { 'label': 'Automotive Industry' },
          { 'label': 'Car Rental' },
          { 'label': 'Telecommunication' },
    ];

    const manualMapping = {
        'spam': 'Spam Likely',
        'fraud': 'Fraud Scam Likely',
        'scam': 'Fraud Scam Likely',
        'sales': 'Telemarketing',
        'marketing': 'Telemarketing',
        'collection': 'Debt Collection',
        'agent': 'Agent',
        'delivery': 'Delivery',
        'service': 'Customer Service',
        'survey': 'Survey',
        'political': 'Political',
        'charity': 'Charity',
        'health': 'Medical',
        'medical': 'Medical',
        'bank': 'Bank',
        'finance': 'Financial',
        'insurance': 'Insurance'
    };

    // --- Constants, State, Logging ---
    const PROXY_SCHEME = "https";
    const PROXY_HOST = "flutter-webview-proxy.internal";
    const PROXY_PATH_FETCH = "/fetch";
    const activeIFrames = new Map();

    function log(message) { console.log(`[${PLUGIN_CONFIG.id} v${PLUGIN_CONFIG.version}] ${message}`); }
    function logError(message, error) { console.error(`[${PLUGIN_CONFIG.id} v${PLUGIN_CONFIG.version}] ${message}`, error); }

    function sendToFlutter(channel, data) {
        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler(channel, JSON.stringify(data));
        } else {
            logError(`Cannot send to Flutter on channel '${channel}', handler not available.`);
        }
    }

    function sendPluginResult(result) {
        log(`Sending final result to Flutter: ${JSON.stringify(result)}`);
        sendToFlutter('PluginResultChannel', result);
    }

    function sendPluginLoaded() {
        log('Plugin loaded, notifying Flutter.');
        sendToFlutter('TestPageChannel', { type: 'pluginLoaded', pluginId: PLUGIN_CONFIG.id, version: PLUGIN_CONFIG.version });
    }

    function cleanupIframe(requestId) {
        const iframe = activeIFrames.get(requestId);
        if (iframe) {
            if (iframe.parentNode) { iframe.parentNode.removeChild(iframe); }
            activeIFrames.delete(requestId);
            log(`Cleaned up iframe for requestId: ${requestId}`);
        }
    }

    // --- Parsing Logic (to be executed in context or directly) ---
    function parseTruecallerJson(bodyText, phoneNumber, pluginId) {
        console.log('[Parser] Parsing JSON content...');
        const result = {
            phoneNumber: phoneNumber, sourceLabel: 'Normal', count: 0, province: '', city: '', carrier: '',
            name: '', predefinedLabel: 'Unknown', source: pluginId, numbers: [], success: false, error: '', action: 'none',
            image: '', gender: '', email: ''
        };

        try {
            if (!bodyText) throw new Error("Empty body");
            
            // Check for common error responses in text
            if (bodyText.includes('401 Authorization Required') || bodyText.includes('Unauthorized')) {
                result.error = 'Auth Token Invalid (401)';
                return result;
            }

            const resData = JSON.parse(bodyText);
            const dataList = resData.data || [{}];
            const info = dataList[0] || {};
            
            // Basic fields mapping
            result.name = info.name || '';
            result.image = info.image || '';
            result.gender = info.gender || '';
            
            // Helper to get first item from list safely
            const safeFirst = (arr, k) => (arr && arr.length > 0 ? (k ? arr[0][k] : arr[0]) : null);

            result.email = safeFirst(info.internetAddresses, 'id');
            result.carrier = safeFirst(info.phones, 'carrier');
            result.city = safeFirst(info.addresses, 'city');
            result.province = safeFirst(info.addresses, 'countryCode');

            const phoneE164 = safeFirst(info.phones, 'e164Format');
            if (phoneE164) {
                 result.numbers.push({ number: phoneE164, name: result.name || 'Main' });
            }

            // Spam Logic from Kotlin
            const spamInfo = info.spamInfo || {};
            const spamType = spamInfo.spamType; // String
            const spamScore = spamInfo.spamScore || 0; // Int
            const isFraud = info.isFraud === true;

            result.count = spamScore;

            if (isFraud || (spamType && spamScore > 1)) {
                 result.sourceLabel = spamType || (isFraud ? 'Fraud' : 'Spam');
                 
                 // Apply Manual Mapping
                 let mapped = null;
                 if (result.sourceLabel) {
                     const lowerLabel = result.sourceLabel.toLowerCase();
                     for (const key in manualMapping) {
                         if (lowerLabel.includes(key)) {
                             mapped = manualMapping[key];
                             break;
                         }
                     }
                 }
                 result.predefinedLabel = mapped || (isFraud ? 'Fraud Scam Likely' : 'Spam Likely');
                 result.action = 'block';
            }

            if (result.name || result.sourceLabel !== 'Normal') {
                result.success = true;
            }

        } catch (e) {
            console.error('[Parser] JSON Parse Error:', e);
            result.error = e.message;
        }
        return result;
    }

    function initiateQuery(phoneNumber, requestId) {
        log(`Initiating query for '${phoneNumber}' (requestId: ${requestId})`);
        
        // 1. Get Config
        const config = window.plugin[PLUGIN_CONFIG.id].config || {};
        // Default Token from Kotlin Source
        const defaultToken = "a1i1V--ua298eldF0hb0rL520GjDz7bzVAdt63J2nzZBnWlEKNCJUeln_7kWj4Ir"; 
        const authToken = config.auth_token || defaultToken;
        const countryCode = config.country_code || 'US'; 

        if (!authToken) {
            sendPluginResult({ requestId, success: false, error: 'Auth Token not configured.' });
            return;
        }

        try {
            // 2. Build URL & Headers (Strictly Matching Kotlin)
            const host = "search5-noneu.truecaller.com";
            const targetSearchUrl = `https://${host}/v2/search?q=${encodeURIComponent(phoneNumber)}&countryCode=${encodeURIComponent(countryCode)}&type=4&locAddr=&placement=SEARCHRESULTS,HISTORY,DETAILS&adId=&encoding=json`;
            
            const headers = {
                "User-Agent": "Truecaller/15.32.6 (Android;14)",
                "Accept": "application/json",
                "Authorization": `Bearer ${authToken}`,
                "Host": host,
                "Connection": "Keep-Alive"
            };

            // 3. Build Proxy URL
            // Using Iframe + Proxy (Same Origin) strategy
            const originalOrigin = new URL(targetSearchUrl).origin;
            const proxyUrl = `${PROXY_SCHEME}://${PROXY_HOST}${PROXY_PATH_FETCH}?requestId=${encodeURIComponent(requestId)}&originalOrigin=${encodeURIComponent(originalOrigin)}&targetUrl=${encodeURIComponent(targetSearchUrl)}&headers=${encodeURIComponent(JSON.stringify(headers))}`;
            
            log(`Iframe proxy URL: ${proxyUrl}`);

            const iframe = document.createElement('iframe');
            iframe.id = `query-iframe-${requestId}`;
            iframe.style.display = 'none';
            // Allow same-origin to access content
            iframe.sandbox = 'allow-scripts allow-same-origin';
            activeIFrames.set(requestId, iframe);

            iframe.onload = function() {
                log(`Iframe loaded for requestId ${requestId}. Reading content...`);
                try {
                    // Direct Access (Same Origin)
                    // Note: For JSON responses, Dart interceptor might NOT inject the postMessage receiver script.
                    // So we MUST read the DOM directly here.
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    if (!doc) throw new Error("Cannot access iframe document");

                    const bodyText = doc.body.innerText || doc.body.textContent;
                    const finalResult = parseTruecallerJson(bodyText, phoneNumber, PLUGIN_CONFIG.id);
                    finalResult.requestId = requestId;
                    
                    sendPluginResult(finalResult);
                    cleanupIframe(requestId);

                } catch (e) {
                    logError(`Error accessing/parsing iframe content for requestId ${requestId}:`, e);
                    sendPluginResult({ requestId, success: false, error: `Parse failed: ${e.message}` });
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

            // Timeout
            setTimeout(() => {
                if (activeIFrames.has(requestId)) {
                    logError(`Query timeout for requestId: ${requestId}`);
                    sendPluginResult({ requestId, success: false, error: 'Timeout' });
                    cleanupIframe(requestId);
                }
            }, 30000);

        } catch (error) {
            logError(`Error in initiateQuery for requestId ${requestId}:`, error);
            sendPluginResult({ requestId, success: false, error: `Query initiation failed: ${error.message}` });
        }
    }

    function generateOutput(phoneNumber, nationalNumber, e164Number, requestId) {
        log(`generateOutput called for requestId: ${requestId}`);
        const numberToQuery = e164Number || phoneNumber || nationalNumber;
        if (numberToQuery) {
            // Remove '+' if present, as per common API usage, or keep if needed.
            // Kotlin example: .addQueryParameter("q", number).
            // We'll pass the number as is, but typically APIs handle clean numbers better.
            // Let's rely on e164 format but stripped of '+'.
            const cleanNumber = numberToQuery.replace('+', '');
            initiateQuery(cleanNumber, requestId);
        } else {
            sendPluginResult({ requestId, success: false, error: 'No valid phone number provided.' });
        }
    }

    // --- Message Listener (kept for compatibility or future use) ---
    window.addEventListener('message', function(event) {
        if (!event.data || event.data.type !== 'phoneQueryResult' || !event.data.data) {
            return;
        }
        if (event.data.data.pluginId !== PLUGIN_CONFIG.id) {
            return;
        }
        // ... Logic for receiving postMessage results would go here if we used injection ...
    });

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
