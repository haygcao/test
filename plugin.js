// Plugin information and functionality
const pluginInfo = {
  // Plugin information
  info: {
    id: 'your-plugin-id',
    name: 'Your Plugin Name',
    version: '1.3.0',
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
    try {
      // 在 WebView 中执行 JavaScript 代码获取网页信息
      const phoneInfoPromise = new Promise((resolve, reject) => {
        console.log('Waiting for DOMContentLoaded event...');

        // 监听 DOMContentLoaded 事件
        document.addEventListener('DOMContentLoaded', () => {
          console.log('DOMContentLoaded event fired.');

          // 检查目标元素是否已经存在于 DOM 中
          const countElement = document.querySelector(".mohe-tips-zp b");
          const addressElement = document.querySelector(".mh-detail span:nth-child(2)");

          if (countElement && addressElement) {
            console.log('Target elements found. Extracting information...');
            extractPhoneInfo(resolve, reject);
          } else {
            // 使用 MutationObserver 监听 DOM 变化，等待目标元素出现
            const targetNode = document.body;
            const config = { childList: true, subtree: true };

            const callback = (mutationsList, observer) => {
              for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                  console.log('DOM changed:', mutation);

                  // 每次 DOM 变化后，重新检查目标元素是否存在
                  const countElement = document.querySelector(".mohe-tips-zp b");
                  const addressElement = document.querySelector(".mh-detail span:nth-child(2)");

                  if (countElement && addressElement) {
                    console.log('Target elements found. Extracting information...');
                    extractPhoneInfo(resolve, reject);

                    // 停止监听 DOM 变化
                    observer.disconnect();
                  }
                }
              }
            };

            const observer = new MutationObserver(callback);
            observer.observe(targetNode, config);
          }
        });
      });

      // 提取电话信息并返回结果或错误
      return phoneInfoPromise
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

// 提取电话信息的函数
function extractPhoneInfo(resolve, reject) {
  const jsonObject = { count: 0 };
  try {
    const countElement = document.querySelector(".mohe-tips-zp b");
    const addressElement = document.querySelector(".mh-detail span:nth-child(2)");
    const sourceLabelElement = document.querySelector(".mohe-tips-zp");
    const sourceNameElement = document.querySelector(".mohe-tips-zp .mohe-sjws");

    if (countElement) {
      jsonObject.count = parseInt(countElement.textContent);
      console.log('Count:', jsonObject.count); // 打印 countElement 的内容
    }

    if (addressElement) {
      const addressParts = addressElement.textContent.trim().split(/\s+/);
      console.log('Address parts:', addressParts); // 打印 addressParts 的内容
      jsonObject.province = addressParts[0];
      jsonObject.city = addressParts[1];
      jsonObject.carrier = addressParts[2];
    }

    if (sourceLabelElement) {
      jsonObject.sourceLabel = sourceLabelElement.textContent.trim();
      console.log('Source label:', jsonObject.sourceLabel); // 打印 sourceLabelElement 的内容
    }

    if (sourceNameElement) {
      jsonObject.sourceName = sourceNameElement.textContent.trim();
      console.log('Source name:', jsonObject.sourceName); // 打印 sourceNameElement 的内容
    }

    jsonObject.date = new Date().toISOString().split('T')[0];
    console.log('Information extracted:', jsonObject); // 打印提取的信息
    resolve(jsonObject);
  } catch (e) {
    console.error('Error querying phone info:', e);
    reject(e.toString());
  }
}

// Make pluginInfo globally accessible
window.pluginInfo = pluginInfo;

console.log('Plugin loaded successfully');
