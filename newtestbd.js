/**
 * 百度号码查询插件 - 用于查询电话号码信息
 * 此插件可以处理拦截到的数据并提取电话号码相关信息
 */

// 插件基础信息
const pluginInfo = {
  id: 'baidu_phone_search',
  name: '百度号码查询',
  version: '1.80.0',
  description: '通过百度搜索查询电话号码信息',
};

// 预定义标签列表
const predefinedLabels = [
  { label: 'Fraud Scam Likely' },
  { label: 'Spam Likely' },
  { label: 'Telemarketing' },
  { label: 'Robocall' },
  { label: 'Delivery' },
  { label: 'Takeaway' },
  { label: 'Ridesharing' },
  { label: 'Insurance' },
  { label: 'Loan' },
  { label: 'Customer Service' },
  { label: 'Unknown' },
  { label: 'Financial' },
  { label: 'Bank' },
  { label: 'Education' },
  { label: 'Medical' },
  { label: 'Charity' },
  { label: 'Other' },
  { label: 'Debt Collection' },
  { label: 'Survey' },
  { label: 'Political' },
  { label: 'Ecommerce' },
  { label: 'Risk' },
  { label: 'Agent' },
  { label: 'Recruiter' },
  { label: 'Headhunter' },
  { label: 'Silent Call(Voice Clone?)' },
];

// 手动映射
const manualMapping = {
  '中介': 'Agent',             // 含义较广，包括房产中介等
  '房产中介': 'Agent',         // 细化为房地产经纪人
  '违规催收': 'Debt Collection',
  '快递物流': 'Delivery',
  '快递': 'Delivery',
  '教育培训': 'Education',
  '金融': 'Financial',
  '股票证券': 'Financial',   // 统一为金融
  '保险理财': 'Financial',   // 统一为金融
  '涉诈电话': 'Fraud Scam Likely',
  '诈骗': 'Fraud Scam Likely',
  '招聘': 'Recruiter',    // 招聘和猎头很多时候可以合并
  '猎头': 'Headhunter',
  '猎头招聘': 'Headhunter',
  '招聘猎头': 'Headhunter',
  '保险': 'Insurance',
  '保险推销': 'Insurance',
  '贷款理财': 'Loan',   
  '医疗卫生': 'Medical',  
  '其他': 'Other',
  '送餐外卖': 'Takeaway',
  '美团': 'Takeaway',
  '饿了么': 'Takeaway',
  '外卖': 'Takeaway',  
  '滴滴/优步': 'Ridesharing',
  '出租车': 'Ridesharing',
  '网约车': 'Ridesharing',
  '违法': 'Risk',
  '淫秽色情': 'Risk',
  '反动谣言': 'Risk', 
  '发票办证': 'Risk',
  '客服热线': 'Customer Service',
  '非应邀商业电话': 'Spam Likely',
  '广告': 'Spam Likely',
  '骚扰': 'Spam Likely', 
  '骚扰电话': 'Spam Likely', // 骚扰电话很多是诈骗    
  '广告营销': 'Telemarketing',
  '广告推销': 'Telemarketing',
  '旅游推广': 'Telemarketing',
  '食药推销': 'Telemarketing',      
  '推销': 'Telemarketing', 
};

/**
 * 百度电话号码搜索插件类
 */
class BaiduPhoneSearchPlugin {
  constructor() {
    this.debug = true;
    this.lastSearchedPhone = null;
    this.extractedData = {};
    this.pendingPromises = new Map();
  }

  /**
   * 初始化插件
   */
  initialize() {
    this.log('Plugin initializing:', pluginInfo.id);
    
    // 通知Flutter插件已加载
    if (window.flutter_inappwebview) {
      window.flutter_inappwebview.callHandler('TestPageChannel', JSON.stringify({
        type: 'pluginLoaded',
        pluginId: pluginInfo.id,
        info: pluginInfo
      }));
      
      // 通知Flutter插件已准备就绪
      window.flutter_inappwebview.callHandler('TestPageChannel', JSON.stringify({
        type: 'pluginReady',
        pluginId: pluginInfo.id
      }));
    }
    
    this.log('Plugin initialized successfully');
  }

  /**
   * 查询电话号码信息
   * @param {string} phoneNumber - 电话号码
   * @param {string} requestId - 请求ID
   */
  queryPhoneInfo(phoneNumber, requestId) {
    this.log('Querying phone info for:', phoneNumber, 'requestId:', requestId);
    this.lastSearchedPhone = phoneNumber;
    
    // 构建百度搜索URL
    const searchUrl = `https://haoma.baidu.com/phoneSearch?search=${encodeURIComponent(phoneNumber)}`;
    
    // 设置请求头
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      'Referer': 'https://www.baidu.com/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Connection': 'keep-alive',
    };
    
    // 发送请求
    this.sendRequest('GET', searchUrl, headers, requestId);
  }

  /**
   * 发送请求
   * @param {string} method - HTTP方法
   * @param {string} url - 请求URL
   * @param {object} headers - 请求头
   * @param {string} requestId - 请求ID
   */
  sendRequest(method, url, headers, requestId) {
    if (!window.flutter_inappwebview) {
      this.logError('Flutter interface not available');
      return;
    }
    
    try {
      const request = {
        method,
        url,
        headers,
        pluginId: pluginInfo.id,
        requestId
      };
      
      window.flutter_inappwebview.callHandler('RequestChannel', JSON.stringify(request));
    } catch (error) {
      this.logError('Error sending request:', error);
      this.sendPluginError('Failed to send request: ' + error.message, requestId);
    }
  }

  /**
   * 处理响应
   * @param {string|object} jsonData - 响应数据（JSON字符串或对象）
   */
  handleResponse(jsonData) {
    try {
      const response = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const requestId = response.requestId;
      
      this.log('Handling response for request:', requestId);
      
      if (response.error) {
        this.logError('Error in response:', response.error);
        this.sendPluginError(response.error, requestId);
        return;
      }
      
      // 处理HTML响应
      if (response.body && response.body.includes('<html')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(response.body, 'text/html');
        
        // 提取数据
        const extractedData = this.extractDataFromDOM(doc);
        
        if (extractedData && Object.keys(extractedData).length > 0) {
          this.log('Successfully extracted data:', extractedData);
          this.sendPluginResult(extractedData, requestId);
        } else {
          this.log('No data extracted from response');
          this.sendPluginError('No data could be extracted', requestId);
        }
      }
    } catch (error) {
      this.logError('Error handling response:', error);
    }
  }

  /**
   * 处理拦截到的数据
   * @param {string|object} jsonData - 拦截到的数据（JSON字符串或对象）
   */
  handleInterceptedData(jsonData) {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const action = data.action;
      const payload = data.data;
      
      this.log('Received intercepted data:', action);
      
      if (action === 'processHtml' && payload.html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(payload.html, 'text/html');
        
        // 提取数据
        const extractedData = this.extractDataFromDOM(doc);
        
        if (extractedData && Object.keys(extractedData).length > 0) {
          this.log('Successfully extracted data from intercepted HTML:', extractedData);
          
          // 如果有请求ID，发送结果
          if (payload.requestId) {
            this.sendPluginResult(extractedData, payload.requestId);
          }
        }
      }
    } catch (error) {
      this.logError('Error handling intercepted data:', error);
    }
  }

  /**
   * 从DOM中提取数据
   * @param {Document} doc - HTML文档
   * @returns {object} 提取的数据
   */
  extractDataFromDOM(doc) {
    try {
      const result = {};
      
      // 尝试从标准元素中提取数据
      const phoneElement = doc.querySelector('.phone-num');
      const locationElement = doc.querySelector('.location');
      const tagElement = doc.querySelector('.tag');
      const countElement = doc.querySelector('.num');
      
      if (phoneElement) {
        result.phoneNumber = phoneElement.textContent.trim();
      } else {
        result.phoneNumber = this.lastSearchedPhone;
      }
      
      if (locationElement) {
        const locationText = locationElement.textContent.trim();
        const locationParts = locationText.split(' ');
        
        if (locationParts.length >= 2) {
          result.province = locationParts[0];
          result.city = locationParts[1];
        }
        
        // 尝试提取运营商信息
        const carrierMatch = locationText.match(/(移动|联通|电信|虚拟运营商)/);
        if (carrierMatch) {
          result.carrier = carrierMatch[1];
        }
      }
      
      if (tagElement) {
        result.tag = tagElement.textContent.trim();
      }
      
      if (countElement) {
        const countText = countElement.textContent.trim();
        const countMatch = countText.match(/\d+/);
        if (countMatch) {
          result.count = parseInt(countMatch[0], 10);
        }
      }
      
      // 如果标准元素没有找到，尝试从其他元素中提取
      if (!result.tag || !result.carrier) {
        const containers = doc.querySelectorAll('.c-container');
        
        for (let i = 0; i < containers.length; i++) {
          const container = containers[i];
          const text = container.textContent;
          
          // 尝试提取标签
          if (!result.tag) {
            for (const label of predefinedLabels) {
              if (text.includes(label.label)) {
                result.tag = label.label;
                break;
              }
            }
            
            // 如果没有匹配到预定义标签，尝试使用手动映射
            if (!result.tag) {
              for (const key in manualMapping) {
                if (text.includes(key)) {
                  result.tag = manualMapping[key];
                  break;
                }
              }
            }
          }
          
          // 尝试提取运营商信息
          if (!result.carrier) {
            const carrierMatch = text.match(/(移动|联通|电信|虚拟运营商)/);
            if (carrierMatch) {
              result.carrier = carrierMatch[1];
            }
          }
          
          // 如果已经提取到足够的信息，跳出循环
          if (result.tag && result.carrier) {
            break;
          }
        }
      }
      
      return result;
    } catch (error) {
      this.logError('Error extracting data from DOM:', error);
      return {};
    }
  }

  /**
   * 生成输出
   * @param {string} phoneNumber - 电话号码
   * @param {string} nationalNumber - 国内格式号码
   * @param {string} e164Number - E164格式号码
   * @param {string} requestId - 请求ID
   */
  generateOutput(phoneNumber, nationalNumber, e164Number, requestId) { 
    this.log('generateOutput called with:', phoneNumber, requestId); 
    
    try { 
      // 清空之前的数据 
      this.extractedData = {}; 
      
      // 查询各种格式的电话号码信息 
      // Call queryPhoneInfo for each number format, passing the requestId 
      if (phoneNumber) { 
          this.queryPhoneInfo(phoneNumber, requestId); 
      } 
      if (nationalNumber) { 
          this.queryPhoneInfo(nationalNumber, requestId); 
      } 
      if (e164Number) { 
          this.queryPhoneInfo(e164Number, requestId); 
      } 
    } catch (error) { 
      this.logError('Error generating output:', error); 
      this.sendPluginError('Failed to generate output: ' + error.message, requestId); 
    } 
  }

  /**
   * 发送插件结果到Flutter
   * @param {object} result - 结果数据
   * @param {string} requestId - 请求ID
   */
  sendPluginResult(result, requestId) {
    if (!window.flutter_inappwebview) {
      this.logError('Flutter interface not available');
      return;
    }
    
    try {
      const response = {
        type: 'result',
        pluginId: pluginInfo.id,
        requestId: requestId,
        result,
        timestamp: Date.now()
      };
      
      window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify(response));
    } catch (error) {
      this.logError('Error sending result:', error);
    }
  }

  /**
   * 发送插件错误到Flutter
   * @param {string} errorMessage - 错误消息
   * @param {string} requestId - 请求ID
   */
  sendPluginError(errorMessage, requestId) {
    if (!window.flutter_inappwebview) {
      this.logError('Flutter interface not available');
      return;
    }
    
    try {
      const response = {
        type: 'error',
        pluginId: pluginInfo.id,
        requestId: requestId,
        error: errorMessage,
        timestamp: Date.now()
      };
      
      window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify(response));
    } catch (error) {
      this.logError('Error sending error:', error);
    }
  }

  /**
   * 记录日志
   * @param {...any} args - 日志参数
   */
  log(...args) {
    if (this.debug) {
      console.log(`[${pluginInfo.id}]`, ...args);
    }
  }

  /**
   * 记录错误
   * @param {...any} args - 错误参数
   */
  logError(...args) {
    console.error(`[${pluginInfo.id}]`, ...args);
  }
}

// 创建插件实例
const pluginInstance = new BaiduPhoneSearchPlugin();

// 初始化插件
function initializePlugin() {
  pluginInstance.initialize();
  return pluginInstance;
}

// 将插件注册到全局对象
if (!window.plugin) {
  window.plugin = {};
}

// 注册插件
window.plugin[pluginInfo.id] = initializePlugin();

// 通知Flutter插件已加载
console.log(`Plugin ${pluginInfo.id} loaded successfully`);
