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
  // 手机号查询函数 - 360搜索
  // 手机号查询函数 - 360搜索
  async queryPhoneInfo(phoneNumber) {
    const jsonObject = { count: 0 };
    try {
      const targetUrl = `https://www.so.com/s?q=${phoneNumber}`;
      const response = await fetch(targetUrl, { // 直接访问目标网址
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/537.36"
        }
      });
      if (response.ok) {
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // 使用更精确的选择器查找元素
        const countElement = doc.querySelector(".mohe-tips-zp b"); 
        const addressElement = doc.querySelector(".mh-detail span:nth-child(2)"); 
        const sourceLabelElement = doc.querySelector(".mohe-tips-zp");
        const sourceNameElement = doc.querySelector(".mohe-tips-zp .mohe-sjws"); 

        if (countElement) {
          jsonObject.count = parseInt(countElement.textContent); // 直接解析为整数
        }
        if (addressElement) {
          const addressParts = addressElement.textContent.trim().split(/\s+/); // 使用正则表达式分割地址
          jsonObject.province = addressParts[0];
          jsonObject.city = addressParts[1];
          jsonObject.carrier = addressParts[2];
        }
        if (sourceLabelElement) {
          jsonObject.sourceLabel = sourceLabelElement.textContent.trim(); 
        }
        if (sourceNameElement) {
          jsonObject.sourceName = sourceNameElement.textContent.trim(); 
        }

        jsonObject.date = new Date().toISOString().split('T')[0];
      }
    } catch (e) {
      console.error('Error querying phone info:', e);
      jsonObject.error = e.toString();
    }
    return jsonObject;
  },

  // ... 其他代码 ...

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
