// 加载 axios 库
const axiosScript = document.createElement('script');
axiosScript.src = 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js';
document.head.appendChild(axiosScript);

// 加载 cheerio 库
const cheerioScript = document.createElement('script');
cheerioScript.src = 'https://cdn.jsdelivr.net/npm/cheerio/cheerio.min.js';
document.head.appendChild(cheerioScript);

// 等待库加载完成
Promise.all([
  new Promise(resolve => axiosScript.onload = resolve),
  new Promise(resolve => cheerioScript.onload = resolve)
]).then(() => {
  // 定义插件对象
  const plugin = {
    queryPhoneNumber: async function(phoneNumber) {
      try {
        // 使用 axios 发送请求
        const response = await axios.get(`https://www.baidu.com/s?wd=${phoneNumber}`);
        
        if (response.status === 200) {
          const html = response.data;
          // 使用 cheerio 解析 HTML
          const $ = cheerio.load(html);
          
          return this.extractBaiduData($, phoneNumber);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.error('Error in queryPhoneNumber:', error);
        throw error;
      }
    },
    
    extractBaiduData: function($, phoneNumber) {
      const jsonObject = {
        count: 0,
        sourceLabel: "",
        province: "",
        city: "",
        carrier: "",
        phoneNumber: phoneNumber
      };

      try {
        const descElement = $('.op_fraudphone_word');
        const titleElement = $('.c-span22.c-span-last .cc-title_31ypU');
        const locationElement = $('.c-span22.c-span-last .cc-row_dDm_G');

        if (descElement.length) {
          const descText = descElement.text().trim();
          const countMatch = descText.match(/被(\d+)个/);
          if (countMatch) {
            jsonObject.count = parseInt(countMatch[1], 10);
          }
        }

        jsonObject.sourceLabel = titleElement.length ? titleElement.text().trim() : '';
        
        if (locationElement.length) {
          const locationParts = locationElement.text().trim().split(' ');
          jsonObject.province = locationParts[0] || '';
          jsonObject.city = locationParts[1] || '';
        }

        console.log('Information extracted:', jsonObject);
        return jsonObject;
      } catch (e) {
        console.error('Error extracting Baidu data:', e);
        throw e;
      }
    }
  };

  // 插件元数据
  plugin.meta = {
    platform: "百度号码查询插件",
    version: "1.0.0"
  };

  // 通知 Flutter 应用插件已加载
  if (typeof FlutterChannel !== 'undefined') {
    FlutterChannel.postMessage('Plugin loaded');
  } else {
    console.error('FlutterChannel is not defined');
  }

  // 将插件对象暴露给全局作用域
  window.plugin = plugin;
});
