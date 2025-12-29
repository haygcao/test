// UnknownPhone API Plugin - Comparative Test (using RequestChannel)
(function() {
    // --- Plugin Configuration ---
    const PLUGIN_CONFIG = {
        id: 'unknownPhonePlugin',
        name: 'UnknownPhone Test',
        version: '1.0.0',
        description: 'Comparative test plugin using UnknownPhone API via RequestChannel.',
        author: 'Test',
        settings: []
    };

    // --- Constants ---
    const API_URL = "https://secure.unknownphone.com/api2/";
    const API_KEY = "d7e07fec659645b12df76c94e378d47a";

    function log(message) { 
        console.log(`[${PLUGIN_CONFIG.id}] ${message}`); 
    }

    function logError(message, error) { 
        console.error(`[${PLUGIN_CONFIG.id}] ${message}`, error); 
    }

    function sendToFlutter(channel, data) {
        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler(channel, JSON.stringify(data));
        } else {
            logError(`Cannot send to Flutter on channel '${channel}', handler not available.`);
        }
    }

    function sendPluginLoaded() {
        log('Plugin loaded, notifying Flutter.');
        sendToFlutter('TestPageChannel', { type: 'pluginLoaded', pluginId: PLUGIN_CONFIG.id, version: PLUGIN_CONFIG.version });
    }

    function sendPluginResult(result) {
        log(`Sending result to Flutter for req ${result.requestId}: ${JSON.stringify(result)}`);
        sendToFlutter('PluginResultChannel', result);
    }

    /**
     * Entry Point: Generate Output
     */
    function generateOutput(phoneNumber, nationalNumber, e164Number, requestId) {
        log(`Initiating query for requestId: ${requestId}`);
        
        const queryNumber = e164Number || phoneNumber;
        
        if (!queryNumber) {
            sendPluginResult({ requestId, success: false, error: 'No valid phone number provided.' });
            return;
        }

        // Construct Form Body (x-www-form-urlencoded)
        // Kotlin: user_type=free, api_key=..., phone=..., _action=_get_info_for_phone, lang=es (defaulting to es for now or take from setting)
        const lang = 'es'; 
        const bodyParams = new URLSearchParams();
        bodyParams.append('user_type', 'free');
        bodyParams.append('api_key', API_KEY);
        bodyParams.append('phone', queryNumber);
        bodyParams.append('_action', '_get_info_for_phone');
        bodyParams.append('lang', lang);
        
        const bodyString = bodyParams.toString();

        const headers = {
            "Connection": "Keep-Alive",
            "Content-Type": "application/x-www-form-urlencoded",
            "Host": "secure.unknownphone.com",
            "User-Agent": "okhttp/3.14.9" // Matching Kotlin
        };

        log(`Requesting Native HTTP POST: ${API_URL}`);

        // Use RequestChannel
        const payload = {
            method: 'POST',
            url: API_URL,
            headers: headers,
            body: bodyString,
            phoneRequestId: requestId,
            externalRequestId: requestId
        };

        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('RequestChannel', JSON.stringify(payload));
        } else {
            sendPluginResult({ requestId, success: false, error: 'Flutter RequestChannel not available.' });
        }
    }

    /**
     * Handle Native Response
     */
    function handleResponse(response) {
        log('Received response from Native layer');
        
        const requestId = response.phoneRequestId;
        const statusCode = response.status;
        const responseText = response.responseText;

        if (statusCode !== 200) {
            logError(`HTTP Error: ${statusCode}`);
            sendPluginResult({ 
                requestId, 
                success: false, 
                error: `HTTP Error ${statusCode}: ${response.statusText}` 
            });
            return;
        }

        try {
            const data = JSON.parse(responseText);
            
            // Logic based on Kotlin checkListaSpamApi:
            // avg_ratings: < 3 means bad/dangerous.
            // 5 - safe, 4 - good, 3 - neutral, 2 - bad, 1 - dangerous
            
            const avgRatingsStr = data.avg_ratings || "3";
            const avgRating = parseFloat(avgRatingsStr);
            const isSpam = avgRating < 3;

            // Extract other info if available (the kotlin code only checks rating, but let's see what we can get)
            // UnknownPhone API usually returns minimal info on free tier.
            
            let predefinedLabel = isSpam ? 'Spam Likely' : 'Normal';
            let action = isSpam ? 'block' : 'none';

            // Construct Result
            const pluginResult = {
                requestId: requestId,
                success: true,
                source: PLUGIN_CONFIG.name,
                name: isSpam ? "Flagged Number" : "Unknown",
                phoneNumber: data.number || '', // if returned
                rating: avgRating,
                count: data.comments_count || 0, // checking if this field exists
                sourceLabel: isSpam ? `Rating: ${avgRating}` : 'Safe',
                predefinedLabel: predefinedLabel,
                action: action,
            };

            sendPluginResult(pluginResult);

        } catch (e) {
            logError('Error parsing JSON response', e);
            sendPluginResult({ 
                requestId, 
                success: false, 
                error: 'JSON parsing failed: ' + e.toString() 
            });
        }
    }

    // --- Initialization ---
    function initialize() {
        if (!window.plugin) {
            window.plugin = {};
        }
        window.plugin[PLUGIN_CONFIG.id] = {
            info: PLUGIN_CONFIG,
            generateOutput: generateOutput,
            handleResponse: handleResponse
        };
        log(`Plugin registered: window.plugin.${PLUGIN_CONFIG.id}`);
        sendPluginLoaded();
    }

    initialize();

})();
