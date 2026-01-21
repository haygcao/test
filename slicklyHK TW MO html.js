// Slick.ly Phone Query Plugin - Modern Scout Regex Solution (Traditional Chinese)
// =======================================================================================
// 说明:
// 此插件专为 Slick.ly (HK/TW/MO) 设计，采用了最新的 Scout (httpFetch) 架构。
// 相比旧版 Iframe 方案，它更轻量、更快，且能自动利用 Scout 的过盾能力。
// =======================================================================================

(function() {
    // 使用 IIFE 封装
    
    // --- 区域 1: 插件核心配置 ---
    const PLUGIN_CONFIG = {
        id: 'slicklyTwHkPhoneNumberPlugin', // 保持 ID 一致以兼容现有配置
        name: 'Slick.ly TW/HK/MO Lookup (Scout Regex)',
        version: '2.1.0', 
        description: 'Modern Scout-based plugin for Slick.ly. Supports automatic shield handling and fast regex parsing.'
    };

    // --- 区域 2: 标签映射与关键字 (完全迁移自旧版) ---
    const predefinedLabels = [
        { 'label': 'Fraud Scam Likely' }, { 'label': 'Spam Likely' }, { 'label': 'Telemarketing' },
        { 'label': 'Robocall' }, { 'label': 'Delivery' }, { 'label': 'Takeaway' },
        { 'label': 'Ridesharing' }, { 'label': 'Insurance' }, { 'label': 'Loan' },
        { 'label': 'Customer Service' }, { 'label': 'Unknown' }, { 'label': 'Financial' },
        { 'label': 'Bank' }, { 'label': 'Education' }, { 'label': 'Medical' },
        { 'label': 'Charity' }, { 'label': 'Other' }, { 'label': 'Debt Collection' },
        { 'label': 'Survey' }, { 'label': 'Political' }, { 'label': 'Ecommerce' },
        { 'label': 'Risk' }, { 'label': 'Agent' }, { 'label': 'Recruiter' },
        { 'label': 'Headhunter' }, { 'label': 'Silent Call Voice Clone' }, { 'label': 'Internet' },
        { 'label': 'Travel Ticketing' }, { 'label': 'Application Software' }, { 'label': 'Entertainment' },
        { 'label': 'Government' }, { 'label': 'Local Services' }, { 'label': 'Automotive Industry' },
        { 'label': 'Car Rental' }, { 'label': 'Telecommunication' },
    ];

    const manualMapping = {
        '危險': 'Risk', '安全': 'Other', '詐騙': 'Fraud Scam Likely', '騙局': 'Fraud Scam Likely',
        '垃圾郵件': 'Spam Likely', '騷扰': 'Spam Likely', '騷擾': 'Spam Likely', '電話行銷': 'Telemarketing',
        '自動拨號': 'Robocall', '自动拨号': 'Robocall', '送貨': 'Delivery', '外卖': 'Takeaway',
        '外賣': 'Takeaway', '保險': 'Insurance', '貸款': 'Loan', '金融': 'Financial',
        '銀行': 'Bank', '補習': 'Education', '滋擾': 'Spam Likely'
    };

    const blockKeywords = [
        '推銷', '廣告', '違规', '詐騙', '騙子', '滋擾', '騷擾', '危險', '风险', 'Risk', 'Scam'
    ];

    const allowKeywords = [
        '外賣', '送貨', '快遞', '叫車', '安全', 'Safe'
    ];

    // --- 区域 3: 辅助工具函数 ---
    function log(message) { console.log(`[${PLUGIN_CONFIG.id}] ${message}`); }
    function logError(message, error) { console.error(`[${PLUGIN_CONFIG.id}] ${message}`, error); }

    function sendPluginResult(result) {
        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify(result));
        }
    }

    function sendPluginLoaded() {
        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('TestPageChannel', JSON.stringify({ type: 'pluginLoaded', pluginId: PLUGIN_CONFIG.id, version: PLUGIN_CONFIG.version }));
        }
    }

    // --- 区域 4: 核心查询逻辑 ---
    async function initiateQuery(phoneNumber, requestId, countryCode) {
        log(`Initiating Scout query for '${phoneNumber}' [${countryCode}] (requestId: ${requestId})`);

        const formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
        const targetSearchUrl = `https://slick.ly/${countryCode}/${formattedNumber}`;
        
        try {
            log(`Fetching HTML from: ${targetSearchUrl}`);
            const response = await httpFetch(targetSearchUrl, { method: 'GET' });

            if (response.status !== 200) {
                logError(`HTTP Error: ${response.status}`);
                sendPluginResult({ requestId, success: false, error: `HTTP Error ${response.status}` });
                return;
            }

            const html = response.responseText || "";
            
            // --- 正则提取逻辑 ---
            // 1. 提取 Summary 结果 (危险/安全)
            let summaryLabel = '';
            const summaryMatch = html.match(/<span class="summary-result">([^<]+)<\/span>/i);
            if (summaryMatch) summaryLabel = summaryMatch[1].trim();

            // 2. 提取 Keywords
            let keywordsText = '';
            const keywordsMatch = html.match(/<div class="keywords"><span>([^<]+)<\/span>/i);
            if (keywordsMatch) keywordsText = keywordsMatch[1].trim();

            // 3. 提取注释数量
            let count = 0;
            const countMatch = html.match(/註釋\s*\((\d+)\)/i);
            if (countMatch) count = parseInt(countMatch[1], 10);

            log(`Parsed: Summary=[${summaryLabel}], Keywords=[${keywordsText}], Count=[${count}]`);

            // --- 智能分类决策 ---
            let sourceLabel = keywordsText || summaryLabel || '';
            let predefinedLabel = 'Unknown';
            let action = 'none';

            // 映射逻辑
            const mappingSource = (keywordsText + " " + summaryLabel).split(/[,，\s]+/).filter(x => x);
            for (let part of mappingSource) {
                if (manualMapping[part]) {
                    predefinedLabel = manualMapping[part];
                    break;
                }
            }

            // 行为判断
            const checkStr = (sourceLabel + " " + predefinedLabel).toLowerCase();
            if (blockKeywords.some(k => checkStr.includes(k.toLowerCase()))) {
                action = 'block';
            } else if (allowKeywords.some(k => checkStr.includes(k.toLowerCase()))) {
                action = 'allow';
            }

            // 返回最终结果
            sendPluginResult({
                requestId,
                success: (summaryLabel || keywordsText || count > 0),
                source: PLUGIN_CONFIG.name,
                phoneNumber: formattedNumber,
                sourceLabel: sourceLabel || 'No specific label found',
                predefinedLabel: predefinedLabel,
                action: action,
                name: '', 
                count: count
            });

        } catch (e) {
            logError('Query Failed', e);
            sendPluginResult({ requestId, success: false, error: 'Scout Execution Failed: ' + e.toString() });
        }
    }

    // --- 区域 5: 插件入口 ---
    function generateOutput(phoneNumber, nationalNumber, e164Number, requestId) {
        log(`generateOutput called for requestId: ${requestId}`);
        
        // 国家代码识别
        let countryCode = 'tw'; // 默认
        if (e164Number && e164Number.startsWith('+')) {
            if (e164Number.startsWith('+852')) countryCode = 'hk';
            else if (e164Number.startsWith('+853')) countryCode = 'mo';
            else if (e164Number.startsWith('+886')) countryCode = 'tw';
        }

        const numberToQuery = phoneNumber || nationalNumber;
        if (numberToQuery) {
            initiateQuery(numberToQuery, requestId, countryCode);
        } else {
            sendPluginResult({ requestId, success: false, error: 'No valid phone number.' });
        }
    }

    // --- 区域 6: 初始化 ---
    function initialize() {
        if (!window.plugin) window.plugin = {};
        window.plugin[PLUGIN_CONFIG.id] = {
            info: PLUGIN_CONFIG,
            generateOutput: generateOutput,
            config: {}
        };
        log(`Plugin registered. Using Scout Architecture V2.`);
        sendPluginLoaded();
    }

    initialize();

})();
