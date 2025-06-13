(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin'; // Ensure pluginId matches Flutter

    const pluginInfo = {
        info: {
            id: 'baiPhoneNumberPlugin',
            name: 'bai',
            version: '1.190.0',
            description: 'This is a plugin template.',
            author: 'Your Name',
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
        '广告营销': 'Telemarketing',
        '广告推销': 'Telemarketing',
        '旅游推广': 'Telemarketing',
        '食药推销': 'Telemarketing',
        '推销': 'Telemarketing',
    };

    function queryPhoneInfo(phoneNumber, externalRequestId) {
        const phoneRequestId = Math.random().toString(36).substring(2);
        console.log(`queryPhoneInfo: phone=${phoneNumber}, externalRequestId=${externalRequestId}, phoneRequestId=${phoneRequestId}`);

        const url = `https://haoma.baidu.com/phoneSearch?search=${phoneNumber}&srcid=8757`;
        const method = 'GET';
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            'Referer': 'https://www.baidu.com/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Connection': 'keep-alive',
        };
        const body = null;

        sendRequest(url, method, headers, body, externalRequestId, phoneRequestId);
    }

    function sendRequest(url, method, headers, body, externalRequestId, phoneRequestId) {
        const requestData = {
            url: url,
            method: method,
            headers: headers,
            body: body,
            externalRequestId: externalRequestId,
            phoneRequestId: phoneRequestId,
            pluginId: pluginId,
        };

        if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler('RequestChannel', JSON.stringify(requestData));
        } else {
            console.error("flutter_inappwebview is undefined");
        }
    }

    // handleResponse 函数 (JavaScript) - 直接解析接收到的 HTML 内容
    function handleResponse(response) {
        console.log('handleResponse called with:', response);

        if (response.status >= 200 && response.status < 300) {
            const htmlContent = response.responseText; // Get the HTML content

            // 使用 DOMParser 解析接收到的 HTML 内容
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');

            // 在解析后的文档中查找和提取数据
            // 添加一个小的延迟，确保解析后的文档在查找元素时是稳定的
            setTimeout(() => {
                 try {
                    // 在解析后的文档中查找 root 元素
                    const rootElement = doc.querySelector('#root');
                    console.log('Checking for #root element in parsed document...'); // Debugging

                    if (rootElement) {
                       console.log('#root element found!'); // Debugging
                       console.log('#root element ID:', rootElement.id); // Debugging: Print ID
                       console.log('#root element className:', rootElement.className); // Debugging: Print className
                       console.log('#root element outerHTML (partial):', rootElement.outerHTML ? rootElement.outerHTML.substring(0, 500) + '...' : 'null'); // Debugging: Print partial outerHTML

                       // --- 打印 #root 内部结构的一部分 ---
                       const rootInnerHtml = rootElement.innerHTML;
                       const printLimit = 1000; // 打印前 1000 个字符
                       if (rootInnerHtml.length > printLimit) {
                           console.log('Partial #root innerHTML:', rootInnerHtml.substring(0, printLimit) + '...');
                       } else {
                           console.log('Full #root innerHTML:', rootInnerHtml);
                       }
                       // --- 结束打印 ---


                       // 在 root 元素内部查找和解析数据
                       const result = parseResponse(rootElement, response.phoneNumber); // 传入 root 元素
                       sendResultToFlutter('pluginResult', result, response.externalRequestId, response.phoneRequestId);
                    } else {
                       console.error('#root element not found in parsed document.');
                        sendResultToFlutter('pluginError', { error: '#root element not found in parsed document' }, response.externalRequestId, response.phoneRequestId);
                    }

                 } catch (e) {
                     console.error('Error parsing HTML content in handleResponse:', e);
                     sendResultToFlutter('pluginError', { error: `Error parsing HTML content: ${e.message}` }, response.externalRequestId, response.phoneRequestId);
                 }
            }, 50); // 延迟 50 毫秒

        } else {
            // 处理非成功状态码
            sendResultToFlutter('pluginError', { error: response.statusText }, response.externalRequestId, response.phoneRequestId);
        }
    }


    // parseResponse 函数 (接收要解析的元素作为上下文)
    function parseResponse(contextElement, phoneNumber) {
        return extractDataFromDOM(contextElement, phoneNumber);
    }

    // extractDataFromDOM 函数 (在指定的上下文元素中查找元素) - 移除 Quoted-Printable 解码
    function extractDataFromDOM(contextElement, phoneNumber) {
        const jsonObject = {
            count: 0,
            sourceLabel: "",
            province: "",
            city: "",
            carrier: "unknown",
            phoneNumber: phoneNumber,
            predefinedLabel: ""
        };

        try {
            // 在 contextElement (即 #root) 内部查找元素
            const reportWrapper = contextElement.querySelector('.comp-report');
            console.log('Checking for .comp-report element in context:', reportWrapper); // Debugging

            if (reportWrapper) {
                console.log('.comp-report element found!'); // Debugging
                console.log('.comp-report element className:', reportWrapper.className); // Debugging
                console.log('.comp-report element outerHTML (partial):', reportWrapper.outerHTML ? reportWrapper.outerHTML.substring(0, 500) + '...' : 'null'); // Debugging


                const reportNameElement = reportWrapper.querySelector('.report-name');
                 console.log('Checking for .report-name element in context:', reportNameElement); // Debugging
                if (reportNameElement) {
                    console.log('.report-name element found!'); // Debugging
                    console.log('.report-name element className:', reportNameElement.className); // Debugging
                    console.log('.report-name element outerHTML (partial):', reportNameElement.outerHTML ? reportNameElement.outerHTML.substring(0, 500) + '...' : 'null'); // Debugging

                    // Directly use textContent as HTML is not Quoted-Printable encoded
                    jsonObject.sourceLabel = reportNameElement.textContent.trim();
                     console.log('Extracted sourceLabel:', jsonObject.sourceLabel); // Debugging
                }

                const reportTypeElement = reportWrapper.querySelector('.report-type');
                 console.log('Checking for .report-type element in context:', reportTypeElement); // Debugging
                if (reportTypeElement) {
                    console.log('.report-type element found!'); // Debugging
                     console.log('.report-type element className:', reportTypeElement.className); // Debugging
                    console.log('.report-type element outerHTML (partial):', reportTypeElement.outerHTML ? reportTypeElement.outerHTML.substring(0, 500) + '...' : 'null'); // Debugging

                     // Directly use textContent
                    const reportTypeText = reportTypeElement.textContent.trim();
                    console.log('Extracted reportTypeText:', reportTypeText); // Debugging
                    if (reportTypeText === '用户标记') {
                        jsonObject.count = 1;
                         console.log('Set count to 1'); // Debugging
                    }
                }
            }
            // 在 contextElement (即 #root) 内部查找 .tel-info .location
            const locationElement = contextElement.querySelector('.tel-info .location');
            console.log('Checking for .tel-info .location element in context:', locationElement); // Debugging
            if (locationElement) {
                console.log('.tel-info .location element found!'); // Debugging
                console.log('.tel-info .location element className:', locationElement.className); // Debugging
                console.log('.tel-info .location element outerHTML (partial):', locationElement.outerHTML ? locationElement.outerHTML.substring(0, 500) + '...' : 'null'); // Debugging

                 // Directly use textContent
                const locationText = locationElement.textContent.trim();
                 console.log('Extracted locationText:', locationText); // Debugging
                const match = locationText.match(/([\u4e00-\u9fa5]+)[\s ]*([\u4e00-\u9fa5]+)?/);
                if (match) {
                    jsonObject.province = match[1] || '';
                    jsonObject.city = match[2] || '';
                     console.log('Extracted province:', jsonObject.province); // Debugging
                     console.log('Extracted city:', jsonObject.city); // Debugging
                }
            }

            if (jsonObject.sourceLabel && manualMapping[jsonObject.sourceLabel]) {
                jsonObject.predefinedLabel = manualMapping[jsonObject.sourceLabel];
            } else {
                jsonObject.predefinedLabel = 'Unknown';
            }
             console.log('Set predefinedLabel:', jsonObject.predefinedLabel); // Debugging

        } catch (error) {
            console.error('Error extracting data:', error);
        }

        return jsonObject;
    }

    // Removed decodeQuotedPrintable function

    async function generateOutput(phoneNumber, nationalNumber, e164Number, requestId) {
         console.log('generateOutput called with:', phoneNumber, requestId);
         queryPhoneInfo(phoneNumber, requestId);
    }


    function sendResultToFlutter(type, data, externalRequestId, phoneRequestId) {
        const resultMessage = {
            type: type,
            pluginId: pluginId,
            requestId: phoneRequestId,
            data: data,
            externalRequestId: externalRequestId,
        };
        console.log('Sending result to Flutter:', resultMessage);
        if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify(resultMessage));
        } else {
            console.error("flutter_inappwebview is undefined");
        }
    }

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

    initializePlugin();
})();
