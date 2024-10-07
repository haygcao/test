document.addEventListener('DOMContentLoaded', (event) => {
  // 使用 DOMParser 解析 HTML 字符串
  const parser = new DOMParser();
  const doc = parser.parseFromString('<html><head></head><body></body></html>', 'text/html');

  // 创建 <script> 标签并设置 src 属性
  const axiosScript = doc.createElement('script');
  axiosScript.src = 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js';

  const cheerioScript = doc.createElement('script');
  cheerioScript.src = 'https://cdn.jsdelivr.net/npm/cheerio/cheerio.min.js';

  // 将 <script> 标签添加到 <head> 元素中
  doc.head.appendChild(axiosScript);
  doc.head.appendChild(cheerioScript);

  // 等待 axios 和 cheerio 加载完成
  axiosScript.onload = () => {
    cheerioScript.onload = () => {
  // 提取百度数据
function extractBaiduData(doc, phoneNumber) {
  const jsonObject = {
    count: 0,
    sourceLabel: "",
    province: "",
    city: "",
    carrier: ""
  };

  try {
    // 更新后的选择器
    const sourceElement = doc.querySelector('.op_fraudphone_word a');
    const descElement = doc.querySelector('.op_fraudphone_word');
    const titleElement = doc.querySelector('.c-span22.c-span-last .cc-title_31ypU'); // 标题元素
    const locationElement = doc.querySelector('.c-span22.c-span-last .cc-row_dDm_G'); // 位置元素

    if (descElement != null) {
      const descText = descElement.text.trim();
      const countMatch = RegExp(r'被(\d+)个').firstMatch(descText);
      if (countMatch != null) {
        jsonObject.count = parseInt(countMatch.group(1), 10);
      }
    }

    jsonObject.sourceLabel = titleElement ? titleElement.textContent.trim() : ''; // 从标题元素提取 sourceLabel
    jsonObject.province = locationElement ? locationElement.textContent.trim().split(' ')[0] : ''; 
    jsonObject.city = locationElement ? locationElement.textContent.trim().split(' ')[1] : '';
    jsonObject.carrier = ''; 
    jsonObject.phoneNumber = phoneNumber;
    console.log('Information extracted:', jsonObject);
    return jsonObject;
  } catch (e) {
    console.error('Error querying phone info:', e);
    throw e;
  }
}

  // 插件接口
  async function queryPhoneNumber(phoneNumber) {
    // 循环检查 axios 和 cheerio 是否已经加载完成
    while (!window.axios || !window.cheerio) {
      await new Promise(resolve => setTimeout(resolve, 100)); // 等待 100 毫秒
    }

    // axios 和 cheerio 已经加载完成，可以安全地使用它们
    const response = await axios.get(`https://www.baidu.com/s?wd=${phoneNumber}`);

    if (response.status === 200) {
      const html = response.data;
      const $ = cheerio.load(html);
      return extractBaiduData($, phoneNumber);
    } else {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

// 导出插件实例
const plugin = {
  platform: "百度号码查询插件",
  version: "1.0.0",
  queryPhoneNumber
};

// 通知 Flutter 应用插件已加载
window.FlutterChannel.postMessage('Plugin loaded'); 
    };
  };

  // 将解析后的 HTML 代码写入 WebView
  document.body.innerHTML = doc.body.innerHTML;
});
