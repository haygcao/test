(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin'; // Ensure pluginId matches Flutter

    const pluginInfo = {
        info: {
            id: 'baiPhoneNumberPlugin',
            name: 'bai',
            version: '1.29.0',
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

    // Retain generateOutput, queryPhoneInfo, sendRequest, sendResultToFlutter, initializePlugin
    // as in your original code.

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

    // handleResponse 函数 (JavaScript) - 设置 HTML 并手动加载脚本
    function handleResponse(response) {
        console.log('handleResponse called with:', response);

        if (response.status >= 200 && response.status < 300) {
            const htmlContent = response.responseText; // Get the HTML content

            // --- 新增：解析 HTML 提取脚本 URL ---
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            const scriptUrls = [];
            const scripts = doc.head.querySelectorAll('script[src]');
            scripts.forEach(script => {
                scriptUrls.push(script.src);
            });
            console.log('Extracted script URLs:', scriptUrls); // Debugging
            // --- 结束新增 ---


            // Set the received HTML content to the document body
            document.body.innerHTML = htmlContent;
            console.log('HTML content set to document.body.innerHTML'); // Debugging

            // --- 新增：手动加载并执行脚本 ---
            scriptUrls.forEach(url => {
                const script = document.createElement('script');
                script.src = url;
                 script.async = true; // Load asynchronously to avoid blocking rendering
                 // Append script to head or body
                 document.head.appendChild(script) || document.body.appendChild(script);
                 console.log('Manually adding script:', url); // Debugging
            });
            // --- 结束新增 ---


            // Wait for the DOM to be ready and content to be loaded in the *current* document
            waitForContentAndParse(response.phoneNumber, response.externalRequestId, response.phoneRequestId);


        } else {
            // Handle non-successful status codes
            sendResultToFlutter('pluginError', { error: response.statusText }, response.externalRequestId, response.phoneRequestId);
        }
    }


    // 新增：等待内容加载并解析的函数 - 增加等待时间和鲁棒性
    function waitForContentAndParse(phoneNumber, externalRequestId, phoneRequestId) {
        const timeout = 30000; // Increased timeout to 30 seconds
        const interval = 500; // Check interval
        const startTime = Date.now();
        let observer = null; // Store MutationObserver instance

        function checkAndParse() {
             // Find #root element in the current document
             const rootElement = document.querySelector('#root');
             console.log('Checking for #root element in current document...');

             if (rootElement) {
                  console.log('#root element found!'); // Debugging
                  console.log('#root innerHTML length:', rootElement.innerHTML.length); // Debugging: Print innerHTML length

                  // Check for target elements within #root
                  const compReportElement = rootElement.querySelector('.comp-report');
                  const locationElement = rootElement.querySelector('.tel-info .location');

                 // Check if both elements exist and have some text content
                 if (compReportElement && locationElement && compReportElement.textContent.trim() !== "" && locationElement.textContent.trim() !== "") {
                       // Target elements found and content is not empty
                       if (observer) observer.disconnect(); // Stop observing
                       console.log('Target elements found and content loaded in current document. Parsing...');

                       try {
                           // Use the root element as context to extract data
                           const result = extractDataFromDOM(rootElement, phoneNumber); // Pass the root element
                           sendResultToFlutter('pluginResult', result, externalRequestId, phoneRequestId); // Use correct request IDs
                       } catch (e) {
                           console.error('Error parsing content in waitForContentAndParse:', e);
                           sendResultToFlutter('pluginError', { error: `Error parsing content: ${e.message}` }, externalRequestId, phoneRequestId); // Use correct request IDs
                       }
                       return; // Stop checking
                 } else {
                    // If elements are found but content is empty, print partial outerHTML for debugging
                     if (rootElement) console.log('#root innerHTML (partial):', rootElement.innerHTML.substring(0, 500) + '...');
                     if (compReportElement) console.log('.comp-report textContent:', compReportElement ? compReportElement.textContent.trim() : 'null');
                     if (locationElement) console.log('.location textContent:', locationElement ? locationElement.textContent.trim() : 'null');

                 }
             } else {
                 console.log('#root element not found yet in current document.'); // Debugging if #root is not found
             }

            // Check for timeout
            if (Date.now() - startTime >= timeout) {
                if (observer) observer.disconnect(); // Stop observing
                console.error('Timeout waiting for content in current document.');
                sendResultToFlutter('pluginError', { error: 'Timeout waiting for content in current document' }, externalRequestId, phoneRequestId); // Use correct request IDs
            } else {
                // If not timed out, continue checking using setTimeout
                 setTimeout(checkAndParse, interval);
            }
        }

        // Use MutationObserver to listen for changes in the document body
        // This helps in detecting when #root and its content are added or modified
        observer = new MutationObserver((mutationsList, observer) => {
             checkAndParse(); // Perform check after each DOM change
        });

        // Configure the observer to watch for changes in the subtree of the body
        const config = { childList: true, subtree: true, characterData: true, attributes: true }; // Also observe characterData for text changes
        observer.observe(document.body, config);

        console.log('Started waiting for content in current document...');

        // Initial check in case content is already present when handleResponse finishes
        checkAndParse();
    }


    // extractDataFromDOM function (extracts data from a given context element)
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
            // Find elements within the context element
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
                    console.log('.reportNameElement outerHTML (partial):', reportNameElement.outerHTML ? reportNameElement.outerHTML.substring(0, 500) + '...' : 'null'); // Debugging


                    // Use textContent directly
                    jsonObject.sourceLabel = reportNameElement.textContent.trim();
                     console.log('Extracted sourceLabel:', jsonObject.sourceLabel); // Debugging
                }

                const reportTypeElement = reportWrapper.querySelector('.report-type');
                 console.log('Checking for .report-type element in context:', reportTypeElement); // Debugging
                if (reportTypeElement) {
                    console.log('.report-type element found!'); // Debugging
                     console.log('.report-type element className:', reportTypeElement.className); // Debugging
                    console.log('.reportTypeElement outerHTML (partial):', reportTypeElement.outerHTML ? reportTypeElement.outerHTML.substring(0, 500) + '...' : 'null'); // Debugging


                     // Use textContent directly
                    const reportTypeText = reportTypeElement.textContent.trim();
                    console.log('Extracted reportTypeText:', reportTypeText); // Debugging
                    if (reportTypeText === '用户标记') {
                        jsonObject.count = 1;
                         console.log('Set count to 1'); // Debugging
                    }
                }
            }
            // Find .tel-info .location within the context element
            const locationElement = contextElement.querySelector('.tel-info .location');
            console.log('Checking for .tel-info .location element in context:', locationElement); // Debugging
            if (locationElement) {
                console.log('.tel-info .location element found!'); // Debugging
                console.log('.tel-info .location element className:', locationElement.className); // Debugging
                console.log('.locationElement outerHTML (partial):', locationElement.outerHTML ? locationElement.outerHTML.substring(0, 500) + '...' : 'null'); // Debugging


                 // Use textContent directly
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
            generateOutput: function(phoneNumber, nationalNumber, e164Number, requestId) {
                 console.log('generateOutput called (triggering HTTP request in Flutter):', phoneNumber, requestId);
                 // This function is called by Flutter to initiate the process.
                 // It triggers the HTTP request in Flutter by calling queryPhoneInfo.
                 // Flutter's RequestChannel callback will then call handleResponse in JS.
                 queryPhoneInfo(phoneNumber, requestId);
            },
            handleResponse: handleResponse, // Expose handleResponse
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
