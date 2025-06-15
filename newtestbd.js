/**
 * 百度号码查询插件 - 用于查询电话号码信息
 * 此插件可以处理拦截到的数据并提取电话号码相关信息
 */

// 插件基础信息
const pluginInfo = {
  id: 'baidu_phone_search',
  name: '百度号码查询',
  version: '1.11.0',
  description: '通过百度搜索查询电话号码信息',
};


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

// 手动映射
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Referer': ' https://www.baidu.com/ ',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
};

// 插件类
class BaiduPhoneSearchPlugin {
  constructor() {
    this.pendingRequests = {}; // 存储待处理的请求
    this.requestCounter = 0;   // 请求计数器
    this.initialized = false;  // 初始化状态
    this.debug = true;         // 调试模式
    this.lastSearchedPhone = null; // 最后搜索的电话号码
    this.extractedData = {};   // 存储提取的数据
  }



  
  /**
   * 初始化插件
   */
  initialize() {
    if (this.initialized) {
      return;
    }
    
    this.log('Plugin initializing:', pluginInfo.id);
    
    // 通知Flutter插件已加载
    if (window.flutter_inappwebview) {
      window.flutter_inappwebview.callHandler('TestPageChannel', JSON.stringify({
        type: 'pluginLoaded',
        pluginId: pluginInfo.id,
        info: pluginInfo
      }));
    }
    
    // 添加百度API请求处理
    this.setupBaiduApiRequestHandler();
    
    this.initialized = true;
    this.log('Plugin initialized successfully');
  }
  
  /**
   * 设置百度API请求处理器
   * 处理特定百度API的请求，如miao.baidu.com/abdr和banti.baidu.com/dr
   */
  setupBaiduApiRequestHandler() {
    this.log('Setting up Baidu API request handler');
    
    // 在页面加载完成后执行，确保不会干扰其他脚本
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.injectBaiduApiHandler());
    } else {
      // 如果页面已经加载完成，直接执行
      this.injectBaiduApiHandler();
    }
  }
  
  /**
   * 注入百度API处理脚本
   */
  injectBaiduApiHandler() {
    this.log('Injecting Baidu API handler script');
    
    try {
      // 创建并注入处理脚本
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.textContent = `
      (function() {
        console.log('[BaiduAPI] 初始化百度API请求处理');
        
        // 保存原始的XMLHttpRequest方法
        var originalOpen = XMLHttpRequest.prototype.open;
        var originalSend = XMLHttpRequest.prototype.send;
        
        // 重写open方法，记录URL和方法
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
          this._baiduApiUrl = url;
          this._baiduApiMethod = method;
          return originalOpen.apply(this, [method, url, async, user, password]);
        };
        
        // 重写send方法，为特定请求添加头信息
        XMLHttpRequest.prototype.send = function(body) {
          // 检查是否是百度特定API请求
          if (this._baiduApiUrl && (
              this._baiduApiUrl.includes('miao.baidu.com/abdr') || 
              this._baiduApiUrl.includes('banti.baidu.com/dr'))) {
            
            console.log('[BaiduAPI] 处理百度特殊API请求:', this._baiduApiUrl);
            
            try {
              // 只添加安全的请求头，避免设置不安全的头信息
              this.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
              this.setRequestHeader('Accept', '*/*');
              
              // 设置内容类型
              if (this._baiduApiMethod === 'POST') {
                this.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                
                // 记录请求体，便于调试
                if (body) {
                  console.log('[BaiduAPI] 请求体:', body);
                }
              }
              
              console.log('[BaiduAPI] 已添加安全请求头');
            } catch (e) {
              console.error('[BaiduAPI] 添加请求头失败:', e);
            }
          }
          
          // 调用原始send方法
          return originalSend.apply(this, arguments);
        };
        
        // 使用MutationObserver替代已弃用的DOMSubtreeModified事件
        // 监听DOM变化，处理动态加载的内容
        const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach(function(node) {
                // 检查是否添加了新的脚本元素
                if (node.nodeName === 'SCRIPT') {
                  console.log('[BaiduAPI] 检测到新脚本:', node.src || '内联脚本');
                }
              });
            }
          });
        });
        
        // 配置观察选项
        const config = { childList: true, subtree: true };
        
        // 开始观察文档
        observer.observe(document, config);
        
        console.log('[BaiduAPI] 百度API请求处理已初始化');
      })();
      `;
      
      // 将脚本添加到文档中
      document.head.appendChild(script);
      this.log('Baidu API handler script injected successfully');
    } catch (error) {
      this.logError('Error injecting Baidu API handler script:', error);
    }
  }

  /**
   * 查询电话号码信息
   * @param {string} phoneNumber - 电话号码
   * @param {string} requestId - 请求ID
   */
  queryPhoneInfo(phoneNumber, requestId) {
    this.log('Querying phone info for:', phoneNumber);
    this.lastSearchedPhone = phoneNumber;
    
    // 构建百度搜索URL
    const searchUrl = `https://haoma.baidu.com/phoneSearch?search=${encodeURIComponent(phoneNumber)}`;
    
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
    this.log('接收到来自 Flutter 的响应数据:', jsonData); // 添加这行日志
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
        this.processHtml({ html: response.body, url: response.url });
      }
      // 处理JSON响应
      else if (response.body && response.body.startsWith('{')) {
        try {
          const jsonData = JSON.parse(response.body);
          this.processJsonResponse(response.url, jsonData, requestId);
        } catch (e) {
          this.logError('Error parsing JSON response:', e);
        }
      }
      
      // 如果已经提取到数据，发送结果
      if (Object.keys(this.extractedData).length > 0) {
        this.sendPluginResult(this.extractedData, requestId);
        this.extractedData = {}; // 重置提取的数据
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
      
      switch (action) {
        case 'processHtml':
          this.processHtml(payload);
          break;
        case 'processScript':
          this.processScript(payload);
          break;
        case 'processNetworkResponse':
          this.processNetworkResponse(payload);
          break;
        default:
          this.log('Unknown action:', action);
      }
    } catch (error) {
      this.logError('Error handling intercepted data:', error);
    }
  }

  /**
   * 处理HTML内容
   * @param {object} data - HTML数据
   */
  processHtml(data) {
    this.log('Processing HTML from:', data.url);
    
    try {
      // 创建一个临时的DOM解析器
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.html, 'text/html');
      
      // 处理HTML中的脚本
      this.handleDynamicScripts(doc);
      
      // 提取数据
      const extractedData = this.extractDataFromDOM(doc);
      
      // 如果有提取到数据，保存结果
      if (extractedData && Object.keys(extractedData).length > 0) {
        this.extractedData = { ...this.extractedData, ...extractedData };
      }
    } catch (error) {
      this.logError('Error processing HTML:', error);
    }
  }

  /**
   * 处理脚本内容
   * @param {object} data - 脚本数据
   */
  processScript(data) {
    this.log('Processing script' + (data.isExternal ? ' from: ' + data.url : ' (inline)'));
    
    try {
      // 分析脚本内容，查找有用的数据
      const scriptContent = data.content;
      
      // 查找JSON数据
      this.extractJsonFromScript(scriptContent);
      
      // 查找变量赋值
      this.extractVariablesFromScript(scriptContent);
    } catch (error) {
      this.logError('Error processing script:', error);
    }
  }

  /**
   * 处理网络响应
   * @param {object} data - 网络响应数据
   */
  processNetworkResponse(data) {
    this.log('Processing network response from:', data.url);
    
    try {
      const url = data.url;
      const content = data.content;
      
      // 如果是JSON响应
      if (data.responseType === 'json' || (content && content.trim().startsWith('{'))) {
        try {
          const jsonData = typeof content === 'string' ? JSON.parse(content) : content;
          this.processJsonResponse(url, jsonData);
        } catch (e) {
          this.logError('Error parsing JSON response:', e);
        }
      }
      // 如果是HTML响应
      else if (data.responseType === 'text/html' || (content && content.includes('<html'))) {
        this.processHtml({ url, html: content });
      }
    } catch (error) {
      this.logError('Error processing network response:', error);
    }
  }

  /**
   * 处理JSON响应
   * @param {string} url - 响应URL
   * @param {object} jsonData - JSON数据
   * @param {string} requestId - 请求ID
   */
  processJsonResponse(url, jsonData, requestId) {
    this.log('Processing JSON response from:', url);
    
    try {
      // 检查是否包含电话号码信息
      if (jsonData.data && jsonData.data.phoneInfo) {
        const phoneInfo = jsonData.data.phoneInfo;
        
        // 提取电话号码信息
        const extractedData = {
          phoneNumber: this.lastSearchedPhone,
          province: phoneInfo.province || '',
          city: phoneInfo.city || '',
          carrier: phoneInfo.operator || '',
          type: phoneInfo.type || '',
          tag: phoneInfo.tag || '',
          count: phoneInfo.count || 0
        };
        
        // 翻译省份和城市
        if (extractedData.province && manualMapping[extractedData.province]) {
          extractedData.provinceEn = manualMapping[extractedData.province];
        }
        
        if (extractedData.city && manualMapping[extractedData.city]) {
          extractedData.cityEn = manualMapping[extractedData.city];
        }
        
        if (extractedData.carrier && manualMapping[extractedData.carrier]) {
          extractedData.carrierEn = manualMapping[extractedData.carrier];
        }
        
        // 翻译标签
        if (extractedData.tag && predefinedLabels[extractedData.tag]) {
          extractedData.tagEn = predefinedLabels[extractedData.tag];
        }
        
        // 保存提取的数据
        this.extractedData = { ...this.extractedData, ...extractedData };
        
        // 如果有请求ID，直接发送结果
        if (requestId) {
          this.sendPluginResult(this.extractedData, requestId);
          this.extractedData = {}; // 重置提取的数据
        }
      }
    } catch (error) {
      this.logError('Error processing JSON response:', error);
    }
  }

  /**
   * 从脚本中提取JSON数据
   * @param {string} scriptContent - 脚本内容
   */
  extractJsonFromScript(scriptContent) {
    try {
      // 查找可能的JSON对象定义
      const jsonRegex = /(?:const|let|var)\s+([\w]+)\s*=\s*(\{[\s\S]*?\});/g;
      let match;
      
      while ((match = jsonRegex.exec(scriptContent)) !== null) {
        const variableName = match[1];
        const jsonString = match[2];
        
        try {
          // 尝试解析JSON
          const jsonData = eval('(' + jsonString + ')');
          this.log('Found JSON data in variable:', variableName);
          
          // 检查是否包含电话号码信息
          if (variableName === 'phoneInfo' || variableName.includes('phone') || variableName.includes('Phone')) {
            this.processExtractedJson(variableName, jsonData);
          }
        } catch (e) {
          // 不是有效的JSON，忽略
        }
      }
    } catch (error) {
      this.logError('Error extracting JSON from script:', error);
    }
  }

  /**
   * 处理从脚本中提取的JSON数据
   * @param {string} variableName - 变量名
   * @param {object} jsonData - JSON数据
   */
  processExtractedJson(variableName, jsonData) {
    this.log('Processing extracted JSON from variable:', variableName);
    
    try {
      // 检查是否包含电话号码信息
      if (jsonData.province || jsonData.city || jsonData.operator || jsonData.type) {
        // 提取电话号码信息
        const extractedData = {
          phoneNumber: this.lastSearchedPhone,
          province: jsonData.province || '',
          city: jsonData.city || '',
          carrier: jsonData.operator || '',
          type: jsonData.type || '',
          tag: jsonData.tag || '',
          count: jsonData.count || 0
        };
        
                                                           
        // 保存提取的数据
        this.extractedData = { ...this.extractedData, ...extractedData };
      }
    } catch (error) {
      this.logError('Error processing extracted JSON:', error);
    }
  }

  /**
   * 处理动态脚本
   * @param {Document} doc - HTML文档
   */
  handleDynamicScripts(doc) {
    try {
      // 查找所有脚本元素
      const scripts = doc.querySelectorAll('script');
      
      // 收集脚本内容和URL
      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        
        // 外部脚本
        if (script.src) {
          // 检查是否是本地文件路径，如果是则跳过
          if (script.src && (script.src.startsWith('/c:') || script.src.startsWith('c:') || script.src.includes('resource_interceptor.dart'))) {
            this.log('跳过本地文件路径脚本:', script.src);
            continue;
          }
          this.fetchExternalScript(script.src);
        }
        // 内联脚本
        else if (script.textContent && script.textContent.trim()) {
          this.processScript({
            isExternal: false,
            content: script.textContent
          });
        }
      }
    } catch (error) {
      this.logError('Error handling dynamic scripts:', error);
    }
  }

  /**
   * 获取外部脚本
   * @param {string} url - 脚本URL
   */
  fetchExternalScript(url) {
    // 检查是否是本地文件路径，如果是则跳过
    if (url && (url.startsWith('/c:') || url.startsWith('c:') || url.includes('resource_interceptor.dart'))) {
      this.log('跳过本地文件路径脚本请求:', url);
      return;
    }
    
    this.log('Fetching external script:', url);
    
    // 创建一个请求ID
    const requestId = this.generateRequestId();
    
    // 发送请求到Flutter
    this.sendRequest('GET', url, {}, requestId);
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
          
          // 翻译运营商
          if (result.carrier && manualMapping[result.carrier]) {
            result.carrierEn = manualMapping[result.carrier];
          }
        }
      }
      
      if (tagElement) {
        result.tag = tagElement.textContent.trim();
        
    
    
    
    
      }
      
      if (countElement) {
        const countText = countElement.textContent.trim();
        const countMatch = countText.match(/(\d+)/);
        if (countMatch) {
          result.count = parseInt(countMatch[1], 10);
        }
      }
      
      // 如果标准元素没有找到，尝试从其他元素中提取
      if (!locationElement && !tagElement) {
        const containers = doc.querySelectorAll('.c-container');
        
        for (let i = 0; i < containers.length; i++) {
          const container = containers[i];
          const text = container.textContent;
          
          // 尝试提取标签
          for (const label in predefinedLabels) {
            if (text.includes(label)) {
              result.tag = label;
              result.tagEn = predefinedLabels[label];
              break;
            }
          }
          
          // 尝试提取位置信息
          for (const location in manualMapping) {
            if (text.includes(location) && location.length > 1) { // 避免匹配单个字符
              if (!result.province) {
                result.province = location;
                result.provinceEn = manualMapping[location];
              } else if (!result.city && location !== result.province) {
                result.city = location;
                result.cityEn = manualMapping[location];
              }
            }
          }
          
          // 尝试提取运营商信息
          const carrierMatch = text.match(/(移动|联通|电信|虚拟运营商)/);
          if (carrierMatch && !result.carrier) {
            result.carrier = carrierMatch[1];
            result.carrierEn = manualMapping[carrierMatch[1]];
          }
          
          // 如果已经提取到足够的信息，跳出循环
          if (result.tag && result.province && result.city && result.carrier) {
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
   * 格式化电话号码
   * @param {string} phoneNumber - 电话号码
   * @returns {string} 格式化后的电话号码
   */
  formatPhoneNumber(phoneNumber) {
    // 移除所有非数字字符
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // 如果是中国手机号码（以1开头的11位数字）
    if (/^1\d{10}$/.test(cleaned)) {
      return cleaned;
    }
    
    // 如果是中国固定电话（区号+号码，通常是10-12位）
    if (cleaned.length >= 10 && cleaned.length <= 12) {
      // 如果以0开头（区号通常以0开头）
      if (cleaned.startsWith('0')) {
        return cleaned;
      }
    }
    
    // 其他情况，直接返回清理后的号码
    return cleaned;
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
   * 生成请求ID
   * @returns {string} 请求ID
   */
  generateRequestId() {
    return pluginInfo.id + '_' + (++this.requestCounter) + '_' + Date.now();
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
