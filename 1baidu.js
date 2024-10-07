const pluginInfo = {
  info: {
    id: 'your-plugin-id',
    name: 'Your Plugin Name',
    version: '1.90.15',
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
      // 使用正则表达式查找包含电话号码的文本
      const regex = new RegExp(phoneNumber, 'g');
      const elements = doc.querySelectorAll('*'); // 获取所有元素

      elements.forEach(element => {
        const textContent = element.textContent;

        // 检查元素文本是否包含电话号码
        if (regex.test(textContent)) {
          // 从父元素中查找标题和位置信息
          let titleElement = element;
          let locationElement = null;

          while (titleElement && !titleElement.classList.contains('cc-title_31ypU')) {
            titleElement = titleElement.parentElement;
          }

          if (titleElement) {
            jsonObject.sourceLabel = titleElement.textContent.trim();

            const markerElement = titleElement.querySelector('.marker-color_3IDoi');
            if (markerElement) {
              jsonObject.count = 1;
            }

            locationElement = titleElement.nextElementSibling;
            if (locationElement && locationElement.classList.contains('cc-row_dDm_G')) {
              const locationText = locationElement.textContent.trim();
              const locationParts = locationText.split(' ');
              if (locationParts.length >= 2) {
                jsonObject.province = locationParts[0];
                jsonObject.city = locationParts[1];
              }
            }
          }
        }
      });

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
