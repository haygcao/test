(function () {
    if (window.plugin) return;

    const pluginId = 'tellowsPlugin';

    const pluginInfo = {
        info: {
            id: 'tellowsPlugin',
            name: 'Tellows Plugin',
            version: '1.0.0',
            description: 'This plugin retrieves information about phone numbers.',
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
        'Unknown': 'Unknown',
        'Trustworthy number': 'Other',
        'Sweepstakes, lottery': 'Spam Likely',
        'Debt collection company': 'Debt Collection',
        'Aggressive advertising': 'Telemarketing',
        'Survey': 'Survey',
        'Harassment calls': 'Spam Likely',
        'Cost trap': 'Fraud Scam Likely',
        'Telemarketer': 'Telemarketing',
        'Ping Call': 'Spam Likely',
        'SMS spam': 'Spam Likely',
        'Spam Call': 'Spam Likely',
    };

    // --- Unified Request Function ---
    function queryPhoneInfo(phoneNumber, externalRequestId) {
        // Generate a unique ID for *this specific phone number request*
        const phoneRequestId = Math.random().toString(36).substring(2);
        console.log(`queryPhoneInfo: phone=${phoneNumber}, externalRequestId=${externalRequestId}, phoneRequestId=${phoneRequestId}`);

        const url = `https://www.tellows.com/num/${phoneNumber}`;
        const method = 'GET';
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; arm_64; Android 14; SM-S711B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.199 YaBrowser/24.12.4.199.00 SA/3 Mobile Safari/537.36', // Example User-Agent
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

    // handleResponse function (now receives both request IDs)
    function handleResponse(response) {
    console.log('handleResponse called with:', response);

    if (response.status >= 200 && response.status < 300) {
        // Use response.phoneNumber, which should be passed from Flutter
        let result = parseResponse(response.responseText, response.phoneNumber);

        console.log('First successful query completed:', result);

        if (result === null || result === undefined) {
            // Use response.externalRequestId for errors
            sendResultToFlutter('pluginError', { error: 'All attempts failed or timed out.' }, response.externalRequestId);
            return;
        }

        let matchedLabel = predefinedLabels.find(label => label.label === result.sourceLabel)?.label;
        if (!matchedLabel) {
            matchedLabel = manualMapping[result.sourceLabel];
        }
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
            predefinedLabel: matchedLabel,
            source: pluginInfo.info.name,
        };

        // Use response.externalRequestId for the result
        sendResultToFlutter('pluginResult', finalResult, response.externalRequestId);
    } else {
        // Use response.externalRequestId for errors
        sendResultToFlutter('pluginError', { error: response.statusText }, response.externalRequestId);
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
