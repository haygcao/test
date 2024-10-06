// Plugin information and functionality
const pluginInfo = {
  // Plugin information
  info: {
    id: 'your-plugin-id',
    name: 'Your Plugin Name',
    version: '1.4.0',
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
  generateOutput(phoneNumber, nationalNumber, e164Number) {
    console.log("generateOutput function called with phoneNumber:", phoneNumber);
    return new Promise((resolve, reject) => {
      const waitForDOM = () => {
        if (document.readyState === 'complete') {
          this.extractInformation(phoneNumber)
            .then(output => {
              console.log("Final output:", JSON.stringify(output));
              // 将结果发送回 Flutter 应用
              window.FlutterChannel.postMessage(JSON.stringify(output));
              resolve(output);
            })
            .catch(error => {
              console.error('Error in generateOutput:', error);
              // 将错误信息发送回 Flutter 应用
              window.FlutterChannel.postMessage(JSON.stringify({ error: error.toString() }));
              reject(error);
            });
        } else {
          setTimeout(waitForDOM, 100);
        }
      };
      waitForDOM();
    });
  },

  extractInformation(phoneNumber) {
    return new Promise((resolve, reject) => {
      try {
        const jsonObject = { count: 0, phoneNumber };
        
        const countElement = document.querySelector(".mohe-tips-zp b");
        const addressElement = document.querySelector(".mh-detail span:nth-child(2)");

        if (countElement && addressElement) {
          jsonObject.count = parseInt(countElement.textContent);
          console.log('Count:', jsonObject.count);

          const addressParts = addressElement.textContent.trim().split(/\s+/);
          console.log('Address parts:', addressParts);
          jsonObject.province = addressParts[0];
          jsonObject.city = addressParts[1];
          jsonObject.carrier = addressParts[2];

          const sourceLabelElement = document.querySelector(".mohe-tips-zp");
          if (sourceLabelElement) {
            jsonObject.sourceLabel = sourceLabelElement.textContent.trim();
            console.log('Source label:', jsonObject.sourceLabel);
          }

          const sourceNameElement = document.querySelector(".mohe-tips-zp .mohe-sjws");
          if (sourceNameElement) {
            jsonObject.sourceName = sourceNameElement.textContent.trim();
            console.log('Source name:', jsonObject.sourceName);
          }

          jsonObject.date = new Date().toISOString().split('T')[0];

          let matchedLabel = 'Unknown';
          for (const [key, value] of Object.entries(this.manualMapping)) {
            if (jsonObject.sourceLabel && jsonObject.sourceLabel.includes(key)) {
              matchedLabel = value;
              break;
            }
          }

          const output = {
            ...jsonObject,
            predefinedLabel: matchedLabel,
            source: this.info.name,
          };

          resolve(output);
        } else {
          reject('Required elements not found in the DOM');
        }
      } catch (error) {
        console.error('Error extracting information:', error);
        reject(error.toString());
      }
    });
  }
};

// Make pluginInfo globally accessible
window.pluginInfo = pluginInfo;

console.log('Plugin loaded successfully');
