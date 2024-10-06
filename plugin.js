// Plugin information and functionality
const pluginInfo = {
  // Plugin information
  info: {
    id: 'your-plugin-id',
    name: 'Your Plugin Name',
    version: '1.2.0',
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
    console.log("generateOutput function called with phoneNumber:", phoneNumber); // 日志信息
    try {
      // 在 WebView 中执行 JavaScript 代码获取网页信息
      const phoneInfo = new Promise((resolve, reject) => {
        console.log('Waiting for DOMContentLoaded event...'); // 日志信息

        // 监听 DOMContentLoaded 事件
        document.addEventListener('DOMContentLoaded', () => {
          console.log('DOMContentLoaded event fired.'); // 日志信息

          // 使用 MutationObserver 监听 DOM 变化
          const targetNode = document.body;
          const config = { childList: true, subtree: true };

          const callback = (mutationsList, observer) => {
            for (const mutation of mutationsList) {
              if (mutation.type === 'childList') {
                console.log('DOM changed:', mutation); // 日志信息

                // 检查目标元素是否已经加载
                const countElement = document.querySelector(".mohe-tips-zp b");
                const addressElement = document.querySelector(".mh-detail span:nth-child(2)");

                if (countElement && addressElement) {
                  console.log('Target elements found. Extracting information...'); // 日志信息
                  const jsonObject = { count: 0 };
                  try {
                    jsonObject.count = parseInt(countElement.textContent);

                    const addressParts = addressElement.textContent.trim().split(/\s+/);
                    jsonObject.province = addressParts[0];
                    jsonObject.city = addressParts[1];
                    jsonObject.carrier = addressParts[2];

                    const sourceLabelElement = document.querySelector(".mohe-tips-zp");
                    if (sourceLabelElement) {
                      jsonObject.sourceLabel = sourceLabelElement.textContent.trim();
                    }

                    const sourceNameElement = document.querySelector(".mohe-tips-zp .mohe-sjws");
                    if (sourceNameElement) {
                      jsonObject.sourceName = sourceNameElement.textContent.trim();
                    }

                    jsonObject.date = new Date().toISOString().split('T')[0];
                    console.log('Information extracted:', jsonObject); // 日志信息
                    resolve(jsonObject);
                  } catch (e) {
                    console.error('Error querying phone info:', e);
                    reject(e.toString()); // 使用 reject 将错误传递给 Promise
                  }

                  // 停止监听 DOM 变化
                  observer.disconnect();
                }
              }
            }
          };

          const observer = new MutationObserver(callback);
          observer.observe(targetNode, config);
        });
      });

      // 使用 then 处理 Promise 的结果，使用 catch 处理错误
      return phoneInfo
        .then((result) => {
          let matchedLabel = null;
          for (const [key, value] of Object.entries(this.manualMapping)) {
            if (result.sourceLabel && result.sourceLabel.includes(key)) {
              matchedLabel = value;
              break;
            }
          }
          if (!matchedLabel) {
            matchedLabel = 'Unknown';
          }

          const output = {
            phoneNumber: result.phoneNumber || phoneNumber,
            sourceLabel: result.sourceLabel,
            count: result.count,
            predefinedLabel: matchedLabel,
            source: this.info.name,
            province: result.province,
            city: result.city,
            carrier: result.carrier,
            date: result.date,
          };

          console.log("Final output:", JSON.stringify(output));

          // 将结果发送回 Flutter 应用
          window.FlutterChannel.postMessage(JSON.stringify(output)); 

          return output;
        })
        .catch((error) => {
          console.error('Error in generateOutput:', error);
          // 将错误信息发送回 Flutter 应用
          window.FlutterChannel.postMessage(JSON.stringify({ error: error })); 
          return { error: error };
        });
    } catch (error) {
      console.error('Error in generateOutput:', error);
      // 将错误信息发送回 Flutter 应用
      window.FlutterChannel.postMessage(JSON.stringify({ error: error.toString() })); 
      return { error: error.toString() };
    }
  }
};

// Make pluginInfo globally accessible
window.pluginInfo = pluginInfo;

console.log('Plugin loaded successfully');
