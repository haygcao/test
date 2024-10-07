// Plugin information and functionality
const pluginInfo = {
  // Plugin information
  info: {
    id: 'your-plugin-id',
    name: 'Your Plugin Name',
    version: '1.9.15',
    description: 'This is a plugin template.',
    author: 'Your Name',
  },

  // Predefined labels list
  predefinedLabels: [
    { 'label': 'Fraud Scam Likely' },
    { 'label': 'Spam Likely' },
    { 'label': 'Telemarketing' },
    { 'label': 'Unknown' },
  ],

  // Manual mapping table
  manualMapping: {
    '诈骗电话': 'Fraud Scam Likely',
    '骚扰电话': 'Spam Likely',
    '电话营销': 'Telemarketing', 
  },

  // URL for phone lookup
  phoneInfoUrl: 'https://www.baidu.com/s?wd=',

  // Generate output object
  generateOutput(phoneNumber) {
    return new Promise((resolve, reject) => {
      try {
        console.log("generateOutput function called with phoneNumber:", phoneNumber);

        // Use XMLHttpRequest to fetch page content
        const xhr = new XMLHttpRequest();
        xhr.open('GET', this.phoneInfoUrl + encodeURIComponent(phoneNumber), true);
        xhr.onload = () => {
          if (xhr.status === 200) {
            // Parse HTML content
            const parser = new DOMParser();
            const doc = parser.parseFromString(xhr.responseText, 'text/html');

            // Extract information
            const jsonObject = this.extractPhoneInfo(doc, phoneNumber);

            let matchedLabel = null;
            for (const [key, value] of Object.entries(this.manualMapping)) {
              if (jsonObject.sourceLabel && jsonObject.sourceLabel.includes(key)) {
                matchedLabel = value;
                break;
              }
            }
            if (!matchedLabel) {
              matchedLabel = 'Unknown';
            }

            const output = {
              phoneNumber: phoneNumber,
              sourceLabel: jsonObject.sourceLabel,
              count: jsonObject.count,
              predefinedLabel: matchedLabel,
              source: this.info.name,
              province: jsonObject.province,
              city: jsonObject.city,
              carrier: jsonObject.carrier,
              date: new Date().toISOString().split('T')[0],
            };

            console.log("Final output:", JSON.stringify(output));

            resolve(output);
          } else {
            reject(new Error(`Request failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Request failed'));
        xhr.send();

      } catch (error) {
        console.error('Error in generateOutput:', error);
        reject(error);
      }
    });
  },

  // Extract phone information function
  extractPhoneInfo(doc, phoneNumber) {
    const jsonObject = { 
      count: 0, 
      sourceLabel: "", 
      province: "", 
      city: "",
      carrier: "" 
    };
    try {
      // Extract count (if available) - Updated selector
      const countElement = doc.querySelector(".c-border .mark-tip_3WkLJ span"); 
      if (countElement && countElement.textContent.includes("此号码存在风险")) {
        jsonObject.count = 1; // Assuming at least one report if the warning exists
      }

      // Extract source label - Updated selector
      const sourceLabelElement = doc.querySelector(".c-border .cc-title_31ypU");
      if (sourceLabelElement) {
        jsonObject.sourceLabel = sourceLabelElement.textContent.trim();
      }

      // Extract province and city - Updated selector
      const locationElement = doc.querySelector(".c-border .cc-row_dDm_G");
      if (locationElement) {
        const locationParts = locationElement.textContent.trim().split(" ");
        if (locationParts.length >= 2) {
          jsonObject.province = locationParts[0];
          jsonObject.city = locationParts[1];
        }
      }

      jsonObject.phoneNumber = phoneNumber;
      console.log('Information extracted:', jsonObject);
      return jsonObject;
    } catch (e) {
      console.error('Error querying phone info:', e);
      throw e;
    }
  }
};

// Make pluginInfo globally accessible
window.pluginInfo = pluginInfo;

// Notify Flutter app that JavaScript code has been loaded
if (window.FlutterChannel) {
  window.FlutterChannel.postMessage('JavaScript loaded');
}

console.log('Plugin loaded successfully'); 
