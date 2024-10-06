// Plugin information and functionality
const pluginInfo = {
  // Plugin information
  info: {
    id: 'your-plugin-id',
    name: 'Your Plugin Name',
    version: '1.9.5',
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

  // URL for phone lookup
  phoneInfoUrl: 'https://www.so.com/s?q=',

  // Generate output object
  async generateOutput(phoneNumber) {
    try {
      console.log("generateOutput function called with phoneNumber:", phoneNumber);

      // 使用 Fetch API 获取网页内容
      const response = await fetch(this.phoneInfoUrl + encodeURIComponent(phoneNumber));
      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status}`);
      }
      const html = await response.text();

      // 创建一个虚拟 DOM 解析 HTML 内容
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract information from the virtual DOM
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

      return output;
    } catch (error) {
      console.error('Error in generateOutput:', error);
      throw error;
    }
  },

  // Extract phone information function
  extractPhoneInfo(doc, phoneNumber) {
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
