(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin'; // Keep the same pluginId for consistency

    const pluginInfo = {
        info: {
            id: 'baiPhoneNumberPlugin', // 插件ID,必须唯一
            name: 'bai', // 插件名称
            version: '1.2.0', // 插件版本
            description: 'This is a plugin template.', // 插件描述
            author: 'Your Name', // 插件作者
        },
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
        '广告营销': 'Telemarketing',
        '广告推销': 'Telemarketing',
        '旅游推广': 'Telemarketing',
        '食药推销': 'Telemarketing',
        '推销': 'Telemarketing',
    };

    // --- Unified Request Function ---
    function queryPhoneInfo(phoneNumber, externalRequestId) {
        // Generate a unique ID for *this specific phone number request*
        const phoneRequestId = Math.random().toString(36).substring(2);
        console.log(`queryPhoneInfo: phone=${phoneNumber}, externalRequestId=${externalRequestId}, phoneRequestId=${phoneRequestId}`);

        const url = `https://haoma.baidu.com/phoneSearch?search=${phoneNumber}&srcid=8757`;
        const method = 'GET';
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36', // Example User-Agent
            'Referer': 'https://www.baidu.com/', // 或搜索结果页 URL
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Connection': 'keep-alive',
        };
        const body = null;

        // Pass BOTH the externalRequestId AND the internal phoneRequestId
        sendRequest(url, method, headers, body, externalRequestId, phoneRequestId);
    }

    // sendRequest function (now accepts both request IDs)
    function sendRequest(url, method, headers, body, externalRequestId, phoneRequestId) {
        const requestData = {
            url: url,
            method: method,
            headers: headers,
            body: body,
            externalRequestId: externalRequestId, // Include externalRequestId
            phoneRequestId: phoneRequestId,     // Include phoneRequestId
            pluginId: pluginId,
        };

        if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler('RequestChannel', JSON.stringify(requestData));
        } else {
            console.error("flutter_inappwebview is undefined");
        }
    }

    // handleResponse 函数 (JavaScript)
    function handleResponse(response) {
        console.log('handleResponse called with:', response);

        if (response.status >= 200 && response.status < 300) {
            // 清空当前的 body 内容
            document.body.innerHTML = '';

            // 使用 DOMParser 解析响应文本
            const parser = new DOMParser();
            const doc = parser.parseFromString(response.responseText, 'text/html');

            // 将解析后的 body 内容添加到当前的 document.body 中
            // 这会触发 MutationObserver
            while (doc.body.firstChild) {
                document.body.appendChild(doc.body.firstChild);
            }

            // 使用 MutationObserver 等待 Shadow DOM 宿主元素出现
            const observer = new MutationObserver((mutationsList, observer) => {
                // 1. 找到 Shadow DOM 的宿主元素 (根据你的图片，是 <div id="__hcfy__">)
                const shadowHost = document.querySelector('#__hcfy__');

                if (shadowHost) {
                    // 2. 穿透 Shadow DOM，获取 shadowRoot
                    if (shadowHost.shadowRoot) {
                        // 3. 在 shadowRoot 内部查找目标元素 (例如 .report-wrapper)
                        const targetElement = shadowHost.shadowRoot.querySelector('.report-wrapper'); // 替换为你的目标元素

                        if (targetElement && targetElement.textContent.trim() !== "") {
                            // 目标元素出现且内容不为空，说明内容已加载
                            observer.disconnect(); // 停止观察
                            console.log('Target element found in Shadow DOM. Parsing response...');
                            let result = parseResponse(shadowHost.shadowRoot, response.phoneNumber); // 传入 shadowRoot 和电话号码
                            // 将解析结果发送回 Flutter
                            sendResultToFlutter('pluginResult', result, response.externalRequestId, response.phoneRequestId);
                            return;
                        }
                    }
                }

                // 你可以添加一个超时机制，避免无限等待
                // 例如，设置一个定时器在一定时间后停止观察并报告错误
                // ...
            });

            // 配置观察器，观察子节点、子树、文本内容和属性的变化
            const config = { childList: true, subtree: true, characterData: true, attributes: true };
            observer.observe(document.body, config);

        } else {
            // 处理非成功状态码
            sendResultToFlutter('pluginError', { error: response.statusText }, response.externalRequestId, response.phoneRequestId);
        }
    }

    // parseResponse 函数 (修改：接收 shadowRoot)
    function parseResponse(shadowRoot, phoneNumber) {
        // 从 shadowRoot 中提取数据
        return extractDataFromDOM(shadowRoot, phoneNumber);
    }

    // extractDataFromDOM 函数 (修改：从 shadowRoot 查找元素)
    function extractDataFromDOM(shadowRoot, phoneNumber) {
        const jsonObject = {
            count: 0,
            sourceLabel: "",
            province: "",
            city: "",
            carrier: "unknown",
            phoneNumber: phoneNumber,
            predefinedLabel: "" // 添加 predefinedLabel
        };

        try {
            // --- 从 shadowRoot 中查找元素 ---
            const reportWrapper = shadowRoot.querySelector('.report-wrapper'); // 在 shadowRoot 内查找

            if (reportWrapper) {
                const reportNameElement = reportWrapper.querySelector('.report-name');
                if (reportNameElement) {
                    jsonObject.sourceLabel = decodeQuotedPrintable(reportNameElement.textContent.trim());
                }

                const reportTypeElement = reportWrapper.querySelector('.report-type');
                if (reportTypeElement) {
                    const reportTypeText = decodeQuotedPrintable(reportTypeElement.textContent.trim());
                    if (reportTypeText === '用户标记') {
                        jsonObject.count = 1;
                    }
                }
            }
            const locationElement = shadowRoot.querySelector('.location');
            if (locationElement) {
                const locationText = decodeQuotedPrintable(locationElement.textContent.trim());
                const match = locationText.match(/([\u4e00-\u9fa5]+)[\s ]*([\u4e00-\u9fa5]+)?/);
                if (match) {
                    jsonObject.province = match[1] || '';
                    jsonObject.city = match[2] || '';
                }
            }

            // 根据 sourceLabel 查找 manualMapping，设置 predefinedLabel
            if (jsonObject.sourceLabel && manualMapping[jsonObject.sourceLabel]) {
                jsonObject.predefinedLabel = manualMapping[jsonObject.sourceLabel];
            } else {
                jsonObject.predefinedLabel = 'Unknown'; // 如果没有匹配到，设置为 Unknown
            }

        } catch (error) {
            console.error('Error extracting data:', error);
        }

        return jsonObject;
    }

    // Quoted-Printable 解码函数 (保持不变)
    function decodeQuotedPrintable(str) {
        str = str.replace(/=3D/g, "=");
        str = str.replace(/=([0-9A-Fa-f]{2})/g, function (match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
        });
        str = str.replace(/=\r?\n/g, '');
        return str;
    }

    // generateOutput function (modified)
    async function generateOutput(phoneNumber, nationalNumber, e164Number, externalRequestId) {
        console.log('generateOutput called with:', phoneNumber, externalRequestId);

        // Call queryPhoneInfo for each number format, passing the externalRequestId
        if (phoneNumber) {
            queryPhoneInfo(phoneNumber, externalRequestId);
        }
        if (nationalNumber) {
            queryPhoneInfo(nationalNumber, externalRequestId);
        }
        if (e164Number) {
            queryPhoneInfo(e164Number, externalRequestId);
        }
    }

    // sendResultToFlutter 函数 (修改：添加 phoneRequestId)
    function sendResultToFlutter(type, data, externalRequestId, phoneRequestId) {
        const resultMessage = {
            type: type,
            pluginId: pluginId,
            requestId: phoneRequestId, // 使用 phoneRequestId
            data: data,
            externalRequestId: externalRequestId, // 包括 externalRequestId
        };
        console.log('Sending result to Flutter:', resultMessage);
        if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify(resultMessage));
        } else {
            console.error("flutter_inappwebview is undefined");
        }
    }

    // Initialize plugin
    async function initializePlugin() {
        window.plugin = {};
        const thisPlugin = {
            id: pluginInfo.info.id,
            pluginId: pluginId,
            version: pluginInfo.info.version,
            generateOutput: generateOutput,
            handleResponse: handleResponse,
            test: function () {
                console.log('Plugin test function called');
                return 'Plugin is working';
            }
        };

        window.plugin[pluginId] = thisPlugin;

        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('TestPageChannel', JSON.stringify({
                type: 'pluginLoaded',
                pluginId: pluginId,
            }));
            console.log('Notified Flutter that plugin is loaded');
        } else {
            console.error('flutter_inappwebview is not defined');
        }
    }

    // Initialize plugin
    initializePlugin();
})();
