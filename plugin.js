// Plugin information and functionality
const pluginInfo = {
  // Plugin information
  info: {
    id: 'your-plugin-id',
    name: 'Your Plugin Name',
    version: '1.1.0',
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

  // Phone query function - 360 search
  async queryPhoneInfo(phoneNumber) {
    const jsonObject = { count: 0 };
    try {
      const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
      const targetUrl = `https://www.so.com/s?q=${phoneNumber}`;
      const response = await fetch(proxyUrl + targetUrl, {
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/537.36"
        }
      });
      if (response.ok) {
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const detailElement = doc.querySelector(".mh-detail");
        const tipsElement = doc.querySelector(".mohe-tips-zp");

        if (detailElement) {
          const spans = detailElement.querySelectorAll('span');
          jsonObject.phoneNumber = spans[0]?.textContent.trim();
          const locationInfo = spans[1]?.textContent.trim().split(' ');
          jsonObject.province = locationInfo?.[0];
          jsonObject.city = locationInfo?.[1];
          jsonObject.carrier = locationInfo?.[2];
        }

        if (tipsElement) {
          const countElement = tipsElement.querySelector('b');
          jsonObject.count = countElement ? parseInt(countElement.textContent) : 0;
          jsonObject.sourceLabel = tipsElement.textContent.trim();
        }

        jsonObject.date = new Date().toISOString().split('T')[0];
      }
    } catch (e) {
      console.error('Error querying phone info:', e);
      jsonObject.error = e.toString();
    }
    return jsonObject;
  },

  // Generate output object
  async generateOutput(phoneNumber, nationalNumber, e164Number) {
    try {
      const queryResults = await Promise.all([
        phoneNumber ? this.queryPhoneInfo(phoneNumber) : Promise.resolve({}),
        nationalNumber ? this.queryPhoneInfo(nationalNumber) : Promise.resolve({}),
        e164Number ? this.queryPhoneInfo(e164Number) : Promise.resolve({})
      ]);

      const [phoneInfo] = queryResults;

      let matchedLabel = null;
      for (const [key, value] of Object.entries(this.manualMapping)) {
        if (phoneInfo.sourceLabel && phoneInfo.sourceLabel.includes(key)) {
          matchedLabel = value;
          break;
        }
      }
      if (!matchedLabel) {
        matchedLabel = 'Unknown';
      }

      const result = {
        phoneNumber: phoneInfo.phoneNumber || phoneNumber,
        sourceLabel: phoneInfo.sourceLabel,
        count: phoneInfo.count,
        predefinedLabel: matchedLabel,
        source: this.info.name,
        province: phoneInfo.province,
        city: phoneInfo.city,
        carrier: phoneInfo.carrier,
        date: phoneInfo.date,
      };

      console.log("Final output:", JSON.stringify(result));
      return result;
    } catch (error) {
      console.error('Error in generateOutput:', error);
      return { error: error.toString() };
    }
  }
};

// Make pluginInfo globally accessible
window.pluginInfo = pluginInfo;

console.log('Plugin loaded successfully');
