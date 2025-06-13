(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin'; // Ensure pluginId matches Flutter

    const pluginInfo = {
        info: {
            id: 'baiPhoneNumberPlugin',
            name: 'bai',
            version: '1.21.0',
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

    // Removed generateOutput, queryPhoneInfo, sendRequest, handleResponse
    // The parsing logic will now be in a new function called by Flutter onLoadStop

    // 新增：在页面加载完成后解析当前文档的函数
    function parseLoadedPage(phoneNumber, requestId) {
        console.log('parseLoadedPage called with:', phoneNumber, requestId);

        // Wait for the DOM to be ready and content to be loaded in the *current* document
        waitForContentAndParse(phoneNumber, requestId);
    }


    // 新增：等待内容加载并解析的函数
    function waitForContentAndParse(phoneNumber, requestId) {
        const timeout = 20000; // 增加超时时间
        const interval = 500; // 检查间隔
        const startTime = Date.now();
        let observer = null; // 存储 MutationObserver 实例

        function checkAndParse() {
             // 在当前文档中查找 root 元素
             const rootElement = document.querySelector('#root');
             console.log('Checking for #root element in current document...');

             if (rootElement) {
                  // 找到 #root 元素后，检查其内部内容是否加载
                  const compReportElement = rootElement.querySelector('.comp-report');
                  const locationElement = rootElement.querySelector('.tel-info .location');

                 // Check if both elements exist and have some text content
                 if (compReportElement && locationElement && compReportElement.textContent.trim() !== "" && locationElement.textContent.trim() !== "") {
                       // 目标元素出现且内容不为空
                       if (observer) observer.disconnect(); // 停止观察
                       console.log('Target elements found and content loaded in current document. Parsing...');

                       try {
                           // Use the current document to extract data
                           const result = extractDataFromDOM(document, phoneNumber); // Pass the entire document
                           sendResultToFlutter('pluginResult', result, requestId, requestId);
                       } catch (e) {
                           console.error('Error parsing content in waitForContentAndParse:', e);
                           sendResultToFlutter('pluginError', { error: `Error parsing content: ${e.message}` }, requestId, requestId);
                       }
                       return; // Stop checking
                 } else {
                    // If elements are found but content is empty, print partial outerHTML for debugging
                     if (rootElement) console.log('#root innerHTML (partial):', rootElement.innerHTML.substring(0, 500) + '...');
                     if (compReportElement) console.log('.comp-report textContent:', compReportElement.textContent.trim());
                     if (locationElement) console.log('.location textContent:', locationElement.textContent.trim());

                 }
             } else {
                 console.log('#root element not found yet in current document.'); // Debugging if #root is not found
             }

            // Check for timeout
            if (Date.now() - startTime >= timeout) {
                if (observer) observer.disconnect(); // Stop observing
                console.error('Timeout waiting for content in current document.');
                sendResultToFlutter('pluginError', { error: 'Timeout waiting for content in current document' }, requestId, requestId);
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
        const config = { childList: true, subtree: true, characterData: true }; // Also observe characterData for text changes
        observer.observe(document.body, config);

        console.log('Started waiting for content in current document...');

        // Initial check in case content is already present when parseLoadedPage is called
        checkAndParse();
    }


    // extractDataFromDOM function (extracts data from the entire document)
    function extractDataFromDOM(document, phoneNumber) {
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
            // Find elements in the entire document
            const reportWrapper = document.querySelector('.comp-report');
            console.log('Checking for .comp-report element in document:', reportWrapper); // Debugging

            if (reportWrapper) {
                console.log('.comp-report element found!'); // Debugging
                console.log('.comp-report element className:', reportWrapper.className); // Debugging
                console.log('.comp-report element outerHTML (partial):', reportWrapper.outerHTML ? reportWrapper.outerHTML.substring(0, 500) + '...' : 'null'); // Debugging


                const reportNameElement = reportWrapper.querySelector('.report-name');
                 console.log('Checking for .report-name element in document:', reportNameElement); // Debugging
                if (reportNameElement) {
                    console.log('.report-name element found!'); // Debugging
                    console.log('.report-name element className:', reportNameElement.className); // Debugging
                    console.log('.report-name element outerHTML (partial):', reportNameElement.outerHTML ? reportNameElement.outerHTML.substring(0, 500) + '...' : 'null'); // Debugging

                    // Use textContent directly
                    jsonObject.sourceLabel = reportNameElement.textContent.trim();
                     console.log('Extracted sourceLabel:', jsonObject.sourceLabel); // Debugging
                }

                const reportTypeElement = reportWrapper.querySelector('.report-type');
                 console.log('Checking for .report-type element in document:', reportTypeElement); // Debugging
                if (reportTypeElement) {
                    console.log('.report-type element found!'); // Debugging
                     console.log('.report-type element className:', reportTypeElement.className); // Debugging
                    console.log('.report-type element outerHTML (partial):', reportTypeElement.outerHTML ? reportTypeElement.outerHTML.substring(0, 500) + '...' : 'null'); // Debugging

                     // Use textContent directly
                    const reportTypeText = reportTypeElement.textContent.trim();
                    console.log('Extracted reportTypeText:', reportTypeText); // Debugging
                    if (reportTypeText === '用户标记') {
                        jsonObject.count = 1;
                         console.log('Set count to 1'); // Debugging
                    }
                }
            }
            // Find .tel-info .location in the document
            const locationElement = document.querySelector('.tel-info .location');
            console.log('Checking for .tel-info .location element in document:', locationElement); // Debugging
            if (locationElement) {
                console.log('.tel-info .location element found!'); // Debugging
                console.log('.tel-info .location element className:', locationElement.className); // Debugging
                console.log('.tel-info .location element outerHTML (partial):', locationElement.outerHTML ? locationElement.outerHTML.substring(0, 500) + '...' : 'null'); // Debugging

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
                 console.log('generateOutput called (triggering page load):', phoneNumber, requestId);
                 // This function is called by Flutter to initiate the process.
                 // It should trigger the page load in Flutter.
                 // Flutter's onLoadStop will then call parseLoadedPage in JS.
                 // We need a mechanism to pass the phone number and requestId to onLoadStop.
                 // Let's rely on Flutter to store these and pass them in the evaluateJavascript call in onLoadStop.
                 // So, this function doesn't need to do anything else here.
            },
            parseLoadedPage: parseLoadedPage, // Expose the parsing function
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
