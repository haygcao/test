(function () { 
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
            id: 'baiPhoneNumberPlugin',
            name: 'bai',
            version: '1.42.0',
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
    const executedScripts = new Set(); // To keep track of executed inline scripts by content
    const loadedScripts = new Set(); // To keep track of loaded external scripts by src

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

    // handleResponse 函数 (JavaScript) - 设置 HTML 并观察新添加的脚本并尝试执行
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

             // Set the HTML content directly. This should include the head and body structure.
             // This is the crucial step to get the browser to parse the HTML and potentially start loading resources.
             document.documentElement.innerHTML = htmlContent;
             console.log('Set document.documentElement.innerHTML'); // Debugging

            // Reset executed scripts and loaded scripts sets for this new page load
            executedScripts.clear();
            loadedScripts.clear();


            // Start observing for content and dynamically added scripts
            // Pass the request IDs to the observer's check function
            observeForContentAndScripts(phoneNumber, externalRequestId, phoneRequestId);


        } else {
            console.error('HTTP Error:', response.status, response.statusText);
            sendResultToFlutter('pluginError', { 
                error: `HTTP ${response.status}: ${response.statusText}` 
            }, externalRequestId, phoneRequestId);
            pendingRequests.delete(phoneRequestId);
        }
    }


    // 新增：观察并尝试执行新添加的脚本和等待内容加载
    function observeForContentAndScripts(phoneNumber, externalRequestId, phoneRequestId) {
        const timeout = 40000; // Increased timeout further (40 seconds)
        const interval = 200; // Check interval
        const startTime = Date.now();
        let observer = null; 

        function checkAndProcess() {
             console.log(`Attempt to find content and process scripts...`);

             // --- 检查新添加的脚本并尝试执行 ---
             // Observe the entire document to catch scripts added anywhere
             const newScripts = document.querySelectorAll('script:not([data-processed])'); // Find scripts not marked as processed
             newScripts.forEach(script => {
                  // Mark script as processed to avoid reprocessing
                  script.setAttribute('data-processed', 'true'); 
                  console.log('Observed new script:', script); // Debugging: Log the script element

                  if (script.src) {
                       // External script
                       const scriptSrc = script.src;
                       if (!loadedScripts.has(scriptSrc)) {
                           console.log('Observed new external script, attempting to load:', scriptSrc); // Debugging
                            // We assume the browser loads it when added to DOM, but we can add listeners
                           script.onerror = () => { 
                                console.error('Error loading observed external script:', scriptSrc); 
                                // Add to loadedScripts even on error to avoid reprocessing
                                loadedScripts.add(scriptSrc); 
                           };
                           script.onload = () => { 
                                console.log('Observed external script loaded successfully:', scriptSrc); 
                                loadedScripts.add(scriptSrc); 
                           };
                           // No need to manually create/append again, it's already in DOM,
                           // just adding listeners and marking as processed.
                           loadedScripts.add(scriptSrc); // Mark as loaded immediately, relies on onerror/onload for actual status
                       } else {
                            console.log('Observed external script already processed:', scriptSrc); // Debugging
                       }

                  } else if (script.textContent.trim()) {
                       // Inline script
                       const scriptContent = script.textContent;
                       const scriptContentHash = scriptContent.length + ':' + scriptContent.substring(0, 50); // Simple hash
                       if (!executedScripts.has(scriptContentHash)) {
                           console.log('Observed new inline script, attempting to execute (partial):', scriptContent.substring(0, 100) + '...'); // Debugging
                            try {
                                // Use a function wrapper to avoid polluting the global scope
                                eval('(function() {' + scriptContent + '})();'); 
                                executedScripts.add(scriptContentHash); // Mark as executed
                                console.log('Executed inline script.'); // Debugging
                            } catch (e) {
                                console.error('Error executing observed inline script:', e); // Debugging
                            }
                       } else {
                            console.log('Observed inline script already executed.'); // Debugging
                       }
                  }
             });
             // --- 结束检查和执行脚本 ---


             // --- 检查内容是否加载 ---
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
                         // Stop observing after finding content
                         if (observer) observer.disconnect(); 
                         return;
                     } else {
                         console.log('Shadow DOM report wrapper or location not found or empty.');
                         if (shadowHost.shadowRoot) console.log('ShadowRoot innerHTML (partial):', shadowHost.shadowRoot.innerHTML ? shadowHost.shadowRoot.innerHTML.substring(0, 500) + '...' : 'null'); 
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
                          '#__next', 
                          '#root' 
                      ];

                      let foundElement = null;
                      let targetText = '';

                      for (const selector of selectors) {
                          const elements = document.querySelectorAll(selector);
                          for (const element of elements) {
                              const text = element.textContent.trim();
                              
                              if (text && text !== '' && !text.includes('loading') && !text.includes('加载')) {
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
                              const result = parseResponse(document, phoneNumber); 
                              sendResultToFlutter('pluginResult', result, externalRequestId, phoneRequestId);
                              pendingRequests.delete(phoneRequestId);
                          }, 100); 
                          foundContent = true;
                          if (observer) observer.disconnect(); 
                          return;
                      } else {
                           const rootElement = document.querySelector('#root');
                           if (rootElement) console.log('#root innerHTML length (during wait):', rootElement.innerHTML ? rootElement.innerHTML.length : 'null');
                            const nextElement = document.querySelector('#__next');
                            if (nextElement) console.log('#__next innerHTML length (during wait):', nextElement.innerHTML ? nextElement.innerHTML.length : 'null');
                             const bodyInnerHtmlLength = document.body.innerHTML ? document.body.innerHTML.length : 'null';
                             console.log('document.body innerHTML length (during wait):', bodyInnerHtmlLength);


                      }
                 }

             } catch (e) {
                  console.error('Error during content waiting or parsing:', e);
                  // Continue observing even if there's an error during checks
             }

            // Check for timeout
            if (Date.now() - startTime >= timeout) {
                console.log('Timeout waiting for content, attempting to parse existing DOM (final attempt)...');
                if (observer) observer.disconnect(); 
                
                let finalResult = {};
                try {
                   const shadowHost = document.querySelector('#__hcfy__');
                   if (shadowHost && shadowHost.shadowRoot) {
                        finalResult = parseResponse(shadowHost.shadowRoot, phoneNumber);
                         console.log('Final parse attempt from Shadow DOM:', finalResult);
                   }
                   
                   if (!finalResult.sourceLabel && finalResult.count === 0 && finalResult.province === "" && finalResult.city === "") {
                        finalResult = parseResponse(document, phoneNumber);
                        console.log('Final parse attempt from main document:', finalResult);
                   }

                } catch (e) {
                   console.error('Error in final parsing attempt:', e);
                }


                if (finalResult.sourceLabel || finalResult.count > 0 || finalResult.province || finalResult.city) { 
                    sendResultToFlutter('pluginResult', finalResult, externalRequestId, phoneRequestId); 
                } else {
                    console.log('No meaningful content found after timeout');
                    sendResultToFlutter('pluginError', { 
                        error: 'Timeout: Unable to load dynamic content' 
                    }, externalRequestId, phoneRequestId); 
                }
                pendingRequests.delete(phoneRequestId);
            } else {
                // If not timed out, continue observing and checking
                 setTimeout(checkAndProcess, delay);
            }
        }

        // Use MutationObserver to listen for changes in the document
        // This helps in detecting when new elements, including scripts, are added or modified
        // Observe childList changes in the entire document element and its subtree
        const observerTarget = document.documentElement || document.body; // Observe documentElement or body
        if (observerTarget) {
             observer = new MutationObserver((mutationsList, observer) => {
                  // Perform check and process scripts after each DOM change
                  checkAndProcess(); 
             });

             // Configure the observer to watch for changes in child nodes and their subtrees
             const config = { childList: true, subtree: true }; // Observe child additions/removals and changes in their subtrees
             // Start observing from the specified target
             observer.observe(observerTarget, config); 

             console.log('Started observing for content and scripts...');

             // Initial check in case content is already present or scripts are already in DOM
             checkAndProcess(); 
        } else {
             console.error('MutationObserver target (documentElement or body) not found.');
             // If we can't even find a target to observe, something is fundamentally wrong.
             // Send an error.
             sendResultToFlutter('pluginError', { 
                  error: 'Internal JS error: Cannot find observer target' 
             }, externalRequestId, phoneRequestId); 
             pendingRequests.delete(phoneRequestId);
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
            
            let reportWrapper = doc.querySelector('.report-wrapper');
            if (!reportWrapper) {
                reportWrapper = doc.querySelector('.comp-report');
            }
            

            if (reportWrapper) {
                console.log('Found report wrapper in context');
                
                const reportNameSelectors = ['.report-name', '[class*="report-name"]'];
                for (const selector of reportNameSelectors) {
                    const reportNameElement = reportWrapper.querySelector(selector);
                    if (reportNameElement && reportNameElement.textContent.trim()) {
                        const sourceLabel = decodeQuotedPrintable(reportNameElement.textContent.trim());
                        jsonObject.sourceLabel = sourceLabel;
                        
                        jsonObject.predefinedLabel = manualMapping[sourceLabel] || sourceLabel;
                        console.log(`Found source label in context: ${sourceLabel} -> ${jsonObject.predefinedLabel}`);
                        break;
                    }
                }

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
            str = str.replace(/%([0-9A-Fa-f]{2})/g, function(match, p1) {
                return String.fromCharCode(parseInt(p1, 16));
            });
            
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

        const now = Date.now();
        for (const [key, value] of pendingRequests.entries()) {
            if (now - value.timestamp > 40000) { 
                console.log('Pending request timed out:', key);
                sendResultToFlutter('pluginError', { 
                     error: 'Internal JS timeout' 
                }, value.externalRequestId, key); 
                pendingRequests.delete(key);
            }
        }

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


    // handleResponse now uses phoneRequestId to retrieve pending request info, sets HTML and observes for scripts and content
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

            // Set the HTML content directly. This should include the head and body structure.
             document.documentElement.innerHTML = htmlContent;
             console.log('Set document.documentElement.innerHTML'); // Debugging

            // Reset executed scripts and loaded scripts sets for this new page load
            executedScripts.clear();
            loadedScripts.clear();

            // Start observing for content and dynamically added scripts
            // Pass the request IDs to the observer's check function
            observeForContentAndScripts(phoneNumber, externalRequestId, phoneRequestId);


        } else {
            console.error('HTTP Error:', response.status, response.statusText);
            sendResultToFlutter('pluginError', { 
                error: `HTTP ${response.status}: ${response.statusText}` 
            }, externalRequestId, phoneRequestId);
            pendingRequests.delete(phoneRequestId);
        }
    }

// 新增：观察并尝试执行新添加的脚本和等待内容加载
function observeForContentAndScripts(phoneNumber, externalRequestId, phoneRequestId) {
    const timeout = 40000; 
    const interval = 200; 
    const startTime = Date.now();
    let observer = null; 

    function checkAndProcess() {
         console.log(`Attempt to find content and process scripts...`);

         // --- 检查新添加的脚本并尝试执行 ---
         // Observe the entire document to catch scripts added anywhere
         const newScripts = document.querySelectorAll('script:not([data-processed])'); 
         newScripts.forEach(script => {
              // Mark script as processed to avoid reprocessing
              script.setAttribute('data-processed', 'true'); 
              console.log('Observed new script:', script); 

              if (script.src) {
                   const scriptSrc = script.src;
                   if (!loadedScripts.has(scriptSrc)) {
                       console.log('Observed new external script, attempting to load:', scriptSrc); 
                       script.onerror = () => { 
                            console.error('Error loading observed external script:', scriptSrc); 
                            loadedScripts.add(scriptSrc); 
                       };
                       script.onload = () => { 
                            console.log('Observed external script loaded successfully:', scriptSrc); 
                            loadedScripts.add(scriptSrc); 
                       };
                       // We rely on the browser to load scripts when added to the DOM.
                       // No need to create/append again if it's already there.
                       loadedScripts.add(scriptSrc); 
                   } else {
                        console.log('Observed external script already processed:', scriptSrc); 
                   }

              } else if (script.textContent.trim()) {
                   const scriptContent = script.textContent;
                   const scriptContentHash = scriptContent.length + ':' + scriptContent.substring(0, 50); 
                   if (!executedScripts.has(scriptContentHash)) {
                       console.log('Observed new inline script, attempting to execute (partial):', scriptContent.substring(0, 100) + '...'); 
                        try {
                            eval('(function() {' + scriptContent + '})();'); 
                            executedScripts.add(scriptContentHash); 
                            console.log('Executed inline script.'); 
                        } catch (e) {
                            console.error('Error executing observed inline script:', e); 
                        }
                   } else {
                        console.log('Observed inline script already executed.'); 
                   }
              }
         });
         // --- 结束检查和执行脚本 ---


         // --- 检查内容是否加载 ---
         let foundContent = false;

         try {
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
                     if (observer) observer.disconnect(); 
                     return;
                 } else {
                     console.log('Shadow DOM report wrapper or location not found or empty.');
                     if (shadowHost.shadowRoot) console.log('ShadowRoot innerHTML (partial):', shadowHost.shadowRoot.innerHTML ? shadowHost.shadowRoot.innerHTML.substring(0, 500) + '...' : 'null'); 
                 }
             } else {
                  console.log('Shadow DOM host #__hcfy__ not found or shadowRoot not available.');
             }

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
                      '#__next', 
                      '#root' 
                  ];

                  let foundElement = null;
                  let targetText = '';

                  for (const selector of selectors) {
                      const elements = document.querySelectorAll(selector);
                      for (const element of elements) {
                          const text = element.textContent.trim();
                          
                          if (text && text !== '' && !text.includes('loading') && !text.includes('加载')) {
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
                          const result = parseResponse(document, phoneNumber); 
                          sendResultToFlutter('pluginResult', result, externalRequestId, phoneRequestId);
                          pendingRequests.delete(phoneRequestId);
                      }, 100); 
                      foundContent = true;
                      if (observer) observer.disconnect(); 
                      return;
                  } else {
                       const rootElement = document.querySelector('#root');
                       if (rootElement) console.log('#root innerHTML length (during wait):', rootElement.innerHTML ? rootElement.innerHTML.length : 'null');
                        const nextElement = document.querySelector('#__next');
                        if (nextElement) console.log('#__next innerHTML length (during wait):', nextElement.innerHTML ? nextElement.innerHTML.length : 'null');
                         const bodyInnerHtmlLength = document.body.innerHTML ? document.body.innerHTML.length : 'null';
                         console.log('document.body innerHTML length (during wait):', bodyInnerHtmlLength);


                  }
             }

         } catch (e) {
              console.error('Error during content waiting or parsing:', e);
              // Continue observing even if there's an error during checks
         }

        // Check for timeout
        if (Date.now() - startTime >= timeout) {
            console.log('Timeout waiting for content, attempting to parse existing DOM (final attempt)...');
            if (observer) observer.disconnect(); 
            
            let finalResult = {};
            try {
               const shadowHost = document.querySelector('#__hcfy__');
               if (shadowHost && shadowHost.shadowRoot) {
                    finalResult = parseResponse(shadowHost.shadowRoot, phoneNumber);
                     console.log('Final parse attempt from Shadow DOM:', finalResult);
               }
               
               if (!finalResult.sourceLabel && finalResult.count === 0 && finalResult.province === "" && finalResult.city === "") {
                    finalResult = parseResponse(document, phoneNumber);
                    console.log('Final parse attempt from main document:', finalResult);
               }

            } catch (e) {
               console.error('Error in final parsing attempt:', e);
            }


            if (finalResult.sourceLabel || finalResult.count > 0 || finalResult.province || finalResult.city) { 
                sendResultToFlutter('pluginResult', finalResult, externalRequestId, phoneRequestId); 
            } else {
                console.log('No meaningful content found after timeout');
                sendResultToFlutter('pluginError', { 
                    error: 'Timeout: Unable to load dynamic content' 
                }, externalRequestId, phoneRequestId); 
            }
            pendingRequests.delete(phoneRequestId);
        } else {
            // If not timed out, continue observing and checking
             setTimeout(checkAndProcess, delay);
        }
    }

    // Use MutationObserver to listen for changes in the document
    // This helps in detecting when new elements, including scripts, are added or modified
    // Observe childList changes in the entire document element and its subtree
    const observerTarget = document.documentElement || document.body; // Observe documentElement or body
    if (observerTarget) {
         observer = new MutationObserver((mutationsList, observer) => {
              // Perform check and process scripts after each DOM change
              checkAndProcess(); 
         });

         // Configure the observer to watch for changes in child nodes and their subtrees
         const config = { childList: true, subtree: true }; // Observe child additions/removals and changes in their subtrees
         // Start observing from the specified target
         observer.observe(observerTarget, config); 

         console.log('Started observing for content and scripts...');

         // Initial check in case content is already present or scripts are already in DOM
         checkAndProcess(); 
    } else {
         console.error('MutationObserver target (documentElement or body) not found.');
         // If we can't even find a target to observe, something is fundamentally wrong.
         // Send an error.
         sendResultToFlutter('pluginError', { 
              error: 'Internal JS error: Cannot find observer target' 
         }, externalRequestId, phoneRequestId); 
         pendingRequests.delete(phoneRequestId);
    }
}
  // Helper function: send result or error to Flutter (uses externalRequestId)
  function sendResultToFlutter(type, data, externalRequestId) {
    const message = {
        type: type,
        pluginId: pluginId,
        requestId: externalRequestId, // Correct: Use externalRequestId here
        data: data,
    };
    const messageString = JSON.stringify(message);
    console.log('Sending message to Flutter:', messageString);
    if (window.flutter_inappwebview) {
        window.flutter_inappwebview.callHandler('PluginResultChannel', messageString);
    } else {
        console.error("flutter_inappwebview is undefined");
    }
}


// parseResponse function (defined by the plugin)
function parseResponse(responseText, phoneNumber) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(responseText, 'text/html');
    return extractDataFromDOM(doc, phoneNumber);
}

function extractDataFromDOM(doc, phoneNumber) {
    const jsonObject = {
        count: 0,
        sourceLabel: "",
        province: "",
        city: "",
        carrier: "",
        phoneNumber: phoneNumber,
        name: "unknown",
        rate: 0
    };

    try {
        const bodyElement = doc.body;
        if (!bodyElement) {
            console.error('Error: Could not find body element.');
            return jsonObject;
        }

        function findElementByText(selector, text) {
            const elements = doc.querySelectorAll(selector);
            for (const element of elements) {
                if (element.textContent.includes(text)) {
                    return element;
                }
            }
            return null;
        }

        const typesOfCallElement = findElementByText('b', "Types of call:");
        if (typesOfCallElement) {
            const nextSibling = typesOfCallElement.nextSibling;
            if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE) {
                let labelText = nextSibling.textContent.trim();
                if (labelText) {
                    jsonObject.sourceLabel = labelText;
                }
            }
        }

        if (!jsonObject.sourceLabel) {
            const scoreImage = doc.querySelector('a[href*="tellows_score"] img.scoreimage');
            if (scoreImage) {
                const altText = scoreImage.alt;
                const scoreMatch = altText.match(/Score\s([789])/);
                if (scoreMatch) {
                    jsonObject.sourceLabel = "Spam Call";
                }
            }
        }

        const callerIdElement = doc.querySelector('span.callerId');
        if (callerIdElement) {
            jsonObject.name = callerIdElement.textContent.trim();
        }


        const ratingsElement = findElementByText('strong', "Ratings:");

        if (ratingsElement) {
            const spanElement = ratingsElement.querySelector('span');
            if (spanElement) {
                const rateValue = parseInt(spanElement.textContent.trim(), 10) || 0;
                jsonObject.rate = rateValue;
                jsonObject.count = rateValue;
            }
        }

        const cityElement = findElementByText('strong', "City:");
        if (cityElement) {
            let nextSibling = cityElement.nextSibling;
            while (nextSibling) {
                if (nextSibling.nodeType === Node.TEXT_NODE) {
                    let cityText = nextSibling.textContent.trim();

                    const parts = cityText.split('-');
                    if (parts.length > 0) {
                        jsonObject.city = parts[0].trim();

                        if (parts.length > 1) {
                            const countries = parts[1].trim().split(',').map(c => c.trim());
                            jsonObject.province = countries.join(", ");
                        }
                    }
                    break;
                }
                nextSibling = nextSibling.nextSibling;
            }
        }


    } catch (error) {
        console.error('Error extracting data:', error);
    }

    console.log('Final jsonObject:', jsonObject);
    console.log('Final jsonObject type:', typeof jsonObject);
    return jsonObject;
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
