const pluginInfo = {
  info: {
    id: 'your-plugin-id',
    name: 'Your Plugin Name',
    version: '1.9.97',
    description: 'This is a plugin template.',
    author: 'Your Name',
  },
  predefinedLabels: [
    {'label': 'Fraud Scam Likely'},
    {'label': 'Spam Likely'},
    {'label': 'Telemarketing'},
    {'label': 'Unknown'},
  ],
  manualMapping: {
    '诈骗电话': 'Fraud Scam Likely',
    '骚扰电话': 'Spam Likely',
    '电话营销': 'Telemarketing',
  },
  phoneInfoUrl: 'https://www.baidu.com/s?wd=',
  extractPhoneInfo(doc, phoneNumber) {
  const jsonObject = {
    count: 0,
    sourceLabel: "",
    province: "",
    city: "",
    carrier: ""
  };
  try {
    // 更新后的 DOM 选择器
    const infoContainer = doc.querySelector('#app > div > div:nth-child(2) > div.c-container > div.main_content-wrapper_1RWkL > div > div:nth-child(2) > div'); // 获取包含电话号码信息的容器元素

    if (infoContainer) {
      const titleElement = infoContainer.querySelector('.c-gap-top-xsmall > div:nth-child(2) > div:nth-child(1)'); // 获取标题元素
      const locationElement = infoContainer.querySelector('.c-gap-top-xsmall > div:nth-child(2) > div:nth-child(2)'); // 获取位置元素

      if (titleElement) {
        jsonObject.sourceLabel = titleElement.textContent.trim();

        // 检查是否包含 "用户标记"
        const markerElement = titleElement.querySelector('.marker-color_3IDoi');
        if (markerElement) {
          jsonObject.count = 1; // 假设至少有一个报告
        }
      }

      if (locationElement) {
        const locationText = locationElement.textContent.trim();
        const locationParts = locationText.split(' ');
        if (locationParts.length >= 2) {
          jsonObject.province = locationParts[0];
          jsonObject.city = locationParts[1];
        }
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

window.pluginInfo = pluginInfo;

if (window.FlutterChannel) {
  window.FlutterChannel.postMessage('JavaScript loaded');
}

function processPhoneNumberData(data, phoneNumber) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(data, 'text/html');
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

  window.FlutterChannel.postMessage(JSON.stringify(output));
}

console.log('Plugin loaded successfully');
