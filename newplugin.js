// Plugin information and functionality
const pluginInfo = {
  // Plugin information
  info: {
    id: 'your-plugin-id',
    name: 'Your Plugin Name',
    version: '1.9.10',
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
    '疑似为骚扰电话！': 'Spam Likely',
    '用户标记，疑似为骚扰电话！': 'Fraud Scam Likely',
    '电话营销': 'Telemarketing',
  },

  // URL for phone lookup
  phoneInfoUrl: 'https://www.so.com/s?q=',

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
    const jsonObject = { count: 0 };
    try {
      const countElement = doc.querySelector(".mohe-tips-zp b"); 
      const addressElement = doc.querySelector(".mh-detail span"); // 更新选择器
      const sourceLabelElement = doc.querySelector(".mohe-tips-zp");
      const sourceNameElement = doc.querySelector(".mohe-tips-zp .mohe-sjws");

      if (countElement) {
        jsonObject.count = parseInt(countElement.textContent);
        console.log('Count:', jsonObject.count);
      }

      if (addressElement) {
        const addressParts = addressElement.textContent.trim().split(/\s+/); 
        jsonObject.province = addressParts[0];  // 更新索引
        jsonObject.city = addressParts[1];     // 更新索引
        jsonObject.carrier = addressParts[2];    // 更新索引
      }

      if (sourceLabelElement) {
        jsonObject.sourceLabel = sourceLabelElement.textContent.trim();
        console.log('Source label:', jsonObject.sourceLabel);
      }

      if (sourceNameElement) {
        jsonObject.sourceName = sourceNameElement.textContent.trim();
        console.log('Source name:', jsonObject.sourceName);
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
