(function () {
    // Prevent the script from running multiple times
    if (window.plugin && window.plugin.baiduHaomaPlugin) {
        console.log('Baidu Haoma Scraper Plugin already initialized.');
        return;
    }

    const PLUGIN_ID = 'baiduHaomaPlugin';

    const pluginInfo = {
        info: {
            id: PLUGIN_ID,
            name: 'Baidu Haoma Scraper',
            version: '2.0.1', // Incremented version for the fix
            description: 'Scrapes phone number data from a fully loaded haoma.baidu.com page.',
            author: 'AI Assistant',
        },
    };

    // This mapping translates the Chinese tags found on the page
    // into standardized English labels.
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

    /**
     * Sends data back to the Flutter application via the inappwebview bridge.
     * @param {string} channel - The channel name to send the data on.
     * @param {object} data - The data payload to send.
     */
    function sendToFlutter(channel, data) {
        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler(channel, data);
            console.log(`Sent to Flutter on channel ${channel}:`, data);
        } else {
            console.error(`Flutter communication bridge 'flutter_inappwebview' not found. Cannot send data on channel ${channel}.`);
        }
    }

    /**
     * A helper function to send a successful result payload.
     * @param {object} data - The scraped data.
     */
    function sendSuccess(data) {
        sendToFlutter('PluginResultChannel', {
            type: 'success',
            pluginId: PLUGIN_ID,
            data: data
        });
    }

    /**
     * A helper function to send an error message.
     * @param {string} message - The error message.
     */
    function sendError(message) {
        console.error(`Plugin Error: ${message}`);
        sendToFlutter('PluginResultChannel', {
            type: 'error',
            pluginId: PLUGIN_ID,
            data: { error: message }
        });
    }
    
    /**
     * Finds the relevant elements in the DOM and extracts the phone number information.
     */
    function extractDataFromDOM() {
        console.log('Attempting to extract data from the DOM...');

        const reportWrapper = document.querySelector('.report-wrapper');
        if (!reportWrapper) {
            sendError('Extraction failed: Could not find the main content wrapper (.report-wrapper).');
            return;
        }

        const data = {};

        // Extract phone number
        const titleElement = reportWrapper.querySelector('.res-title');
        data.phoneNumber = titleElement ? titleElement.innerText.trim() : 'N/A';

        // Extract location (Province, City) and Carrier
        const subTitleElement = reportWrapper.querySelector('.res-sub-title');
        data.location = subTitleElement ? subTitleElement.innerText.trim() : 'N/A';

        // Extract raw Chinese tags
        const tags = [];
        const tagElements = reportWrapper.querySelectorAll('.res-tag');
        tagElements.forEach(tagEl => {
            const tagText = tagEl.innerText.trim();
            if (tagText) {
                tags.push(tagText);
            }
        });
        data.tags = tags;

        // **IMPROVEMENT**: Map raw tags to predefined English labels
        const mappedTags = tags
            .map(tag => manualMapping[tag]) // Map Chinese tag to English
            .filter(tag => tag);            // Remove any tags that didn't have a mapping

        // Add 'Unknown' if no tags could be mapped but some existed originally
        if (tags.length > 0 && mappedTags.length === 0) {
            mappedTags.push('Unknown');
        }
        
        // Get unique values and assign to a new property
        data.predefinedTags = [...new Set(mappedTags)];

        // Extract report count
        const reportCountElement = reportWrapper.querySelector('.report-text');
        data.reportCount = reportCountElement ? reportCountElement.innerText.trim() : 'N/A';

        console.log('Extraction successful:', data);
        sendSuccess(data);
    }

    /**
     * This is the main execution function for the plugin.
     * It waits for the React application to populate the #root element
     * before attempting to scrape the data, with a timeout.
     */
    function startScraping() {
        console.log('Starting scraper... Waiting for page content to render.');

        const MAX_WAIT_MS = 10000; // 10 seconds timeout
        const CHECK_INTERVAL_MS = 500; // Check every 0.5 seconds
        let timeElapsed = 0;

        // Use MutationObserver to efficiently wait for the target element to be added to the DOM.
        // This is much better than polling with setInterval alone for SPAs.
        const observer = new MutationObserver((mutations, obs) => {
            const reportWrapper = document.querySelector('.report-wrapper');
            // Check if the target element exists and has content
            if (reportWrapper && reportWrapper.querySelector('.res-title')) {
                console.log('Content wrapper found. Stopping observer and extracting data.');
                obs.disconnect(); // Stop observing to prevent multiple triggers
                // Use a small timeout to ensure all content is fully settled
                setTimeout(extractDataFromDOM, 300);
            }
        });

        // Fallback timer in case the MutationObserver doesn't find the element.
        const timeoutTimer = setTimeout(() => {
            observer.disconnect(); // Stop the observer on timeout
            // Do a final check before giving up
            const reportWrapper = document.querySelector('.report-wrapper');
            if (reportWrapper && reportWrapper.querySelector('.res-title')) {
                console.log('Content found on final check before timeout.');
                extractDataFromDOM();
            } else {
                sendError('Timeout: Page content did not render within the time limit.');
            }
        }, MAX_WAIT_MS);
        
        // Start observing the body for changes.
        // `childList: true` watches for added/removed nodes.
        // `subtree: true` watches descendants as well.
        observer.observe(document.body, { childList: true, subtree: true });

        // Initial check in case the content is already there
        const initialReportWrapper = document.querySelector('.report-wrapper');
        if (initialReportWrapper && initialReportWrapper.querySelector('.res-title')) {
             console.log('Content already present on initial check.');
             observer.disconnect();
             clearTimeout(timeoutTimer);
             setTimeout(extractDataFromDOM, 100);
        }
    }

    // The global plugin object exposed to the Flutter app
    const baiduHaomaPlugin = {
        // The `execute` function is the entry point called by Flutter.
        execute: function(request) {
            console.log('Plugin execute called with request:', request);
            // The presence of this plugin assumes the page is already loaded.
            // We just need to start the scraping process.
            startScraping();
        },
        info: pluginInfo.info
    };

    // Assign the plugin to the window object for global access
    window.baiduHaomaPlugin = baiduHaomaPlugin;

    console.log(`Baidu Haoma Scraper Plugin (v${pluginInfo.info.version}) initialized and ready.`);

    // Notify Flutter that the plugin has been loaded successfully.
    sendToFlutter('PluginLoaderChannel', {
        type: 'pluginLoaded',
        pluginId: PLUGIN_ID,
    });

})();
