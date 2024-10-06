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

  // Generate output object
  async generateOutput(phoneNumber, nationalNumber, e164Number) {
    try {
      // 在 WebView 中执行 JavaScript 代码获取网页信息
      const phoneInfo = await new Promise((resolve, reject) => {
        // 将获取网页信息的代码封装成一个函数
        const getPhoneInfo = () => {
          const jsonObject = { count: 0 };
          try {
            const countElement = document.querySelector(".mohe-tips-zp b");
            const addressElement = document.querySelector(".mh-detail span:nth-child(2)");
            const sourceLabelElement = document.querySelector(".mohe-tips-zp");
            const sourceNameElement = document.querySelector(".mohe-tips-zp .mohe-sjws");

            if (countElement) {
              jsonObject.count = parseInt(countElement.textContent);
            }
            if (addressElement) {
              const addressParts = addressElement.textContent.trim().split(/\s+/);
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
            return jsonObject;
          } catch (e) {
            console.error('Error querying phone info:', e);
            return { error: e.toString() };
          }
        };

        // 使用 setTimeout 延迟执行 getPhoneInfo 函数，确保页面加载完成
        setTimeout(() => {
          const result = getPhoneInfo();
          resolve(result);
        }, 1000); // 延迟 1 秒
      });

      // ... 其他代码 (使用 phoneInfo 对象进行处理) ...

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
