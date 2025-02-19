// Plugin ID, each plugin must be unique
const pluginId = 'tellowsPlugin';

// Plugin information
const pluginInfo = {
  // Plugin information
  info: {
    id: 'tellowsPlugin', // Plugin ID, must be unique
    name: 'Tellows', // Plugin name
    version: '1.2.0', // Plugin version
    description: 'This plugin retrieves information about phone numbers from shouldianswer.com.', // Plugin description
    author: 'Your Name', // Plugin author
  },
};

// Predefined label list (you can adjust this list based on your needs)
const predefinedLabels = [
    {'label': 'Fraud Scam Likely'},
    {'label': 'Spam Likely'},
    {'label': 'Telemarketing'},
    {'label': 'Robocall'},
    {'label': 'Delivery'},
    {'label': 'Takeaway'},
    {'label': 'Ridesharing'},
    {'label': 'Insurance'},
    {'label': 'Loan'},
    {'label': 'Customer Service'},
    {'label': 'Unknown'},
    {'label': 'Financial'},
    {'label': 'Bank'},
    {'label': 'Education'},
    {'label': 'Medical'},
    {'label': 'Charity'},
    {'label': 'Other'},
    {'label': 'Debt Collection'},
    {'label': 'Survey'},
    {'label': 'Political'},
    {'label': 'Ecommerce'},
    {'label': 'Risk'},
    {'label': 'Agent'},
    {'label': 'Recruiter'},
    {'label': 'Headhunter'},
    {'label': 'Silent Call(Voice Clone?)'},  

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


// Using a Map object to store pending Promises
const pendingPromises = new Map();

// Function to query phone number information (修改: 使用 XMLHttpRequest)
function queryPhoneInfo(phoneNumber, requestId) {
  console.log('queryPhoneInfo called with phoneNumber:', phoneNumber, 'and requestId:', requestId);

  return new Promise((resolve, reject) => { // 返回 Promise
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `https://www.tellows.com/num/${phoneNumber}`);
    xhr.setRequestHeader('X-Flutter-Intercept', 'true'); // 添加自定义头部
     xhr.timeout = 5000; // 设置超时

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText); // 成功时 resolve 响应文本
      } else {
        reject(new Error(`HTTP error! status: ${xhr.status}`)); // 失败时 reject 错误
      }
    };

    xhr.onerror = () => {
        reject(new Error('Network error'));
    }
    xhr.ontimeout = () => {
        reject(new Error('Request timed out'));
    };

    xhr.send();
  });
}

function extractDataFromDOM(doc, phoneNumber) {
   // ... (与之前相同, 不需要修改)
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

// Function to generate output information (修改: 使用 Promise 和 then/catch)
async function generateOutput(phoneNumber, nationalNumber, e164Number, externalRequestId) {
    console.log('generateOutput called with:', phoneNumber, nationalNumber, e164Number, externalRequestId);

    // Helper function to send result or error to Flutter
    function sendResultToFlutter(type, data) {
        const message = {
            type: type,
            pluginId: pluginId,
            requestId: externalRequestId,
            data: data,
        };
        const messageString = JSON.stringify(message);
        console.log('Sending message to Flutter:', messageString);
        if(window.flutter_inappwebview){
            window.flutter_inappwebview.callHandler('PluginResultChannel', messageString);
        }
        else{
            console.error("flutter_inappwebview is undefined");
        }
    }

  // Process each number sequentially, use whichever returns a valid result first
  // 依次处理每个号码，使用第一个返回有效结果的
    try {
        let result;

        if (phoneNumber && !result) {
            try {
                const responseText = await queryPhoneInfo(phoneNumber, externalRequestId);
                const parser = new DOMParser();
                const doc = parser.parseFromString(responseText, 'text/html');
                result = extractDataFromDOM(doc, phoneNumber);
                console.log('Query result for phoneNumber:', result);
            } catch (error) {
                console.error('Error querying phoneNumber:', error);
            }
        }

        if (nationalNumber && !result) {
          try {
                const responseText = await queryPhoneInfo(nationalNumber, externalRequestId);
                const parser = new DOMParser();
                const doc = parser.parseFromString(responseText, 'text/html');
                result = extractDataFromDOM(doc, nationalNumber); // Pass nationalNumber here
                console.log('Query result for nationalNumber:', result);
            } catch (error) {
                console.error('Error querying nationalNumber:', error);
            }
        }

        if (e164Number && !result) {
             try {
                const responseText = await queryPhoneInfo(e164Number, externalRequestId);
                const parser = new DOMParser();
                const doc = parser.parseFromString(responseText, 'text/html');
                result = extractDataFromDOM(doc, e164Number);
                console.log('Query result for e164Number:', result);
            } catch (error) {
                console.error('Error querying e164Number:', error);
            }
        }

    console.log('First successful query completed:', result);

    // Ensure result is not null or undefined
    if (result === null || result === undefined) {
            sendResultToFlutter('pluginError', { error: 'All attempts failed or timed out.' });
          return;
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

     // Send the result via FlutterChannel
        sendResultToFlutter('pluginResult', finalResult);

    }  catch (error) {
        console.error('Error in generateOutput:', error);
        sendResultToFlutter('pluginError', { error: error.message || 'Unknown error occurred during phone number lookup.' });
    }
}

// Initialize plugin
async function initializePlugin() {
  window.plugin = {};
  const thisPlugin = {
    id: pluginInfo.info.id,
    pluginId: pluginId,
    version: pluginInfo.info.version,
    queryPhoneInfo: queryPhoneInfo, // 现在 queryPhoneInfo 返回 Promise
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
