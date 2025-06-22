(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            'Referer': 'https://haoma.baidu.com/',
            'Origin': 'https://haoma.baidu.com',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Cache-Control': 'max-age=0'
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
    
    // 发送结果到Flutter
    function sendResultToFlutter(channel, data, externalRequestId) {
        const resultData = {
            ...data,
            externalRequestId: externalRequestId,
            pluginId: pluginId,
        };

        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify({
                type: channel,
                data: resultData,
            }));
            console.log(`Sent ${channel} to Flutter:`, resultData);
        } else {
            console.error('flutter_inappwebview is not defined');
        }
    }

    // 完全重写的文档替换函数 - 专门解决React应用加载问题
    function replaceEntireDocument(htmlString) {
        console.log('Replacing entire document with React-optimized method');
        
        try {
            // 保存当前插件脚本引用
            const pluginScripts = Array.from(document.querySelectorAll('script')).filter(script => 
                script.textContent.includes('tellowsPlugin') || script.textContent.includes('baiPhoneNumberPlugin')
            );
            
            // 使用DOMParser安全解析HTML
            const parser = new DOMParser();
            const newDoc = parser.parseFromString(htmlString, 'text/html');
            
            if (!newDoc || !newDoc.documentElement) {
                throw new Error('Failed to parse HTML string');
            }
            
            // 不设置document.domain，避免SecurityError
            // 使用document.open()和document.write()的替代方案
            
            // 保存当前的XMLHttpRequest原型，避免被覆盖
            const originalXHROpen = XMLHttpRequest.prototype.open;
            const originalXHRSend = XMLHttpRequest.prototype.send;
            
            // 重写XMLHttpRequest以统一处理百度域名请求
            XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
                // 检查是否是百度域名的请求
                if (url && (url.includes('baidu.com') || url.includes('bcebos.com'))) {
                    // 为百度域名请求设置withCredentials为false，避免CORS错误
                    this.withCredentials = false;
                }
                return originalXHROpen.call(this, method, url, async, user, password);
            };
            
            XMLHttpRequest.prototype.send = function(data) {
                // 为百度域名请求设置统一的请求头
                if (this._url && (this._url.includes('baidu.com') || this._url.includes('bcebos.com'))) {
                    this.setRequestHeader('Origin', 'https://haoma.baidu.com');
                    this.setRequestHeader('Referer', 'https://haoma.baidu.com/');
                }
                return originalXHRSend.call(this, data);
            };
            
            // 完全替换HTML结构
            const newHtml = newDoc.documentElement;
            const currentHtml = document.documentElement;
            
            // 保存html标签的属性
            Array.from(newHtml.attributes).forEach(attr => {
                currentHtml.setAttribute(attr.name, attr.value);
            });
            
            // 完全重建head - 确保所有资源正确加载
            const newHead = newDoc.head;
            const currentHead = document.head;
            
            // 清空当前head
            while (currentHead.firstChild) {
                currentHead.removeChild(currentHead.firstChild);
            }
            
            // 首先添加charset meta标签
            const charsetMeta = document.createElement('meta');
            charsetMeta.setAttribute('charset', 'utf-8');
            currentHead.appendChild(charsetMeta);
            
            // 添加base标签确保正确的资源路径
            const baseTag = document.createElement('base');
            baseTag.href = 'https://haoma.baidu.com/';
            currentHead.appendChild(baseTag);
            
            // 按照原始HTML的确切顺序添加所有head元素
            Array.from(newHead.children).forEach((element, index) => {
                const tagName = element.tagName.toLowerCase();
                
                if (tagName === 'script') {
                    // 创建新的script元素确保执行
                    const newScript = document.createElement('script');
                    
                    // 复制所有属性
                    Array.from(element.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });
                    
                    // 处理内联脚本
                    if (element.textContent && !element.src) {
                        newScript.textContent = element.textContent;
                    }
                    
                    // 确保脚本按顺序同步加载
                    if (element.src) {
                        newScript.async = false;
                        newScript.defer = false;
                    }
                    
                    currentHead.appendChild(newScript);
                } else if (tagName === 'meta' && element.getAttribute('charset')) {
                    // 跳过charset meta标签，因为已经添加了
                    return;
                } else {
                    // 直接克隆其他元素
                    const clonedElement = element.cloneNode(true);
                    currentHead.appendChild(clonedElement);
                }
            });
            
            // 完全重建body
            const newBody = newDoc.body;
            const currentBody = document.body;
            
            // 清空当前body
            while (currentBody.firstChild) {
                currentBody.removeChild(currentBody.firstChild);
            }
            
            // 复制body属性
            Array.from(newBody.attributes).forEach(attr => {
                currentBody.setAttribute(attr.name, attr.value);
            });
            
            // 添加body内容，确保React应用能正确初始化
            Array.from(newBody.children).forEach(element => {
                if (element.tagName === 'SCRIPT') {
                    // 重新创建script标签确保执行
                    const newScript = document.createElement('script');
                    
                    Array.from(element.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });
                    
                    if (element.textContent && !element.src) {
                        newScript.textContent = element.textContent;
                    }
                    
                    // 确保React相关脚本能正确执行
                    if (element.src) {
                        newScript.async = false;
                        newScript.defer = false;
                    }
                    
                    currentBody.appendChild(newScript);
                } else {
                    // 深度克隆其他元素
                    const clonedElement = element.cloneNode(true);
                    currentBody.appendChild(clonedElement);
                }
            });
            
            // 等待React应用初始化完成
            let reactCheckCount = 0;
            const maxReactChecks = 50; // 最多检查5秒
            
            const checkReactApp = () => {
                reactCheckCount++;
                const rootElement = document.getElementById('root');
                
                if (rootElement && rootElement.children.length > 0) {
                    console.log('React app loaded successfully');
                    // React应用已加载，恢复插件脚本
                    setTimeout(() => {
                        pluginScripts.forEach(script => {
                            if (!document.querySelector(`script[data-plugin="baidu"]`)) {
                                const restoredScript = document.createElement('script');
                                restoredScript.textContent = script.textContent;
                                restoredScript.setAttribute('data-plugin', 'baidu');
                                document.head.appendChild(restoredScript);
                            }
                        });
                    }, 100);
                } else if (reactCheckCount < maxReactChecks) {
                    // 继续等待React应用加载
                    setTimeout(checkReactApp, 100);
                } else {
                    console.warn('React app failed to load within timeout');
                    // 即使React应用没有加载，也恢复插件脚本
                    pluginScripts.forEach(script => {
                        if (!document.querySelector(`script[data-plugin="baidu"]`)) {
                            const restoredScript = document.createElement('script');
                            restoredScript.textContent = script.textContent;
                            restoredScript.setAttribute('data-plugin', 'baidu');
                            document.head.appendChild(restoredScript);
                        }
                    });
                }
            };
            
            // 开始检查React应用
            setTimeout(checkReactApp, 500);
            
            console.log('Document replacement completed successfully');
            
        } catch (error) {
            console.error('Error in replaceEntireDocument:', error);
            
            // 备用方案：使用更简单的方法
            try {
                const parser = new DOMParser();
                const newDoc = parser.parseFromString(htmlString, 'text/html');
                
                if (newDoc && newDoc.body) {
                    // 直接替换整个文档内容
                    document.open();
                    document.write(htmlString);
                    document.close();
                    
                    console.log('Fallback: document.write method used');
                } else {
                    throw new Error('Fallback method also failed');
                }
            } catch (fallbackError) {
                console.error('All methods failed:', fallbackError);
                
                // 最后的备用方案：仅替换body内容
                 try {
                     const parser = new DOMParser();
                     const newDoc = parser.parseFromString(htmlString, 'text/html');
                     
                     if (newDoc && newDoc.body) {
                         // 简单替换body内容
                         document.body.innerHTML = newDoc.body.innerHTML;
                         
                         // 复制body属性
                         Array.from(newDoc.body.attributes).forEach(attr => {
                             document.body.setAttribute(attr.name, attr.value);
                         });
                         
                         console.log('Final fallback: body content replaced');
                     }
                 } catch (finalError) {
                     console.error('Final fallback also failed:', finalError);
                 }
             }
         }
     }

    // handleResponse 函数 (优化版)
    function handleResponse(response) {
        console.log('handleResponse called with:', response);

        if (response.status >= 200 && response.status < 300) {
            // 使用完整文档替换方法
            replaceEntireDocument(response.responseText);
            
            // 创建一个计时器变量，用于超时检测
            let timeoutTimer = null;
            let maxWaitTime = 15000; // 等待时间15秒
            let startTime = Date.now();
            let scriptLoadingComplete = false;
            let contentLoadingComplete = false;
            
            // 监听脚本加载完成事件
            function checkScriptsLoaded() {
                // 检查所有脚本是否已加载完成
                const scripts = document.querySelectorAll('script[src*="baidu.com"]');
                let loadedCount = 0;
                
                if (scripts.length === 0) {
                    // 如果没有找到百度域名的脚本，可能是DOM还没完全加载
                    // 等待一段时间后再次检查
                    setTimeout(checkScriptsLoaded, 500);
                    return false;
                }
                
                scripts.forEach(script => {
                    if (!script.hasAttribute('data-loaded')) {
                        // 为每个脚本添加加载事件
                        script.addEventListener('load', function() {
                            this.setAttribute('data-loaded', 'true');
                            console.log('Script loaded:', this.src);
                            // 脚本加载后重新检查
                            checkScriptsLoaded();
                        });
                        
                        script.addEventListener('error', function() {
                            this.setAttribute('data-loaded', 'error');
                            console.warn('Script failed to load:', this.src);
                            // 即使脚本加载失败也继续检查
                            checkScriptsLoaded();
                        });
                    } else if (script.getAttribute('data-loaded') === 'true' || 
                               script.getAttribute('data-loaded') === 'error') {
                        loadedCount++;
                    }
                });
                
                // 如果所有脚本都已加载（成功或失败），则认为加载完成
                if (loadedCount === scripts.length) {
                    scriptLoadingComplete = true;
                    console.log('All scripts loaded, count:', loadedCount);
                    return true;
                }
                
                return false;
            }
            
            // 检查内容是否已加载
            function checkContentLoaded() {
                // 1. 尝试找到 Shadow DOM 的宿主元素
                const shadowHost = document.querySelector('#__hcfy__');
                
                // 2. 如果找不到Shadow DOM宿主，尝试直接从document中查找元素
                if (!shadowHost) {
                    const reportWrapper = document.querySelector('.report-wrapper');
                    const rootDiv = document.querySelector('#root');
                    
                    // 检查报告包装器是否有内容
                    if (reportWrapper && reportWrapper.textContent.trim() !== "") {
                        contentLoadingComplete = true;
                        return true;
                    }
                    
                    // 检查根div是否有内容（针对百度特定结构）
                    if (rootDiv && rootDiv.children.length > 0) {
                        contentLoadingComplete = true;
                        return true;
                    }
                } else {
                    // 3. 如果找到Shadow DOM宿主，尝试穿透Shadow DOM
                    if (shadowHost.shadowRoot) {
                        const targetElement = shadowHost.shadowRoot.querySelector('.report-wrapper');
                        
                        if (targetElement && targetElement.textContent.trim() !== "") {
                            contentLoadingComplete = true;
                            return true;
                        }
                    }
                }
                
                return false;
            }
            
            // 使用 MutationObserver 等待内容加载完成
            const observer = new MutationObserver((mutationsList, observer) => {
                // 检查是否超时
                if (Date.now() - startTime > maxWaitTime) {
                    observer.disconnect();
                    if (timeoutTimer) clearTimeout(timeoutTimer);
                    console.log('Observation timed out after', maxWaitTime, 'ms');
                    
                    // 即使超时，也尝试提取可能的数据
                    try {
                        const result = extractDataFromRegularDOM(document, response.phoneNumber);
                        if (result && (result.sourceLabel || result.province)) {
                            // 如果能提取到一些数据，就发送结果
                            processAndSendResult(result, response.externalRequestId);
                            return;
                        }
                    } catch (e) {
                        console.error('Error extracting data on timeout:', e);
                    }
                    
                    sendResultToFlutter('pluginError', { error: 'Timeout waiting for content to load' }, response.externalRequestId);
                    return;
                }
                
                // 检查脚本是否加载完成
                if (!scriptLoadingComplete) {
                    scriptLoadingComplete = checkScriptsLoaded();
                }
                
                // 检查内容是否已加载
                if (!contentLoadingComplete) {
                    contentLoadingComplete = checkContentLoaded();
                }
                
                // 如果脚本和内容都已加载完成，则提取数据
                if (scriptLoadingComplete && contentLoadingComplete) {
                    observer.disconnect();
                    if (timeoutTimer) clearTimeout(timeoutTimer);
                    
                    // 1. 尝试找到 Shadow DOM 的宿主元素
                    const shadowHost = document.querySelector('#__hcfy__');
                    
                    // 2. 如果找不到Shadow DOM宿主，尝试直接从document中查找元素
                    if (!shadowHost) {
                        // 从普通DOM中解析数据
                        let result = extractDataFromRegularDOM(document, response.phoneNumber);
                        processAndSendResult(result, response.externalRequestId);
                    } else {
                        // 3. 如果找到Shadow DOM宿主，尝试穿透Shadow DOM
                    if (shadowHost.shadowRoot) {
                        const targetElement = shadowHost.shadowRoot.querySelector('.report-wrapper');
                        
                        if (targetElement && targetElement.textContent.trim() !== "") {
                            // 从Shadow DOM中解析数据
                            let result = parseResponse(shadowHost.shadowRoot, response.phoneNumber);
                            processAndSendResult(result, response.externalRequestId);
                        } else {
                            // 如果在Shadow DOM中找不到目标元素，尝试从普通DOM中提取
                            let result = extractDataFromRegularDOM(document, response.phoneNumber);
                            processAndSendResult(result, response.externalRequestId);
                        }
                    } else {
                        // 如果Shadow DOM不存在，尝试从普通DOM中提取
                        let result = extractDataFromRegularDOM(document, response.phoneNumber);
                        processAndSendResult(result, response.externalRequestId);
                    }
                }
                }
            });

            // 同时观察head和body的变化
            const config = { childList: true, subtree: true, characterData: true, attributes: true };
            observer.observe(document.head, config);
            observer.observe(document.body, config);
            
            // 立即检查脚本和内容加载状态
            setTimeout(() => {
                checkScriptsLoaded();
                checkContentLoaded();
            }, 100);
            
            // 设置超时处理
            timeoutTimer = setTimeout(() => {
                observer.disconnect();
                console.log('Timeout reached after', maxWaitTime, 'ms');
                
                // 即使超时，也尝试提取可能的数据
                try {
                    const result = extractDataFromRegularDOM(document, response.phoneNumber);
                    if (result && (result.sourceLabel || result.province || result.carrier || result.count > 0)) {
                        // 如果能提取到一些数据，就发送结果
                        processAndSendResult(result, response.externalRequestId);
                        return;
                    }
                } catch (e) {
                    console.error('Error extracting data on timeout:', e);
                }
                
                sendResultToFlutter('pluginError', { error: 'Timeout waiting for content to load' }, response.externalRequestId);
            }, maxWaitTime);

        } else {
            sendResultToFlutter('pluginError', { error: response.statusText }, response.externalRequestId);
        }
    }

    // 处理结果并发送到Flutter
    function processAndSendResult(result, externalRequestId) {
        // 确保结果对象包含所有必要字段
        const finalResult = {
            phoneNumber: result.phoneNumber || '',
            sourceLabel: result.sourceLabel || '',
            count: result.count || 0,
            province: result.province || '',
            city: result.city || '',
            carrier: result.carrier || '',
            name: result.name || '',
            rate: result.rate || 0,
            predefinedLabel: '',
            pluginId: pluginId
        };
        
        // 尝试根据sourceLabel映射到预定义标签
        if (finalResult.sourceLabel && manualMapping[finalResult.sourceLabel]) {
            finalResult.predefinedLabel = manualMapping[finalResult.sourceLabel];
        }
        
        console.log('Sending result to Flutter:', finalResult);
        sendResultToFlutter('pluginResult', finalResult, externalRequestId);
    }

    // Parse the response from the server
    function parseResponse(doc, phoneRequestId, rawResponse) {
        console.log('Parsing response for phone request ID:', phoneRequestId);
        
        // 尝试从DOM中提取数据
        return extractDataFromRegularDOM(doc, phoneRequestId, rawResponse);
    }
    
    // Extract data from regular DOM
    function extractDataFromRegularDOM(doc, phoneRequestId, rawResponse) {
        console.log('Extracting data from DOM or raw response');
        
        // 初始化结果对象 - 使用与processAndSendResult兼容的字段名
        const result = {
            phoneNumber: phoneRequestId, // 使用phoneRequestId作为电话号码
            sourceLabel: '', // 对应标签信息
            count: 0,       // 对应标记数量
            province: '',
            city: '',
            carrier: '',    // 对应运营商
            name: '',       // 可能的名称
            rate: 0,        // 评分
            predefinedLabel: '',
            pluginId: pluginId
        };
        
        try {
            // 首先尝试从电话号码元素获取实际的电话号码
            const phoneElement = doc.querySelector('.phone-num');
            if (phoneElement) {
                const phoneText = phoneElement.textContent.trim();
                if (phoneText) {
                    result.phoneNumber = phoneText.replace(/[^0-9]/g, '');
                    console.log('Found phone number in DOM:', result.phoneNumber);
                }
            }
            
            // 尝试多种选择器来提取标签信息
            // 1. 首先尝试.report-name选择器
            const reportNameElement = doc.querySelector('.report-name');
            if (reportNameElement && reportNameElement.textContent.trim()) {
                result.sourceLabel = reportNameElement.textContent.trim();
            }
            
            // 2. 如果没有找到.report-name，尝试.tag-item选择器
            if (!result.sourceLabel) {
                const tagElements = doc.querySelectorAll('.tag-item');
                if (tagElements && tagElements.length > 0) {
                    // 使用第一个标签作为主要标签
                    result.sourceLabel = tagElements[0].textContent.trim();
                    result.count = tagElements.length;
                    console.log('Found tags, using first as sourceLabel:', result.sourceLabel);
                }
            }
            
            // 3. 尝试从.report-type获取信息
            const reportTypeElement = doc.querySelector('.report-type');
            if (reportTypeElement) {
                const reportTypeText = reportTypeElement.textContent.trim();
                if (reportTypeText === '用户标记' && !result.count) {
                    result.count = 1;
                }
            }
            
            // 4. 尝试从.mark-count获取标记数量
            if (!result.count) {
                const markCountElement = doc.querySelector('.mark-count');
                if (markCountElement) {
                    const countText = markCountElement.textContent.trim();
                    const countMatch = countText.match(/\d+/);
                    if (countMatch) {
                        result.count = parseInt(countMatch[0], 10) || 1;
                    } else {
                        result.count = 1; // 至少有一个标记
                    }
                    console.log('Found mark count:', result.count);
                }
            }
            
            // 提取省份和城市
            const locationElement = doc.querySelector('.location');
            if (locationElement) {
                const locationText = locationElement.textContent.trim();
                const locationParts = locationText.split(/\s+/);
                
                if (locationParts.length >= 1) {
                    result.province = locationParts[0];
                }
                
                if (locationParts.length >= 2) {
                    result.city = locationParts[1];
                }
                console.log('Found location:', result.province, result.city);
            }
            
            // 提取运营商信息
            const operatorElement = doc.querySelector('.operator');
            if (operatorElement) {
                const operatorText = operatorElement.textContent.trim();
                result.carrier = operatorText.split(/\s+/)[0] || '';
                console.log('Found carrier:', result.carrier);
            }
            
            // 尝试提取可能的名称（如果有）
            const nameElement = doc.querySelector('.phone-name') || doc.querySelector('.name');
            if (nameElement) {
                result.name = nameElement.textContent.trim();
                console.log('Found name:', result.name);
            }
            
                      
            // 尝试从tel-info元素获取更多信息
            const telInfoElement = doc.querySelector('.tel-info');
            if (telInfoElement) {
                console.log('Found tel-info element');
                
                // 如果之前没有找到标签，尝试从tel-info中找
                if (!result.sourceLabel) {
                    const telTags = telInfoElement.querySelectorAll('.tag');
                    if (telTags && telTags.length > 0) {
                        result.sourceLabel = telTags[0].textContent.trim();
                        result.count = telTags.length;
                        console.log('Found sourceLabel from tel-info:', result.sourceLabel);
                    }
                }
                
                // 尝试从tel-info中获取位置信息
                if (!result.province && !result.city) {
                    const telLocation = telInfoElement.querySelector('.location');
                    if (telLocation) {
                        const locationText = telLocation.textContent.trim();
                        const locationParts = locationText.split(/\s+/);
                        
                        if (locationParts.length >= 1) {
                            result.province = locationParts[0];
                        }
                        
                        if (locationParts.length >= 2) {
                            result.city = locationParts[1];
                        }
                        console.log('Found location from tel-info:', result.province, result.city);
                    }
                }
            }
            
            // 如果从DOM中无法提取足够的信息，尝试从原始响应中提取
            if ((!result.province || !result.city || !result.carrier) && rawResponse) {
                console.log('Attempting to extract data from raw response');
                
                // 尝试从原始响应中提取省份和城市
                const provinceMatch = rawResponse.match(/"province"\s*:\s*"([^"]+)"/i);
                if (provinceMatch && provinceMatch[1] && !result.province) {
                    result.province = provinceMatch[1];
                    console.log('Found province from raw response:', result.province);
                }
                
                const cityMatch = rawResponse.match(/"city"\s*:\s*"([^"]+)"/i);
                if (cityMatch && cityMatch[1] && !result.city) {
                    result.city = cityMatch[1];
                    console.log('Found city from raw response:', result.city);
                }
                
                // 尝试从原始响应中提取运营商
                const operatorMatch = rawResponse.match(/"operator"\s*:\s*"([^"]+)"/i);
                if (operatorMatch && operatorMatch[1] && !result.carrier) {
                    result.carrier = operatorMatch[1];
                    console.log('Found carrier from raw response:', result.carrier);
                }
            }
            
            console.log('Final extracted data:', result);
            return result;
            
        } catch (error) {
            console.error('Error extracting data from DOM:', error);
            return result;
        }
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
