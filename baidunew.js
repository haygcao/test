(function () {
    // 防止插件被重复初始化
    if (window.plugin && window.plugin.baiduHaomaPlugin) {
        console.log('Baidu Haoma Plugin has already been initialized.');
        return;
    }

    const PLUGIN_ID = 'baiduHaomaPlugin';

    const pluginInfo = {
        id: PLUGIN_ID,
        name: 'Baidu Haoma Searcher & Scraper',
        version: '3.0.0', // 版本升级，代表结构性重构
        description: 'Searches haoma.baidu.com and scrapes the resulting page for phone number details.',
        author: 'AI Assistant',
    };

    // 中文标签到英文标准标签的映射
    const manualMapping = {
        '中介': 'Agent', '房产中介': 'Agent',
        '违规催收': 'Debt Collection',
        '快递物流': 'Delivery', '快递': 'Delivery',

        '教育培训': 'Education',
        '金融': 'Financial', '股票证券': 'Financial', '保险理财': 'Financial',
        '涉诈电话': 'Fraud Scam Likely', '诈骗': 'Fraud Scam Likely',
        '招聘': 'Recruiter',
        '猎头': 'Headhunter', '猎头招聘': 'Headhunter', '招聘猎头': 'Headhunter',
        '保险': 'Insurance', '保险推销': 'Insurance',
        '贷款理财': 'Loan',
        '医疗卫生': 'Medical',
        '其他': 'Other',
        '送餐外卖': 'Takeaway', '美团': 'Takeaway', '饿了么': 'Takeaway', '外卖': 'Takeaway',
        '滴滴/优步': 'Ridesharing', '出租车': 'Ridesharing', '网约车': 'Ridesharing',
        '违法': 'Risk', '淫秽色情': 'Risk', '反动谣言': 'Risk', '发票办证': 'Risk',
        '客服热线': 'Customer Service',
        '非应邀商业电话': 'Spam Likely', '广告': 'Spam Likely', '骚扰': 'Spam Likely', '骚扰电话': 'Spam Likely',
        '广告营销': 'Telemarketing', '广告推销': 'Telemarketing', '旅游推广': 'Telemarketing', '食药推销': 'Telemarketing', '推销': 'Telemarketing',
    };

    class BaiduHaomaPlugin {
        constructor() {
            this.info = pluginInfo;
        }

        // 1. 初始化：将插件注册到 window 对象
        initialize() {
            if (!window.plugin) {
                window.plugin = {};
            }
            window.plugin[this.info.id] = this;
            console.log(`Plugin ${this.info.id} (v${this.info.version}) initialized successfully.`);
            
            // 通知Flutter插件已加载 (如果需要)
            this.sendToFlutter('PluginLoaderChannel', {
                type: 'pluginLoaded',
                pluginId: this.info.id,
            });
        }

        // 2. 入口函数：由Flutter调用，发起查询
        generateOutput(phoneNumber, nationalNumber, e164Number, externalRequestId) {
            console.log(`generateOutput called for request ID: ${externalRequestId}`);
            const numberToQuery = phoneNumber || nationalNumber || e164Number;

            if (!numberToQuery) {
                this.sendError('No valid phone number provided.', externalRequestId);
                return;
            }

            this.queryPhoneInfo(numberToQuery, externalRequestId);
        }

        // 3. 执行网络请求
        async queryPhoneInfo(phoneNumber, externalRequestId) {
            const url = `https://haoma.baidu.com/phoneSearch?word=${encodeURIComponent(phoneNumber)}`;
            console.log(`Querying URL: ${url}`);

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const htmlText = await response.text();
                this.handleResponse(htmlText, phoneNumber, externalRequestId);

            } catch (error) {
                console.error('Fetch failed:', error);
                this.sendError(`Network request failed: ${error.message}`, externalRequestId);
            }
        }

        // 4. 处理返回的HTML
        handleResponse(htmlText, phoneNumber, externalRequestId) {
            try {
                // 使用DOMParser将HTML字符串转换为可操作的文档对象
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');

                const extractedData = this.extractDataFromDoc(doc, phoneNumber);
                
                if (!extractedData) {
                    // 如果extractData返回null，意味着没有找到关键信息
                    this.sendError('Could not find phone number information on the page. It might be a number without any reports.', externalRequestId);
                    return;
                }

                this.sendSuccess(extractedData, externalRequestId);

            } catch (error) {
                console.error('Failed to parse or handle response:', error);
                this.sendError(`Failed to process response: ${error.message}`, externalRequestId);
            }
        }
        
        // 5. 从文档中提取数据 (合并了两个脚本的逻辑)
        extractDataFromDoc(doc, originalPhoneNumber) {
            const reportWrapper = doc.querySelector('.report-wrapper');
            if (!reportWrapper) {
                console.log('No .report-wrapper element found. The number is likely not reported.');
                // 即使没有报告，也尝试获取基本信息
                const basicInfoCard = doc.querySelector('.card.tel-info');
                if (basicInfoCard) {
                     const data = {
                        phoneNumber: originalPhoneNumber,
                        location: basicInfoCard.querySelector('.location-operator')?.innerText.trim() || 'N/A',
                        tags: ['Unreported'],
                        predefinedTags: ['Unknown'],
                        reportCount: '0 reports'
                    };
                    return data;
                }
                return null; // 确认无法解析
            }

            const data = {};

            const titleElement = reportWrapper.querySelector('.res-title');
            data.phoneNumber = titleElement ? titleElement.innerText.trim() : originalPhoneNumber;

            const subTitleElement = reportWrapper.querySelector('.res-sub-title');
            data.location = subTitleElement ? subTitleElement.innerText.trim() : 'N/A';

            const tags = [];
            const tagElements = reportWrapper.querySelectorAll('.res-tag');
            tagElements.forEach(tagEl => {
                const tagText = tagEl.innerText.trim();
                if (tagText) tags.push(tagText);
            });
            data.tags = tags;

            // **关键步骤：将中文标签映射为英文标签**
            const mappedTags = tags
                .map(tag => manualMapping[tag])
                .filter(Boolean); // 过滤掉没有映射的(null/undefined)
            
            // 如果有原始标签但一个都没映射成功，则标记为'Other'
            if (tags.length > 0 && mappedTags.length === 0) {
                mappedTags.push('Other');
            }
            // 去重后赋值
            data.predefinedTags = [...new Set(mappedTags)];
            
            const reportCountElement = reportWrapper.querySelector('.report-text');
            data.reportCount = reportCountElement ? reportCountElement.innerText.trim() : 'N/A';

            return data;
        }

        // --- 通信辅助函数 ---
        sendToFlutter(channel, data) {
            if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                window.flutter_inappwebview.callHandler(channel, data).then(result => {
                    console.log(`Message sent to Flutter on channel ${channel} and received result:`, result);
                }).catch(error => {
                    console.error(`Error sending message to Flutter on channel ${channel}:`, error);
                });
            } else {
                console.error(`Flutter communication bridge 'flutter_inappwebview' not found. Cannot send data.`);
            }
        }
        
        sendSuccess(data, externalRequestId) {
            console.log('Sending success result to Flutter:', data);
            this.sendToFlutter('pluginResult', {
                type: 'success',
                pluginId: this.info.id,
                externalRequestId: externalRequestId,
                data: data
            });
        }

        sendError(message, externalRequestId) {
            console.error(`Plugin Error for request ${externalRequestId}: ${message}`);
            this.sendToFlutter('pluginError', {
                type: 'error',
                pluginId: this.info.id,
                externalRequestId: externalRequestId,
                data: { error: message }
            });
        }
    }

    // --- 插件实例化和注册 ---
    const pluginInstance = new BaiduHaomaPlugin();
    pluginInstance.initialize();

})();
