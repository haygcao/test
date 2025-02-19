// Plugin ID, each plugin must be unique
const pluginId = 'tellowsPlugin';

// Plugin information
const pluginInfo = {
    // Plugin information
    info: {
        id: 'tellowsPlugin', // Plugin ID, must be unique
        name: 'Tellows', // Plugin name
        version: '1.2.0', // Plugin version
        description: 'This plugin retrieves information about phone numbers from tellows.com.', // Plugin description
        author: 'Your Name', // Plugin author
    },
};

// Predefined label list (you can adjust this list based on your needs)
const predefinedLabels = [
    { 'label': 'Fraud Scam Likely' },
    { 'label': 'Spam Likely' },
    { 'label': 'Telemarketing' },
    { 'label': 'Robocall' },
    { 'label': 'Delivery' },
    { 'label': 'Takeaway' },
    { 'label': 'Ridesharing' },
    { 'label': 'Insurance' },
    { 'label': 'Loan' },
    { 'label': 'Customer Service' },
    { 'label': 'Unknown' },
    { 'label': 'Financial' },
    { 'label': 'Bank' },
    { 'label': 'Education' },
    { 'label': 'Medical' },
    { 'label': 'Charity' },
    { 'label': 'Other' },
    { 'label': 'Debt Collection' },
    { 'label': 'Survey' },
    { 'label': 'Political' },
    { 'label': 'Ecommerce' },
    { 'label': 'Risk' },
    { 'label': 'Agent' },
    { 'label': 'Recruiter' },
    { 'label': 'Headhunter' },
    { 'label': 'Silent Call(Voice Clone?)' },

];

// Manual mapping table to map source labels to predefined labels (updated based on shouldianswer.com labels)
const manualMapping = {
    'Unknown': 'Unknown',
    'Trustworthy number': 'Other', //  Could be mapped to something more specific if you have a "safe" category.
    'Sweepstakes, lottery': 'Spam Likely', //  Or 'Fraud Scam Likely', depending on context
    'Debt collection company': 'Debt Collection',
    'Aggressive advertising': 'Telemarketing', // Or 'Spam Likely'
    'Survey': 'Survey',
    'Harassment calls': 'Spam Likely',  // Or 'Fraud Scam Likely', if threats are involved
    'Cost trap': 'Fraud Scam Likely',
    'Telemarketer': 'Telemarketing',
    'Ping Call': 'Spam Likely', // Often associated with scams
    'SMS spam': 'Spam Likely',
    'Spam Call': 'Spam Likely', // Added, map label extracted "spam call" to predefined "Spam Likely"
};



function extractDataFromDOM(doc, phoneNumber) {
   // ... (保持不变) ...
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
        console.log('Document Object:', doc);

        const bodyElement = doc.body;
        console.log('Body Element:', bodyElement);
        if (!bodyElement) {
            console.error('Error: Could not find body element.');
            return jsonObject;
        }

        // --- Helper Function to find element by text ---
        function findElementByText(selector, text) {
            const elements = doc.querySelectorAll(selector);
            for (const element of elements) {
                if (element.textContent.includes(text)) {
                    return element;
                }
            }
            return null;
        }

        // 1. Extract Label (Priority 1: Types of call)
        const typesOfCallElement = findElementByText('b', "Types of call:"); // Find <b> containing the text
        if (typesOfCallElement) {
            const nextSibling = typesOfCallElement.nextSibling;
            if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE) {
                let labelText = nextSibling.textContent.trim();
                if (labelText) {
                    jsonObject.sourceLabel = labelText;
                }
            }
        }

        // 2. Extract Label (Priority 2: Score Image) - Only if sourceLabel is empty
        if (!jsonObject.sourceLabel) {
            const scoreImage = doc.querySelector('a[href*="tellows_score"] img.scoreimage');
            if (scoreImage) {
                const altText = scoreImage.alt;
                const scoreMatch = altText.match(/Score\s([789])/); //checks for 7, 8, or 9
                if (scoreMatch) {
                    jsonObject.sourceLabel = "Spam Call";
                }
            }
        }

        // 3. Extract Name (Caller ID) - ROBUST METHOD
        // 3. Extract Name (Caller ID) - Corrected: Directly select the span.callerId
        const callerIdElement = doc.querySelector('span.callerId');
        if (callerIdElement) {
            jsonObject.name = callerIdElement.textContent.trim();
        }


        // 4. Extract Rate and Count (using Ratings)
        // const ratingsElement = doc.querySelector('a[href="#complaint_list"] strong span'); // Original selector
        const ratingsElement = findElementByText('strong', "Ratings:"); // More robust way to locate

        if (ratingsElement) {
            const spanElement = ratingsElement.querySelector('span');
            if (spanElement) {
                const rateValue = parseInt(spanElement.textContent.trim(), 10) || 0;
                jsonObject.rate = rateValue;
                jsonObject.count = rateValue;
            }
        }
        // 5. Extract City and Province - CORRECTED LOGIC
        const cityElement = findElementByText('strong', "City:");
        if (cityElement) {
            let nextSibling = cityElement.nextSibling;
            while (nextSibling) {
                if (nextSibling.nodeType === Node.TEXT_NODE) {
                    let cityText = nextSibling.textContent.trim();

                    // Split by " - " to get "City" and "Country" parts
                    const parts = cityText.split('-');
                    if (parts.length > 0) {
                        jsonObject.city = parts[0].trim(); // The FIRST part is the city

                        // If there's a second part (countries), handle it
                        if (parts.length > 1) {
                            const countries = parts[1].trim().split(',').map(c => c.trim());
                            jsonObject.province = countries.join(", "); // Join with ", " for multiple countries
                        }
                    }
                    break; // Exit the loop once we've found the city text.
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

// Function to generate output information
async function generateOutput(phoneNumber, nationalNumber, e164Number, externalRequestId) {
     console.log('generateOutput called with:', phoneNumber, nationalNumber, e164Number, externalRequestId);
    // 构造查询 URL
    const queryUrl = `https://www.tellows.com/num/${phoneNumber}`;

    // 通过 FlutterChannel 将 URL 发送给 Dart
     if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
        window.flutter_inappwebview.callHandler('FlutterChannel', JSON.stringify({
            url: queryUrl,
            requestId: externalRequestId, // 传递 requestId
            pluginId: pluginId // 传递插件 ID
        }));
    } else {
        console.error('FlutterChannel (flutter_inappwebview) is not defined');
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

        window.flutter_inappwebview.callHandler('TestPageChannel', JSON.stringify({
            type: 'pluginReady',
            pluginId: pluginId,
        }));
        console.log('Notified Flutter that plugin is ready');


    } else {
        console.error('TestPageChannel (flutter_inappwebview) is not defined');
    }
}

// Initialize plugin
initializePlugin();
