const pluginInfo = {
  info: {
    id: 'your-plugin-id',
    name: 'Your Plugin Name',
    version: '1.1.15',
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

    // Extract phone number
    jsonObject.count = 1; // Assuming we always find one phone number in this context
    const phoneElement = doc.querySelector(".c-title a em");
    if (phoneElement) {
      phoneNumber = phoneElement.textContent.trim();
    }

    // Extract label
    const labelElement = doc.querySelector(".cc-title_31ypU");
    if (labelElement) {
      jsonObject.sourceLabel = labelElement.textContent.trim();
      // Map label if necessary
      if (this.manualMapping[jsonObject.sourceLabel]) {
        jsonObject.sourceLabel = this.manualMapping[jsonObject.sourceLabel];
      }
    }

    // Extract province and city
    const locationElement = doc.querySelector(".cc-row_dDm_G");
    if (locationElement) {
      const locationParts = locationElement.textContent.trim().split(" ");
      if (locationParts.length >= 2) {
        jsonObject.province = locationParts[0];
        jsonObject.city = locationParts[1];
      }
    }

    return jsonObject;
  },
  queryPhoneInfo(phoneNumber) {
    // We don't need to make an external request here since we're injecting 
    // the script directly into the page with the data.
    return document; 
  },
  generateOutput(phoneNumber, nationalNumber, e164Number) {
    const doc = this.queryPhoneInfo(phoneNumber);
    const phoneInfo = this.extractPhoneInfo(doc, phoneNumber);

    // Format the output based on extracted information 
    // You can customize this part to your needs.
    let output = `Phone Number: ${phoneNumber}\n`;
    if (phoneInfo.sourceLabel) {
      output += `Label: ${phoneInfo.sourceLabel}\n`;
    }
    if (phoneInfo.province) {
      output += `Province: ${phoneInfo.province}\n`;
    }
    if (phoneInfo.city) {
      output += `City: ${phoneInfo.city}\n`;
    }
    
    return output; 
  }
};

