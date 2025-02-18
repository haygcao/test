// Plugin ID, each plugin must be unique
const pluginId = 'tellowsPlugin';

// Plugin information (unchanged)
const pluginInfo = {
    info: {
        id: 'tellowsPlugin', // Plugin ID, must be unique
        name: 'Tellows', // Plugin name
        version: '1.3.0', // Plugin version
        description: 'This plugin retrieves information about phone numbers from tellows.com.', // Plugin description
        author: 'Your Name', // Plugin author
    },
};

// Predefined label list (unchanged)
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

// Manual mapping table (unchanged)
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


// Function to query phone number information (no longer needs requestId)
function queryPhoneInfo(phoneNumber) {
    console.log('queryPhoneInfo called with phoneNumber:', phoneNumber);
    // NO LONGER NEEDED HERE - XHR is handled directly in the overridden XMLHttpRequest
}

function extractDataFromDOM(doc, phoneNumber) {
    const jsonObject = {
        count: 0,
        sourceLabel: "",
        province: "",
        city: "",
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
async function generateOutput(phoneNumber, nationalNumber, e164Number) {
    console.log('generateOutput called with:', phoneNumber, nationalNumber, e164Number);

    // Function to handle a single number query (now uses direct XHR, no promises)
    function handleNumberQuery(number) {
        return new Promise((resolve, reject) => { // Return a promise
            // Create a new XHR object *within* the function.
            const xhr = new window.XMLHttpRequest();
            lastXhr = xhr; // Store for postMessage handling

            xhr.open('GET', `https://www.tellows.com/num/${number}`);
            xhr.setRequestHeader("User-Agent", 'Mozilla/5.0 (Linux; arm_64; Android 14; SM-S711B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.199 YaBrowser/24.12.4.199.00 SA/3 Mobile Safari/537.36');


            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(xhr.responseText, 'text/html');
                    const jsonObject = extractDataFromDOM(doc, number);
                    console.log('Extracted information:', jsonObject);
                    resolve(jsonObject); // Resolve the promise
                } else {
                    console.error(`HTTP error! status: ${xhr.status}`);
                    reject(new Error(`HTTP error! status: ${xhr.status}`)); // Reject the promise
                }
            };

            xhr.onerror = function () {
                console.error("Network error");
                reject(new Error("Network error")); // Reject the promise
            };

            xhr.send();
        }); // No longer storing promises
    }


    // Process each number sequentially, use whichever returns a valid result first
    try {
        let result;

        if (phoneNumber) {
            try {
                result = await handleNumberQuery(phoneNumber);
                console.log('Query result for phoneNumber:', result);
            } catch (error) {
                console.error('Error querying phoneNumber:', error);
            }
        }

        if (!result && nationalNumber) { // Only proceed if no result yet
            try {
                result = await handleNumberQuery(nationalNumber);
                console.log('Query result for nationalNumber:', result);
            } catch (error) {
                console.error('Error querying nationalNumber:', error);
            }
        }


        if (!result && e164Number) { // Only proceed if no result yet
            try {
                result = await handleNumberQuery(e164Number);
                console.log('Query result for e164Number:', result);
            } catch (error) {
                console.error('Error querying e164Number:', error);
            }
        }


        console.log('First successful query completed:', result);

        // Ensure result is not null
        if (!result) {
            // Send error message via callHandler -- CORRECTED
            window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify({
                type: 'pluginError',
                pluginId: pluginId,
                error: 'All attempts failed or timed out.',
            }));
            return { error: 'All attempts failed or timed out.' }; // Also return the error information
        }

        // Find a matching predefined label using the found sourceLabel
        let matchedLabel = predefinedLabels.find(label => label.label === result.sourceLabel)?.label;

        // If no direct match is found, try to find one in manualMapping
        if (!matchedLabel) {
            matchedLabel = manualMapping[result.sourceLabel];
        }

        // If no match is found in manualMapping, use 'Unknown'
        if (!matchedLabel) {
            matchedLabel = 'Unknown';
        }

        const finalResult = {
            phoneNumber: result.phoneNumber,
            sourceLabel: result.sourceLabel,
            count: result.count,
            province: result.province,
            city: result.city,
            carrier: result.carrier,
            name: result.name,
            predefinedLabel: matchedLabel, // Use the matched label
            source: pluginInfo.info.name,
        };

        // Send the result via callHandler -- CORRECTED
        window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify({
            type: 'pluginResult',
            pluginId: pluginId,
            data: finalResult,
        }));


        return finalResult;
    } catch (error) {
        console.error('Error in generateOutput:', error);
        // Send error message via callHandler -- CORRECTED
        window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify({
            type: 'pluginError',
            pluginId: pluginId,
            error: error.message || 'Unknown error occurred during phone number lookup.',
        }));
        return {
            error: error.message || 'Unknown error occurred during phone number lookup.',
        };
    }
}


let lastXhr; // Store the last XMLHttpRequest object.

// Override the XMLHttpRequest object.
window.XMLHttpRequest = class extends window.XMLHttpRequest {
    constructor() {
        super();
        this.requestId = Date.now().toString(); // Generate unique ID
        lastXhr = this; // Keep track of the last XHR
    }

    open(method, url) {
        this.method = method;
        this.url = url;
        console.log("XHR open:", method, url);  // Log
        super.open(method, url); // Call the original open method
    }

    send(body) {
        this.body = body; // Store body for POST
        console.log("XHR send:", body); // Log

        // Send request details to Flutter.  Use callHandler and JSON.stringify.
        window.flutter_inappwebview.callHandler('FlutterChannel', JSON.stringify({
            requestId: this.requestId,
            method: this.method,
            url: this.url,
            headers: this.getAllResponseHeaders(), // Might need custom header handling, see below
            body: body,
            pluginId: pluginId  //  VERY IMPORTANT for routing the response
        }));

        // DO NOT call super.send() here.  Flutter will handle the actual request.
    }
    // onreadystatechange, onload, onerror, etc., will be handled by Flutter
    // and dispatched via window.postMessage.
};

// Listen for the simulated XHR response from Flutter.
window.addEventListener('message', function (event) {
    if (event.data && event.data.type && event.data.type.startsWith('xhrResponse_')) {
        const pluginIdFromResponse = event.data.type.substring('xhrResponse_'.length); // Extract
        console.log("Received postMessage:", event.data);

        // Check if the response is for this plugin AND matches the last XHR request.
        if (pluginIdFromResponse === pluginId && lastXhr && event.data.detail.requestId == lastXhr.requestId) {
            const response = event.data.detail.response;

            // Populate the XHR object with the simulated response data.
            lastXhr.status = response.status;
            lastXhr.statusText = response.statusText;
            lastXhr.responseText = response.responseText;
            //   lastXhr.responseHeaders = response.headers; //  Might need custom handling

            // Call the appropriate event handlers (onload, onerror, onreadystatechange).
            if (lastXhr.onload && response.status >= 200 && response.status < 300) {
                lastXhr.onload();
            } else if (lastXhr.onerror) {
                lastXhr.onerror();
            }

            if (lastXhr.onreadystatechange) {
                lastXhr.readyState = 4; // Simulate DONE state
                lastXhr.onreadystatechange();
            }
        }
    }
});


// Initialize plugin (Corrected)
async function initializePlugin() {
    window.plugin = {};
    const thisPlugin = {
        id: pluginInfo.info.id,
        pluginId: pluginId,
        version: pluginInfo.info.version,
        queryPhoneInfo: queryPhoneInfo,
        generateOutput: generateOutput,
        test: function () {
            console.log('Plugin test function called');
            return 'Plugin is working';
        }
    };

    window.plugin[pluginId] = thisPlugin;
    console.log('Plugin initialized.  Waiting for XHR override to complete.');
}

// Call initializePlugin to set up the plugin object.
initializePlugin();

// Send
