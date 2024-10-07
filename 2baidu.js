const pluginInfo = {
  info: {
    id: 'your-plugin-id',
    name: 'Your Plugin Name',
    version: '1.9.95',
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
      const titleElement = doc.querySelector(".c-border .cc-title_31ypU");
      const locationElement = doc.querySelector(".c-border .cc-row_dDm_G");

      if (titleElement) {
        jsonObject.sourceLabel = titleElement.textContent.trim();
        if (jsonObject.sourceLabel.includes("用户标记")) {
          jsonObject.count = 1;
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
