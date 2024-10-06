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
    // ... (other labels)
  ],

  // Manual mapping table
  manualMapping: {
    '标签1': 'Fraud Scam Likely',
    '骚扰电话': 'Spam Likely',
    // ... (other mappings)
  },

  // Phone query function - 360 search
  async queryPhoneInfo(phoneNumber) {
    const jsonObject = { count: 0 };
    try {
      const response = await fetch(`https://www.so.com/s?q=${phoneNumber}`, {
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/537.36"
        },
        mode: 'no-cors'  // 添加 no-cors 模式
        
      });
      if (response.ok) {
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const countElement = doc.querySelector(".mohe-tips-zp b");
        const addressElement = doc.querySelector(".mh-detail span:nth-child(2)");
        const sourceLabelElement = doc.querySelector(".mohe-tips-zp");
        const sourceNameElement = doc.querySelector(".mohe-tips-zp .mohe-sjws");

        if (countElement) {
          jsonObject.count = countElement.textContent;
          jsonObject.address = addressElement?.textContent?.trim();
          jsonObject.sourceLabel = sourceLabelElement?.textContent?.trim();
          jsonObject.sourceName = sourceNameElement?.textContent?.trim();
          jsonObject.date = new Date().toISOString().split('T')[0];
        }
      }
    } catch (e) {
      console.error('Error querying phone info:', e);
    }
    return jsonObject;
  },

  // Generate output object
  async generateOutput(phoneNumber, nationalNumber, e164Number) {
    const queryResults = await Promise.all([
      phoneNumber ? this.queryPhoneInfo(phoneNumber) : Promise.resolve({}),
      nationalNumber ? this.queryPhoneInfo(nationalNumber) : Promise.resolve({}),
      e164Number ? this.queryPhoneInfo(e164Number) : Promise.resolve({})
    ]);

    const [phoneInfo, nationalInfo, e164Info] = queryResults;

    const info = {
      count: phoneInfo.count || nationalInfo.count || e164Info.count,
      sourceLabel: phoneInfo.sourceLabel || nationalInfo.sourceLabel || e164Info.sourceLabel,
      sourceName: phoneInfo.sourceName || nationalInfo.sourceName || e164Info.sourceName,
    };

    let matchedLabel = null;
    for (const label of this.predefinedLabels) {
      if (label.label === info.sourceLabel) {
        matchedLabel = label.label;
        break;
      }
    }
    if (!matchedLabel) {
      matchedLabel = this.manualMapping[info.sourceLabel] || null;
    }

    console.log("Final output:", {
      phoneNumber: phoneNumber,
      sourceLabel: info.sourceLabel,
      count: info.count,
      predefinedLabel: matchedLabel,
      source: info.sourceName || this.info.name,
    });

    return {
      phoneNumber: phoneNumber,
      sourceLabel: info.sourceLabel,
      count: info.count,
      predefinedLabel: matchedLabel,
      source: info.sourceName || this.info.name,
    };
  }
};

// Make pluginInfo globally accessible
window.pluginInfo = pluginInfo;

console.log('Plugin loaded successfully');
