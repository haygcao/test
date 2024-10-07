// JavaScript 代码 (plugin.js)
// Plugin information and functionality
const pluginInfo = {
  // Plugin information
  info: {
    id: 'your-plugin-id',
    name: 'Your Plugin Name',
    version: '1.9.85',
    description: 'This is a plugin template.',
    author: 'Your Name',
  },

  // Predefined labels list
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

// 处理 Flutter 应用传递的数据
function processPhoneNumberData(data) {
  // 解析 HTML 响应
  const parser = new DOMParser();
  const doc = parser.parseFromString(data, 'text/html');

  // 从 Flutter 代码中获取电话号码
  // 注意：你需要找到一种方法将电话号码从 Flutter 传递到 JavaScript
  // 例如，你可以将电话号码作为参数传递给 processPhoneNumberData 函数
  // 或者，你可以在 JavaScript 代码中访问 Flutter 注入的全局变量
  // 这里假设你已经将电话号码存储在名为 'phoneNumber' 的全局变量中
  const phoneNumber = window.phoneNumber; 

  // 提取电话号码信息 (使用 DOM 操作)
  const jsonObject = pluginInfo.extractPhoneInfo(doc, phoneNumber); 

  let matchedLabel = null;
  for (const [key, value] of Object.entries(pluginInfo.manualMapping)) {
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
    source: pluginInfo.info.name,
    province: jsonObject.province,
    city: jsonObject.city,
    carrier: jsonObject.carrier,
    date: new Date().toISOString().split('T')[0],
  };

  console.log("Final output:", JSON.stringify(output));

  // Send the result back to Flutter
  window.FlutterChannel.postMessage(JSON.stringify(output));
}

console.log('Plugin loaded successfully');
