// Plugin information and functionality
const pluginInfo = {
  // Plugin information
  info: {
    id: 'your-plugin-id',
    name: 'Your Plugin Name',
    version: '1.9.69',
    description: 'This is a plugin template.',
    author: 'Your Name',
  },

  // Predefined labels list (暂时不需要)
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

        // Navigate to the phone lookup URL
        window.location.href = this.phoneInfoUrl + encodeURIComponent(phoneNumber);

        // Wait for the page to load and then extract information
        setTimeout(() => {
          const jsonObject = this.extractPhoneInfo(document, phoneNumber);

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

          // Send the result back to Flutter
          window.FlutterChannel.postMessage(JSON.stringify(output));

          // You can optionally navigate back to a blank page or a previous page here
          // window.location.href = 'about:blank';

        }, 3000); // Adjust the timeout as needed

      } catch (error) {
        console.error('Error in generateOutput:', error);
        window.FlutterChannel.postMessage(JSON.stringify({ error: error.toString() }));
      }
    });
  },

  // Extract phone information function (Updated to use DOM manipulation)
  extractPhoneInfo(doc, phoneNumber) {
    const jsonObject = {
      count: 0,
      sourceLabel: "",
      province: "",
      city: "",
      carrier: ""
    };

    try {
      // Find the relevant elements using DOM selectors (based on your provided HTML snippet)
      const titleElement = doc.querySelector(".c-border .cc-title_31ypU");
      const locationElement = doc.querySelector(".c-border .cc-row_dDm_G");

      if (titleElement) {
        jsonObject.sourceLabel = titleElement.textContent.trim();
        if (jsonObject.sourceLabel.includes("用户标记")) {
          jsonObject.count = 1; // Assuming at least one report if "用户标记" is present
        }
      }

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
