// Plugin information and functionality
const pluginInfo = {
  // Plugin information
  info: {
    id: 'your-plugin-id',
    name: 'Your Plugin Name',
    version: '1.7.0',
    description: 'This is a plugin template.',
    author: 'Your Name',
  },

  // Predefined labels list
  predefinedLabels: [
    {'label': 'Fraud Scam Likely'},
    {'label': 'Spam Likely'},
    {'label': 'Telemarketing'},
    {'label': 'Unknown'},
  ],

  // Manual mapping table
  manualMapping: {
    '疑似为骚扰电话！': 'Spam Likely',
    '用户标记，疑似为骚扰电话！': 'Fraud Scam Likely',
    '电话营销': 'Telemarketing',
  },

  // Base URL for phone lookup
  phoneInfoBaseUrl: 'https://www.example.com/phone-lookup?phone=',

  // Generate output object
  generateOutput(phoneNumber) {
    return new Promise((resolve, reject) => {
      try {
        console.log("generateOutput function called with phoneNumber:", phoneNumber);
        
        // Construct the full URL
        const url = this.phoneInfoBaseUrl + encodeURIComponent(phoneNumber);
        
        // Use XMLHttpRequest to avoid CORS issues
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        
        xhr.onload = () => {
          if (xhr.status === 200) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xhr.responseText, 'text/html');
            
            const jsonObject = this.extractPhoneInfo(doc);

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
            console.error('Failed to load page:', xhr.status);
            reject('Failed to load page: ' + xhr.status);
          }
        };

        xhr.onerror = () => {
          console.error('Network error occurred');
          reject('Network error occurred');
        };

        xhr.send();
      } catch (error) {
        console.error('Error in generateOutput:', error);
        reject(error);
      }
    });
  },

  // Extract phone information function
  extractPhoneInfo(doc) {
    const jsonObject = { count: 0 };
    try {
      const countElement = doc.querySelector(".mohe-tips-zp b");
      const addressElement = doc.querySelector(".mh-detail span:nth-child(2)");
      const sourceLabelElement = doc.querySelector(".mohe-tips-zp");
      const sourceNameElement = doc.querySelector(".mohe-tips-zp .mohe-sjws");

      if (countElement) {
        jsonObject.count = parseInt(countElement.textContent);
        console.log('Count:', jsonObject.count);
      }

      if (addressElement) {
        const addressParts = addressElement.textContent.trim().split(/\s+/);
        console.log('Address parts:', addressParts);
        jsonObject.province = addressParts[0];
        jsonObject.city = addressParts[1];
        jsonObject.carrier = addressParts[2];
      }

      if (sourceLabelElement) {
        jsonObject.sourceLabel = sourceLabelElement.textContent.trim();
        console.log('Source label:', jsonObject.sourceLabel);
      }

      if (sourceNameElement) {
        jsonObject.sourceName = sourceNameElement.textContent.trim();
        console.log('Source name:', jsonObject.sourceName);
      }

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
