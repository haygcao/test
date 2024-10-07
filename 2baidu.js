// Plugin information and functionality
const pluginInfo = {
  // Plugin information
  info: {
    id: 'your-plugin-id',
    name: 'Your Plugin Name',
    version: '1.9.65',
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

  // Manual mapping table (暂时不需要)
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
        postMessageToFlutter("generateOutput function called with phoneNumber: " + phoneNumber);

        // 使用 JavaScript 注入的方式获取页面内容
        injectScriptAndExtractInfo(phoneNumber, (jsonObject) => {
          // 直接使用原始标签作为 predefinedLabel
          const output = {
            phoneNumber: phoneNumber,
            sourceLabel: jsonObject.sourceLabel,
            count: jsonObject.count,
            predefinedLabel: jsonObject.sourceLabel, // 直接使用原始标签
            source: this.info.name,
            province: jsonObject.province,
            city: jsonObject.city,
            carrier: jsonObject.carrier,
            date: new Date().toISOString().split('T')[0],
          };

          postMessageToFlutter("Final output: " + JSON.stringify(output));

          resolve(output);
        }, (error) => {
          postMessageToFlutter('Error in injectScriptAndExtractInfo: ' + error.message);
          reject(error);
        });

      } catch (error) {
        postMessageToFlutter('Error in generateOutput: ' + error.message);
        reject(error);
      }
    });
  },

  // Extract phone information function
  extractPhoneInfo(doc, phoneNumber) {
    const jsonObject = {
      count: 0,
      sourceLabel: "",
      province: "",
      city: "",
      carrier: ""
    };
    try {
      postMessageToFlutter("开始提取电话信息...");

      // 提取标记次数 - 检查是否存在风险提示
      const riskTipElement = doc.querySelector(".c-border .mark-tip_3WkLJ");
      if (riskTipElement) {
        jsonObject.count = 1; // 存在风险提示，设置 count 为 1
        postMessageToFlutter("检测到风险提示，count 设置为 1");
      } else {
        postMessageToFlutter("未检测到风险提示");
      }

      // 提取来源标签 - 获取诈骗电话类型 (原始标签) - 修改后的逻辑
      const sourceLabelElement = doc.querySelector(".c-border .cc-title_31ypU");
      if (sourceLabelElement) {
        jsonObject.sourceLabel = sourceLabelElement.textContent.trim();
        postMessageToFlutter("提取到 sourceLabel: " + jsonObject.sourceLabel);
      } else {
        postMessageToFlutter("未找到 sourceLabel 元素");
      }

      // 提取省份和城市
      const locationElement = doc.querySelector(".c-border .cc-row_dDm_G");
      if (locationElement) {
        const locationParts = locationElement.textContent.trim().split(" ");
        if (locationParts.length >= 2) {
          jsonObject.province = locationParts[0];
          jsonObject.city = locationParts[1];
          postMessageToFlutter("提取到省份: " + jsonObject.province + ", 城市: " + jsonObject.city);
        } else {
          postMessageToFlutter("locationElement 文本内容格式不正确");
        }
      } else {
        postMessageToFlutter("未找到 locationElement 元素");
      }

      jsonObject.phoneNumber = phoneNumber;
      postMessageToFlutter('提取到的信息: ' + JSON.stringify(jsonObject));
      postMessageToFlutter("电话信息提取完成");

      return jsonObject;
    } catch (e) {
      postMessageToFlutter('查询电话信息时出错: ' + e.message);
      throw e;
    }
  }
};

// 将脚本注入页面并提取信息
function injectScriptAndExtractInfo(phoneNumber, onSuccess, onError) {
  try {
    // 创建一个 <script> 元素
    const script = document.createElement('script');

    // 设置脚本内容，使用 JavaScript 获取页面内容并调用 extractPhoneInfo 函数
    script.textContent = `
      (function() {
        try {
          // 获取页面内容 (这里需要根据实际页面结构调整)
          const pageContent = document.documentElement.outerHTML; 

          // 将页面内容传递给 extractPhoneInfo 函数
          const jsonObject = pluginInfo.extractPhoneInfo(new DOMParser().parseFromString(pageContent, 'text/html'), "${phoneNumber}");

          // 将提取到的信息传递给 onSuccess 回调函数
          ${onSuccess.toString()}(jsonObject); 
        } catch (error) {
          // 将错误信息传递给 onError 回调函数
          ${onError.toString()}(error);
        }
      })();
    `;

    // 将 <script> 元素添加到页面中
    document.body.appendChild(script);

    // 移除 <script> 元素 (可选)
    document.body.removeChild(script);
  } catch (error) {
    onError(error);
  }
}


// 将消息发送到 Flutter 应用
function postMessageToFlutter(message) {
  if (window.FlutterChannel) {
    window.FlutterChannel.postMessage('JS Log: ' + message);
  }
}

// Make pluginInfo globally accessible
window.pluginInfo = pluginInfo;

// Notify Flutter app that JavaScript code has been loaded
if (window.FlutterChannel) {
  window.FlutterChannel.postMessage('JavaScript loaded');
}

console.log('Plugin loaded successfully');
