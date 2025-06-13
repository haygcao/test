(function () { 
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
            id: 'baiPhoneNumberPlugin',
            name: 'bai',
            version: '1.32.0',
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
        '骚扰电话': 'Spam Likely',
        '广告营销': 'Telemarketing',
        '广告推销': 'Telemarketing',
        '旅游推广': 'Telemarketing',
        '食药推销': 'Telemarketing',      
        '推销': 'Telemarketing',
        '商业营销': 'Telemarketing', // 添加从示例中看到的标签
    };

    // 存储待处理的请求
    const pendingRequests = new Map();

    function queryPhoneInfo(phoneNumber, externalRequestId) {
        const phoneRequestId = Math.random().toString(36).substring(2);
        console.log(`queryPhoneInfo: phone=${phoneNumber}, externalRequestId=${externalRequestId}, phoneRequestId=${phoneRequestId}`);

        // 存储请求信息，用于后续处理响应
        pendingRequests.set(phoneRequestId, {
            phoneNumber: phoneNumber,
            externalRequestId: externalRequestId,
            timestamp: Date.now()
        });

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

    // handleResponse 函数 (JavaScript) - 按顺序加载脚本
    function handleResponse(response) {
        console.log('handleResponse called with:', response);
        
        const requestInfo = pendingRequests.get(response.phoneRequestId);
        if (!requestInfo) {
            console.error('No pending request found for phoneRequestId:', response.phoneRequestId);
            // Optionally send an error back to Flutter for this case
            sendResultToFlutter('pluginError', { 
                 error: 'Internal JS error: No pending request info' 
            }, response.externalRequestId, response.phoneRequestId); // Use both IDs here
            return;
        }

        const phoneNumber = requestInfo.phoneNumber;
        const externalRequestId = requestInfo.externalRequestId;
        const phoneRequestId = response.phoneRequestId;


        if (response.status >= 200 && response.status < 300) {
            const htmlContent = response.responseText;

            // Clear current page content
            document.documentElement.innerHTML = ''; // Clear everything to start fresh
            console.log('Cleared document.documentElement.innerHTML'); // Debugging


            // Use DOMParser to get a temporary document to extract scripts
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            const scriptElements = Array.from(doc.querySelectorAll('script')); // Get all script elements in order


            // Now, add the received HTML content to the document
             // Recreate head and body elements to ensure a clean structure
             const newHead = document.createElement('head');
             const newBody = document.createElement('body');

             // Try to populate head and body from the parsed doc (excluding scripts for now)
             Array.from(doc.head.children).forEach(element => {
                 if (element.tagName !== 'SCRIPT') {
                     newHead.appendChild(element.cloneNode(true));
                 }
             });
             Array.from(doc.body.children).forEach(element => {
                  if (element.tagName !== 'SCRIPT') { // Avoid adding body scripts twice if we re-add them manually
                     newBody.appendChild(element.cloneNode(true));
                 }
             });

             // Replace existing head and body
             const oldHead = document.head;
             if (oldHead) oldHead.remove();
             const oldBody = document.body;
             if (oldBody) oldBody.remove();

             document.documentElement.appendChild(newHead);
             document.documentElement.appendChild(newBody);

             console.log('Recreated head and body, added non-script content.'); // Debugging


            // Load and execute scripts sequentially
            loadScriptsSequentially(scriptElements, () => {
                 console.log('All scripts loaded and executed (potentially).'); // Debugging
                 // Once scripts are likely executed, start waiting for content
                 waitForContentToLoad(phoneNumber, externalRequestId, phoneRequestId);
            });


        } else {
            console.error('HTTP Error:', response.status, response.statusText);
            sendResultToFlutter('pluginError', { 
                error: `HTTP ${response.status}: ${response.statusText}` 
            }, externalRequestId, phoneRequestId); // Use phoneRequestId for error
            pendingRequests.delete(phoneRequestId);
        }
    }


    // 新增：按顺序加载并执行脚本的函数
    function loadScriptsSequentially(scripts, callback) {
        let i = 0;
        function loadNextScript() {
            if (i < scripts.length) {
                const scriptElement = scripts[i];
                const newScript = document.createElement('script');

                if (scriptElement.src) {
                    // External script
                    newScript.src = scriptElement.src;
                     // Use onload and onerror to load the next script after current one finishes
                    newScript.onload = () => {
                         console.log('Script loaded successfully:', newScript.src); // Debugging
                        i++;
                        loadNextScript();
                    };
                    newScript.onerror = () => {
                         console.error('Error loading script:', newScript.src); // Debugging
                        i++;
                        loadNextScript(); // Continue with the next script even if one fails
                    };
                    // Don't set async to false, let them load asynchronously but execute in order
                    // newScript.async = false; // This might not work as expected for script execution order

                    document.head.appendChild(newScript) || document.body.appendChild(newScript);
                    console.log('Loading external script sequentially:', newScript.src); // Debugging

                } else {
                    // Inline script
                    newScript.textContent = scriptElement.textContent;
                     try {
                         // Append inline script to head or body and execute immediately
                         document.head.appendChild(newScript) || document.body.appendChild(newScript);
                         console.log('Executing inline script sequentially (partial):', newScript.textContent.substring(0, 100) + '...'); // Debugging
                     } catch (e) {
                         console.error('Error executing inline script:', e); // Debugging
                     }
                    i++;
                    loadNextScript(); // Move to the next script immediately after executing inline
                }
            } else {
                // All scripts loaded
                if (callback) callback();
            }
        }

        loadNextScript(); // Start loading the first script
    }



    // 等待内容加载的函数 - 增加尝试次数和 Shadow DOM 宿主查找，增加日志
    function waitForContentToLoad(phoneNumber, externalRequestId, phoneRequestId, attempt = 0) { // Added phoneRequestId
        const maxAttempts = 150; // Increase max attempts further (150 * 200ms = 30 seconds)
        const delay = 200; 

        console.log(`Attempt ${attempt + 1}/${maxAttempts} to find content...`);

        let foundContent = false;

        try {
            // Prioritize checking Shadow DOM host and its content
            const shadowHost = document.querySelector('#__hcfy__'); 
            if (shadowHost && shadowHost.shadowRoot) {
                console.log('Found Shadow DOM host and shadowRoot.');
                
                const shadowReportWrapper = shadowHost.shadowRoot.querySelector('.report-wrapper');
                const shadowLocation = shadowHost.shadowRoot.querySelector('.location');

                if (shadowReportWrapper && shadowReportWrapper.textContent.trim() !== "" || (shadowLocation && shadowLocation.textContent.trim() !== "")) {
                    console.log('Found content in Shadow DOM.');
                    const result = parseResponse(shadowHost.shadowRoot, phoneNumber); 
                    sendResultToFlutter('pluginResult', result, externalRequestId, phoneRequestId); 
                    pendingRequests.delete(phoneRequestId);
                    foundContent = true;
                    return;
                } else {
                    console.log('Shadow DOM report wrapper or location not found or empty.');
                     if (shadowHost.shadowRoot) console.log('ShadowRoot innerHTML (partial):', shadowHost.shadowRoot.innerHTML ? shadowHost.shadowRoot.innerHTML.substring(0, 500) + '...' : 'null'); // Add null check
                }
            } else {
                 console.log('Shadow DOM host #__hcfy__ not found or shadowRoot not available.');
            }

            // If not found in Shadow DOM, check the main document
            if (!foundContent) {
                 const selectors = [
                     '.report-wrapper .report-name',
                     '.comp-report .report-name', 
                     '.tel-info .report-name',
                     '[class*="report-name"]',
                     '.report-wrapper',
                     '.comp-report',
                     '.location', 
                     '[class*="location"]',
                     '#__next' // Add React root element selector
                 ];

                 let foundElement = null;
                 let targetText = '';

                 for (const selector of selectors) {
                     const elements = document.querySelectorAll(selector);
                     for (const element of elements) {
                         const text = element.textContent.trim();
                         
                         if (text && text !== '' && !text.includes('loading') && !text.includes('加载')) {
                             // Exclude script elements from potentially being the target element
                             if (element.tagName !== 'SCRIPT') {
                                 foundElement = element;
                                 targetText = text;
                                 console.log(`Found content in main document with selector "${selector}": "${text}"`);
                                 break;
                             }
                         }
                     }
                     if (foundElement) break;
                 }

                 if (foundElement && targetText) {
                     console.log('Content found in main document, parsing...');
                     setTimeout(() => {
                         const result = parseResponse(document, phoneNumber); // Pass the main document
                         sendResultToFlutter('pluginResult', result, externalRequestId, phoneRequestId);
                         pendingRequests.delete(phoneRequestId);
                     }, 100); 
                     foundContent = true;
                 } else {
                     // Log content of potential root elements even if not found
                      const rootElement = document.querySelector('#root');
                      if (rootElement) console.log('#root innerHTML length (during wait):', rootElement.innerHTML.length);
                       const nextElement = document.querySelector('#__next');
                       if (nextElement) console.log('#__next innerHTML length (during wait):', nextElement.innerHTML.length);

                 }
            }

        } catch (e) {
             console.error('Error during content waiting or parsing:', e);
             // Continue waiting or send error? Let's log and continue waiting for now.
        }


        if (!foundContent) {
            if (attempt < maxAttempts - 1) {
                setTimeout(() => {
                    waitForContentToLoad(phoneNumber, externalRequestId, phoneRequestId, attempt + 1);
                }, delay);
            } else {
                // Timeout, attempt to parse existing content or return error
                console.log('Timeout waiting for content, attempting to parse existing DOM (final attempt)...');
                
                let finalResult = {};
                try {
                   // Try parsing from Shadow DOM first if host is found
                   const shadowHost = document.querySelector('#__hcfy__');
                   if (shadowHost && shadowHost.shadowRoot) {
                        finalResult = parseResponse(shadowHost.shadowRoot, phoneNumber);
                         console.log('Final parse attempt from Shadow DOM:', finalResult);
                   }
                   
                   // If no meaningful result from Shadow DOM, try main document
                   if (!finalResult.sourceLabel && finalResult.count === 0 && finalResult.province === "" && finalResult.city === "") {
                        finalResult = parseResponse(document, phoneNumber);
                        console.log('Final parse attempt from main document:', finalResult);
                   }

                } catch (e) {
                   console.error('Error in final parsing attempt:', e);
                }


                if (finalResult.sourceLabel || finalResult.count > 0 || finalResult.province || finalResult.city) { // Check for any meaningful data
                    sendResultToFlutter('pluginResult', finalResult, externalRequestId, phoneRequestId); 
                } else {
                    console.log('No meaningful content found after timeout');
                    sendResultToFlutter('pluginError', { 
                        error: 'Timeout: Unable to load dynamic content' 
                    }, externalRequestId, phoneRequestId); 
                }
                pendingRequests.delete(phoneRequestId);
            }
        }
    }

    // 改进的解析函数
    function parseResponse(doc, phoneNumber) {
        return extractDataFromDOM(doc, phoneNumber);
    }

    // 改进的数据提取函数
    function extractDataFromDOM(doc, phoneNumber) {
        const jsonObject = {
            count: 0,
            sourceLabel: "",
            predefinedLabel: "",
            province: "",
            city: "",
            carrier: "unknown",
            phoneNumber: phoneNumber,
            name: ""
        };

        try {
            console.log('Starting DOM extraction from provided context...');
            
            // Try multiple selectors for the report wrapper within the context
            let reportWrapper = doc.querySelector('.report-wrapper');
            if (!reportWrapper) {
                reportWrapper = doc.querySelector('.comp-report');
            }
            

            if (reportWrapper) {
                console.log('Found report wrapper in context');
                
                // Extract report name
                const reportNameSelectors = ['.report-name', '[class*="report-name"]'];
                for (const selector of reportNameSelectors) {
                    const reportNameElement = reportWrapper.querySelector(selector);
                    if (reportNameElement && reportNameElement.textContent.trim()) {
                        const sourceLabel = decodeQuotedPrintable(reportNameElement.textContent.trim());
                        jsonObject.sourceLabel = sourceLabel;
                        
                        // Map to predefined label
                        jsonObject.predefinedLabel = manualMapping[sourceLabel] || sourceLabel;
                        console.log(`Found source label in context: ${sourceLabel} -> ${jsonObject.predefinedLabel}`);
                        break;
                    }
                }

                // Extract report type
                const reportTypeSelectors = ['.report-type', '[class*="report-type"]'];
                for (const selector of reportTypeSelectors) {
                    const reportTypeElement = reportWrapper.querySelector(selector);
                    if (reportTypeElement && reportTypeElement.textContent.trim()) {
                        const reportTypeText = decodeQuotedPrintable(reportTypeElement.textContent.trim());
                        console.log(`Found report type in context: ${reportTypeText}`);
                        if (reportTypeText === '用户标记' || reportTypeText.includes('标记')) {
                            jsonObject.count = 1;
                        }
                        break;
                    }
                }
            } else {
                console.log('Report wrapper not found in context.');
            }

            // Extract location information within the context
            const locationSelectors = ['.location', '[class*="location"]'];
            for (const selector of locationSelectors) {
                 const locationElement = doc.querySelector(selector);
                 if (locationElement && locationElement.textContent.trim()) {
                     const locationText = decodeQuotedPrintable(locationElement.textContent.trim());
                     console.log(`Found location in context: ${locationText}`);
                     const match = locationText.match(/([\u4e00-\u9fa5]+)[\s]+([\u4e00-\u9fa5]+)?/);
                     if (match) {
                         jsonObject.province = match[1] || '';
                         jsonObject.city = match[2] || '';
                     }
                     break;
                 }
            }

            // If no report info found, try alternative search in the main document
            if (!jsonObject.sourceLabel && jsonObject.count === 0 && jsonObject.province === "" && jsonObject.city === "") {
                 console.log('No report info found in context, trying alternative search in main document...');
                 const mainDoc = document; 
                 const allElements = mainDoc.querySelectorAll('*');
                 for (const element of allElements) {
                     const text = element.textContent.trim();
                     if (text && Object.keys(manualMapping).some(key => text.includes(key))) {
                         console.log(`Found potential label in main document element: ${text}`);
                         for (const [chinese, english] of Object.entries(manualMapping)) {
                             if (text.includes(chinese)) {
                                 jsonObject.sourceLabel = chinese;
                                 jsonObject.predefinedLabel = english;
                                 jsonObject.count = 1;
                                 break;
                             }
                         }
                         if (jsonObject.sourceLabel) break; 
                     }
                 }
            }


            console.log('Extraction completed:', jsonObject);
            
        } catch (error) {
            console.error('Error extracting data:', error);
        }

        return jsonObject;
    }

    // Quoted-Printable 解码函数
    function decodeQuotedPrintable(str) {
        if (!str) return str;
        
        try {
            // Handle URL encoded characters
            str = str.replace(/%([0-9A-Fa-f]{2})/g, function(match, p1) {
                return String.fromCharCode(parseInt(p1, 16));
            });
            
            // Handle Quoted-Printable encoding
            str = str.replace(/=([0-9A-Fa-f]{2})/g, function(match, p1) {
                return String.fromCharCode(parseInt(p1, 16));
            });
            
            str = str.replace(/=\r?\n/g, '');
            str = str.replace(/=3D/g, "=");
            
            return str;
        } catch (e) {
            console.error('Error decoding:', e);
            return str;
        }
    }

    // 发送结果到Flutter
    function sendResultToFlutter(type, data, externalRequestId, phoneRequestId) { 
        const resultMessage = {
            type: type,
            pluginId: pluginId,
            requestId: externalRequestId, 
            data: data
        };

        console.log('Sending result to Flutter:', resultMessage);

        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify(resultMessage));
        } else {
            console.error('flutter_inappwebview is not available');
        }
    }

    // generateOutput 函数
    async function generateOutput(phoneNumber, nationalNumber, e164Number, externalRequestId) {
        console.log('generateOutput called with:', phoneNumber, externalRequestId);

        // 清理超时的请求
        const now = Date.now();
        for (const [key, value] of pendingRequests.entries()) {
            if (now - value.timestamp > 30000) { 
                console.log('Pending request timed out:', key);
                sendResultToFlutter('pluginError', { 
                     error: 'Internal JS timeout' 
                }, value.externalRequestId, key); 
                pendingRequests.delete(key);
            }
        }

        // 按优先级查询电话号码
        const currentPhoneRequestId = Math.random().toString(36).substring(2);
         console.log('Generated new phoneRequestId for generateOutput:', currentPhoneRequestId);

         pendingRequests.set(currentPhoneRequestId, {
            phoneNumber: phoneNumber,
            externalRequestId: externalRequestId, 
            timestamp: Date.now()
         });


        if (phoneNumber) {
            queryPhoneInfo(phoneNumber, externalRequestId, currentPhoneRequestId);
        } else if (nationalNumber) {
            queryPhoneInfo(nationalNumber, externalRequestId, currentPhoneRequestId);
        } else if (e164Number) {
            queryPhoneInfo(e164Number, externalRequestId, currentPhoneRequestId);
        }
    }

    // queryPhoneInfo now accepts phoneRequestId
     function queryPhoneInfo(phoneNumber, externalRequestId, phoneRequestId) {
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

    // sendRequest now accepts phoneRequestId
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


    // handleResponse now uses phoneRequestId to retrieve pending request info, and loads scripts sequentially
    function handleResponse(response) {
        console.log('handleResponse called with:', response);

        const requestInfo = pendingRequests.get(response.phoneRequestId);
        if (!requestInfo) {
            console.error('No pending request found for phoneRequestId:', response.phoneRequestId);
            sendResultToFlutter('pluginError', { 
                 error: 'Internal JS error: No pending request info' 
            }, response.externalRequestId, response.phoneRequestId); 
            return;
        }

        const phoneNumber = requestInfo.phoneNumber;
        const externalRequestId = requestInfo.externalRequestId;
        const phoneRequestId = response.phoneRequestId;


        if (response.status >= 200 && response.status < 300) {
            const htmlContent = response.responseText;

            // Clear current page content
            document.documentElement.innerHTML = ''; 
            console.log('Cleared document.documentElement.innerHTML');

            // Use DOMParser to get a temporary document to extract scripts and body content
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            const scriptElements = Array.from(doc.querySelectorAll('script')); 
            console.log('Extracted script elements:', scriptElements.length);

             // Extract non-script content from original head and body
             const newHead = document.createElement('head');
             const newBody = document.createElement('body');

             Array.from(doc.head.children).forEach(element => {
                 if (element.tagName !== 'SCRIPT') {
                     newHead.appendChild(element.cloneNode(true));
                 }
             });
             Array.from(doc.body.children).forEach(element => {
                  if (element.tagName !== 'SCRIPT') { 
                     newBody.appendChild(element.cloneNode(true));
                 }
             });

             // Replace existing head and body
             const oldHead = document.head;
             if (oldHead) oldHead.remove();
             const oldBody = document.body;
             if (oldBody) oldBody.remove();

             document.documentElement.appendChild(newHead);
             document.documentElement.appendChild(newBody);

             console.log('Recreated head and body, added non-script content.');


            // Load and execute scripts sequentially
            loadScriptsSequentially(scriptElements, () => {
                 console.log('All scripts loaded and executed (potentially).'); 
                 waitForContentToLoad(phoneNumber, externalRequestId, phoneRequestId);
            });


        } else {
            console.error('HTTP Error:', response.status, response.statusText);
            sendResultToFlutter('pluginError', { 
                error: `HTTP ${response.status}: ${response.statusText}` 
            }, externalRequestId, phoneRequestId);
            pendingRequests.delete(phoneRequestId);
        }
    }

    // 新增：按顺序加载并执行脚本的函数
    function loadScriptsSequentially(scripts, callback) {
        let i = 0;
        function loadNextScript() {
            if (i < scripts.length) {
                const scriptElement = scripts[i];
                const newScript = document.createElement('script');

                if (scriptElement.src) {
                    // External script
                    newScript.src = scriptElement.src;
                    newScript.onload = () => {
                         console.log('Script loaded successfully:', newScript.src); 
                        i++;
                        loadNextScript();
                    };
                    newScript.onerror = () => {
                         console.error('Error loading script:', newScript.src); 
                        i++;
                        loadNextScript(); 
                    };
                    // Try setting async to false for potentially better order control
                    newScript.async = false; 

                    document.head.appendChild(newScript) || document.body.appendChild(newScript);
                    console.log('Loading external script sequentially:', newScript.src);

                } else {
                    // Inline script
                    newScript.textContent = scriptElement.textContent;
                     try {
                         // Append inline script to head or body and execute immediately
                         document.head.appendChild(newScript) || document.body.appendChild(newScript);
                         console.log('Executing inline script sequentially (partial):', newScript.textContent.substring(0, 100) + '...'); 
                     } catch (e) {
                         console.error('Error executing inline script:', e); 
                     }
                    i++;
                    loadNextScript(); 
                }
            } else {
                // All scripts loaded
                if (callback) callback();
            }
        }

        // Small delay before starting script loading to allow DOM a moment to settle
         setTimeout(loadNextScript, 50); 
    }



    // 等待内容加载的函数 - 增加尝试次数和 Shadow DOM 宿主查找，增加日志
    function waitForContentToLoad(phoneNumber, externalRequestId, phoneRequestId, attempt = 0) { 
        const maxAttempts = 200; // Increase max attempts further (200 * 200ms = 40 seconds)
        const delay = 200; 

        console.log(`Attempt ${attempt + 1}/${maxAttempts} to find content...`);

        let foundContent = false;

        try {
