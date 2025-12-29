// Truecaller Query Plugin - Native Request Solution
(function() {
    // --- Plugin Configuration ---
    const PLUGIN_CONFIG = {
        id: 'truecallerPluginchannel', // 必须与下方 window.plugin.truecallerPlugin 保持一致
        name: 'Truecaller API Lookup',
        version: '1.0.0',
        description: 'Queries Truecaller API for caller ID and spam detection using native HTTP channel.',
        author: 'Converted from Python',
    };

    // --- Constants ---
    // 注意：Bearer Token 可能会过期，如果是硬编码的 token，请确保其有效性
    const TRUECALLER_TOKEN = "a2i0a--xGEup3VdVkAZ5pEdGVr36IAiYoER_c8qIN5GftDqpn5ENRfvJ17vDX70U";
    
    // 映射 Truecaller 的垃圾分类到插件的标准标签
    const spamMapping = {
        'sales': 'Telemarketing',
        'spam': 'Spam Likely',
        'scam': 'Fraud Scam Likely',
        'fraud': 'Fraud Scam Likely',
        'nuisance': 'Spam Likely',
        'political': 'Political',
        'survey': 'Survey',
        'robocall': 'Robocall',
        'agent': 'Agent',
        'collection': 'Debt Collection',
        'finance': 'Financial',
        'charity': 'Charity',
    };

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

    function sendPluginResult(result) {
        log(`Sending result to Flutter for req ${result.requestId}: ${JSON.stringify(result)}`);
        sendToFlutter('PluginResultChannel', result);
    }

    /**
     * 入口函数：Flutter 调用此函数开始查询
     */
    function generateOutput(phoneNumber, nationalNumber, e164Number, requestId) {
        log(`Initiating query for requestId: ${requestId}`);

        // 优先使用 e164 格式 (带+号)，如果没有则使用 raw phoneNumber
        // Python 脚本中使用了 `q={number}`，Truecaller 通常处理 e164 最好
        const queryNumber = e164Number || phoneNumber;

        if (!queryNumber) {
            sendPluginResult({ requestId, success: false, error: 'No valid phone number provided.' });
            return;
        }

        // 构造 Python 脚本中的 URL
        // 注意：原脚本硬编码了 countryCode=IN，这可能会影响非印度号码的查询结果。
        // 但为了保持与原 Python 脚本一致，这里保留逻辑。
        // 如果想更通用，可以尝试去掉 countryCode 参数或根据号码动态设置。
        const targetUrl = `https://search5-noneu.truecaller.com/v2/search?q=${encodeURIComponent(queryNumber)}&countryCode=IN&type=4&encoding=json`;

        const headers = {
            "User-Agent": "Truecaller/15.32.6 (Android;14)",
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "Authorization": `Bearer ${TRUECALLER_TOKEN}`
        };

        log(`Requesting Native HTTP GET: ${targetUrl}`);

        // 使用 RequestChannel 请求 Flutter 原生层发起 HTTP 请求
        // 这样可以规避 CORS 问题，也不需要 iframe 注入脚本
        const payload = {
            method: 'GET',
            url: targetUrl,
            headers: headers,
            body: null,
            phoneRequestId: requestId,
            externalRequestId: requestId // 用于回调匹配
        };

        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('RequestChannel', JSON.stringify(payload));
        } else {
            sendPluginResult({ requestId, success: false, error: 'Flutter RequestChannel not available.' });
        }
    }

    /**
     * 回调函数：处理 Native HTTP 请求的响应
     * 对应 Dart 中的 window.plugin.truecallerPlugin.handleResponse(...)
     */
    function handleResponse(response) {
        log('Received response from Native layer');
        
        // 这里的 response 结构由 PluginWebViewService.dart 定义
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
            
            // 解析逻辑 (对应 Python 脚本中的 parse 逻辑)
            // Python: info = data.get("data", [{}])[0]
            const info = (data.data && data.data.length > 0) ? data.data[0] : null;

            if (!info) {
                // 没有数据
                sendPluginResult({ 
                    requestId, 
                    success: false, 
                    error: 'No data found in Truecaller response' 
                });
                return;
            }

            // 提取字段
            const phones = info.phones || [];
            const phoneObj = phones.length > 0 ? phones[0] : {};
            const addresses = info.addresses || [];
            const addrObj = addresses.length > 0 ? addresses[0] : {};

            const name = info.name || '';
            const carrier = phoneObj.carrier || '';
            const city = addrObj.city || '';
            const province = addrObj.city || ''; // Truecaller 通常把城市作为主要地标
            const isFraud = info.isFraud || false;
            const spamScore = info.spamScore || 0;
            const spamType = info.spamType || ''; // sometimes present

            let predefinedLabel = '';
            let action = 'none';

            // 智能标签判断
            if (isFraud) {
                predefinedLabel = 'Fraud Scam Likely';
                action = 'block';
            } else if (spamScore > 0) {
                // 尝试映射 spamType，如果没有则默认为 Spam Likely
                if (spamType && spamMapping[spamType.toLowerCase()]) {
                    predefinedLabel = spamMapping[spamType.toLowerCase()];
                } else {
                    predefinedLabel = 'Spam Likely';
                }
                
                // 只有分数较高才 block，或者只要是 spam 就 block？这里设定为有标签就 block
                action = 'block'; 
            } else if (name.toLowerCase().includes('courier') || name.toLowerCase().includes('delivery')) {
                predefinedLabel = 'Delivery';
                action = 'allow';
            }

            // 构建最终结果
            const pluginResult = {
                requestId: requestId,
                success: true,
                source: PLUGIN_CONFIG.name,
                name: name,
                phoneNumber: phoneObj.e164Format || '',
                carrier: carrier,
                city: city,
                province: province,
                count: spamScore, // 使用垃圾评分作为 count
                sourceLabel: spamType || (isFraud ? 'Fraud' : ''), // 原始标签
                predefinedLabel: predefinedLabel,
                action: action,
                imageUrl: info.image || '',
                email: (info.internetAddresses && info.internetAddresses.length > 0) ? info.internetAddresses[0].id : ''
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
        
        // 注册插件对象，包含 generateOutput 和 handleResponse
        window.plugin[PLUGIN_CONFIG.id] = {
            info: PLUGIN_CONFIG,
            generateOutput: generateOutput,
            handleResponse: handleResponse // 必须暴露给 Dart 调用
        };

        log(`Plugin loaded: ${PLUGIN_CONFIG.name}`);
        
        // 通知 Flutter 插件已加载
        sendToFlutter('TestPageChannel', { 
            type: 'pluginLoaded', 
            pluginId: PLUGIN_CONFIG.id, 
            version: PLUGIN_CONFIG.version 
        });
    }

    initialize();

})();
