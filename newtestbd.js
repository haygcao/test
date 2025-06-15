/**
 * 百度号码查询插件 - 用于查询电话号码信息
 * 此插件可以处理拦截到的数据并提取电话号码相关信息
 */

// 插件基础信息
const pluginInfo = {
  id: 'baidu_phone_search',
  name: '百度号码查询',
  version: '1.25.0',
  description: '通过百度搜索查询电话号码信息',
};


const predefinedLabels = {
  '诈骗': 'Scam',
  '骚扰': 'Harassment',
  '广告推销': 'Telemarketing',
  '快递送餐': 'Delivery',
  '房产中介': 'Real Estate',
  '招聘': 'Recruitment',
  '金融理财': 'Finance',
  '违法': 'Illegal',
  '教育培训': 'Education',
  '快递': 'Delivery',
  '送餐': 'Food Delivery',
  '外卖': 'Food Delivery',
  '中介': 'Agency',
  '房产': 'Real Estate',
  '理财': 'Finance',
  '贷款': 'Loan',
  '保险': 'Insurance',
  '催收': 'Debt Collection',
  '销售': 'Sales',
  '客服': 'Customer Service',
  '商家': 'Business',
  '公司': 'Company',
  '银行': 'Bank',
  '中国移动': 'China Mobile',
  '中国联通': 'China Unicom',
  '中国电信': 'China Telecom',
  '移动': 'Mobile',
  '联通': 'Unicom',
  '电信': 'Telecom',
  '虚拟运营商': 'MVNO',
  '食药推销': 'Telemarketing',      
  '推销': 'Telemarketing', 
};












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
        
        // 重写open方法，处理本地文件路径请求和百度特定API请求
        XMLHttpRequest.prototype.open = function(method, url, async, username, password) {
          // 检查是否是本地文件路径请求
          if (url && (url.startsWith('/c:') || url.startsWith('c:') || url.includes('resource_interceptor.dart') || url.includes('file://'))) {
            console.log('[BaiduAPI] 跳过本地文件路径请求:', url);
            // 不修改本地文件路径请求
          } 
          // 检查是否是百度特定API请求
          else if (url && (url.includes('miao.baidu.com/abdr') || url.includes('banti.baidu.com/dr'))) {
            console.log('[BaiduAPI] 处理百度特定API请求:', url);
            
            // 修复URL参数编码问题
            try {
              // 解析URL
              const urlObj = new URL(url);
              const oParam = urlObj.searchParams.get('_o');
              
              if (oParam) {
                // 重新编码 _o 参数，确保它是有效的 URL 编码
                const decodedOParam = decodeURIComponent(oParam);
                const reEncodedOParam = encodeURIComponent(decodedOParam);
                
                // 更新 URL 中的参数
                urlObj.searchParams.set('_o', reEncodedOParam);
                
                // 更新URL
                url = urlObj.toString();
                console.log('[BaiduAPI] 修复后的 URL:', url);
              }
            } catch (e) {
              console.error('[BaiduAPI] 修复URL编码时出错:', e);
            }
            
            // 设置withCredentials为false，避免CORS错误
            this.withCredentials = false;
            console.log('[BaiduAPI] 已设置withCredentials=false');
          }
          
          // 记录请求信息，便于调试
          console.log('[BaiduAPI] 请求方法:', method);
          console.log('[BaiduAPI] 异步模式:', async !== false);
          
          // 保存原始URL和方法，用于后续处理
          this._baiduApiUrl = url;
          this._baiduApiMethod = method;
          
          // 调用原始open方法
          try {
            return originalOpen.apply(this, arguments);
          } catch (e) {
            console.error('[BaiduAPI] 打开请求失败:', e);
            throw e; // 重新抛出异常，保持原有行为
          }
        };
        
        // 重写send方法，为特定请求添加头信息
        XMLHttpRequest.prototype.send = function(body) {
          // 检查是否是百度特定API请求
          if (this._baiduApiUrl && (
              this._baiduApiUrl.includes('miao.baidu.com/abdr') || 
              this._baiduApiUrl.includes('banti.baidu.com/dr'))) {
            
            console.log('[BaiduAPI] 处理百度特殊API请求:', this._baiduApiUrl);
            
            // 处理请求体，修复可能导致400 Bad Request的格式问题
            if (body && typeof body === 'string') {
              // 对字符串类型的body进行trim处理
              body = body.trim();
              console.log('[BaiduAPI] 处理后的请求体:', body);
            }
            
            try {
              // 添加必要的请求头，确保与sendRequest方法中的请求头完全一致
              this.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
              this.setRequestHeader('Accept', '*/*');
              this.setRequestHeader('Origin', 'https://haoma.baidu.com');
              this.setRequestHeader('Referer', 'https://haoma.baidu.com/');
              this.setRequestHeader('Connection', 'keep-alive');
              this.setRequestHeader('Cache-Control', 'no-cache');
              this.setRequestHeader('Pragma', 'no-cache');
              
              // 设置User-Agent，模拟浏览器
              try {
                this.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
              } catch (e) {
                // 某些浏览器不允许设置User-Agent，忽略错误
                console.log('[BaiduAPI] 无法设置User-Agent头');
              }
              
              // 设置内容类型
              if (this._baiduApiMethod === 'POST') {
                this.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                
                // 特殊处理banti.baidu.com/dr的POST请求
                if (this._baiduApiUrl.includes('banti.baidu.com/dr')) {
                  console.log('[BaiduAPI] 特殊处理banti.baidu.com/dr的POST请求');
                  // 确保有正确的Content-Type和Origin
                  this.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                  this.setRequestHeader('Origin', 'https://haoma.baidu.com');
                  this.setRequestHeader('Referer', 'https://haoma.baidu.com/');
                }
                
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
          
          // 调用原始send方法，使用更健壮的错误处理
          try {
            // 优先使用call方法，传递body参数
            return originalSend.call(this, body);
          } catch (e) {
            console.error('[BaiduAPI] 使用call发送请求失败:', e);
            
            try {
              // 如果call失败，尝试使用apply方法
              return originalSend.apply(this, arguments);
            } catch (e2) {
              console.error('[BaiduAPI] 使用apply发送请求也失败:', e2);
              throw e2; // 重新抛出异常，保持原有行为
            }
          }
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
   * @param {boolean} isBaiduApi - 是否是百度API请求
   */
  sendRequest(method, url, headers, requestId, isBaiduApi = false) {
    if (!window.flutter_inappwebview) {
      this.logError('Flutter interface not available');
      return;
    }
    
    // 检查是否是本地文件路径，如果是则不发送请求
    if (url && (url.startsWith('/c:') || url.startsWith('c:') || url.includes('resource_interceptor.dart') || url.includes('file://'))) {
      this.log('跳过本地文件路径请求:', url);
      this.sendPluginError('本地文件路径请求已被跳过: ' + url, requestId);
      return;
    }
    
    // 检查是否是百度API请求
    if (!isBaiduApi && (url.includes('miao.baidu.com') || url.includes('banti.baidu.com'))) {
      isBaiduApi = true;
    }
    
    // 如果是百度API请求，添加特殊处理
    if (isBaiduApi) {
      this.log('处理百度API请求:', url);
      
      // 确保headers对象存在
      headers = headers || {};
      
      // 添加必要的请求头
      headers['X-Requested-With'] = 'XMLHttpRequest';
      headers['Accept'] = '*/*';
      headers['Origin'] = 'https://haoma.baidu.com';
      headers['Referer'] = 'https://haoma.baidu.com/';
      headers['Connection'] = 'keep-alive';
      headers['Cache-Control'] = 'no-cache';
      headers['Pragma'] = 'no-cache';
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      // 如果是POST请求，设置Content-Type
      if (method === 'POST') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
      
      // 特殊处理banti.baidu.com/dr的POST请求
      if (url.includes('banti.baidu.com/dr') && method === 'POST') {
        this.log('特殊处理banti.baidu.com/dr的POST请求');
        // 确保有正确的Content-Type和Origin
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        headers['Origin'] = 'https://haoma.baidu.com';
        headers['Referer'] = 'https://haoma.baidu.com/';
      }
    }
    
    try {
      // 如果是百度API请求，使用特殊请求通道发送请求，避免CORS问题
      if (isBaiduApi) {
        this.log('使用特殊请求通道发送百度API请求:', url);
        this.sendSpecialRequest(
          url,
          method,
          headers,
          null, // 大多数百度API请求是GET请求，没有请求体
          requestId
        );
        
        // 记录这是一个百度API请求
        this.pendingRequests[requestId] = {
          isBaiduApi: true,
          url: url
        };
      } else {
        // 对于非百度API请求，继续使用常规请求通道
        const request = {
          method,
          url,
          headers,
          pluginId: pluginInfo.id,
          requestId
        };
        
        this.log('发送常规请求:', url);
        window.flutter_inappwebview.callHandler('RequestChannel', JSON.stringify(request));
      }
    } catch (error) {
      this.logError('Error sending request:', error);
      this.sendPluginError('Failed to send request: ' + error.message, requestId);
      
      // 如果是百度API请求，尝试使用备用方法
      if (isBaiduApi && this.lastSearchedPhone) {
        this.tryBaiduApiFallback(this.lastSearchedPhone);
      }
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
      
      // 检查是否是百度API请求
      let isBaiduApi = response.isBaiduApi || 
                      (response.url && (response.url.includes('miao.baidu.com') || 
                                       response.url.includes('banti.baidu.com')));
      
      // 检查是否是特殊请求的响应
      const pendingRequest = this.pendingRequests[requestId];
      if (pendingRequest) {
        if (pendingRequest.isBaiduApi) {
          isBaiduApi = true;
        }
        
        // 如果是备用请求，获取电话号码
        if (pendingRequest.isFallback && pendingRequest.phoneNumber) {
          this.lastSearchedPhone = pendingRequest.phoneNumber;
        }
        
        // 处理完成后删除挂起的请求
        delete this.pendingRequests[requestId];
      }
      
      if (isBaiduApi) {
        this.log('处理百度API响应:', response.url);
      }
      
      if (response.error) {
        this.logError('Error in response:', response.error);
        this.sendPluginError(response.error, requestId);
        
        // 如果是百度API请求且出错，尝试使用备用方法
        if (isBaiduApi && this.lastSearchedPhone) {
          this.log('百度API请求失败，尝试使用备用方法');
          this.tryBaiduApiFallback(this.lastSearchedPhone);
        }
        
        return;
      }
      
      // 处理HTML响应
      if (response.body && response.body.includes('<html')) {
        this.processHtml({ html: response.body, url: response.url, isBaiduApi });
      }
      // 处理JSON响应
      else if (response.body && (response.body.startsWith('{') || response.body.startsWith('['))) {
        try {
          const jsonData = JSON.parse(response.body);
          this.processJsonResponse(response.url, jsonData, requestId, isBaiduApi);
        } catch (e) {
          this.logError('Error parsing JSON response:', e);
          
          // 如果是百度API请求且JSON解析失败，尝试特殊处理
          if (isBaiduApi) {
            this.log('百度API JSON解析失败，尝试特殊处理');
            this.processBaiduApiRawResponse(response.url, response.body, requestId);
          }
        }
      }
      // 处理其他类型的响应
      else if (response.body) {
        // 如果是百度API请求，尝试特殊处理
        if (isBaiduApi) {
          this.log('百度API未知格式响应，尝试特殊处理');
          this.processBaiduApiRawResponse(response.url, response.body, requestId);
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
    this.log(`Processing HTML from: ${data.url}${data.isBaiduApi ? ' (百度API)' : ''}`);
    
    try {
      // 检查是否是百度API请求
      const isBaiduApi = data.isBaiduApi || 
                        (data.url && (data.url.includes('miao.baidu.com') || 
                                     data.url.includes('banti.baidu.com')));
      
      if (isBaiduApi && !data.isBaiduApi) {
        this.log('检测到百度API HTML响应');
      }
      
      // 创建一个临时的DOM解析器
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.html, 'text/html');
      
      // 处理HTML中的脚本
      this.handleDynamicScripts(doc, isBaiduApi);
      
      // 提取数据
      const extractedData = this.extractDataFromDOM(doc, isBaiduApi);
      
      // 如果有提取到数据，保存结果
      if (extractedData && Object.keys(extractedData).length > 0) {
        this.extractedData = { ...this.extractedData, ...extractedData };
        
        // 如果是百度API请求且有请求ID，直接发送结果
        if (isBaiduApi && data.requestId) {
          this.sendPluginResult(this.extractedData, data.requestId);
          this.extractedData = {}; // 重置提取的数据
        }
      } else if (isBaiduApi && data.requestId) {
        // 如果是百度API请求但未能提取到数据，尝试使用原始响应处理
        this.log('未能从HTML中提取到电话信息，尝试使用原始响应处理');
        this.processBaiduApiRawResponse(data.url, data.html, data.requestId);
      }
    } catch (error) {
      this.logError('Error processing HTML:', error);
      
      // 如果是百度API请求且出错，尝试使用原始响应处理
      if ((data.isBaiduApi || (data.url && (data.url.includes('miao.baidu.com') || data.url.includes('banti.baidu.com')))) && data.requestId) {
        this.log('HTML处理出错，尝试使用原始响应处理');
        try {
          this.processBaiduApiRawResponse(data.url, data.html, data.requestId);
        } catch (e) {
          this.logError('Error in fallback processing:', e);
        }
      }
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
      const isBaiduApi = data.isBaiduApi || false;
      
      // 查找JSON数据
      this.extractJsonFromScript(scriptContent, data.url, isBaiduApi);
      
      // 查找变量赋值
      this.extractVariablesFromScript(scriptContent, data.url, isBaiduApi);
    } catch (error) {
      this.logError('Error processing script:', error);
      
      // 如果是百度API脚本且出错，尝试使用备用方法
      if (data.isBaiduApi && this.lastSearchedPhone) {
        this.log('百度API脚本处理出错，尝试使用备用方法');
        this.tryBaiduApiFallback(this.lastSearchedPhone);
      }
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
   * @param {boolean} isBaiduApi - 是否是百度API请求
   */
  processJsonResponse(url, jsonData, requestId, isBaiduApi = false) {
    this.log(`处理JSON响应${isBaiduApi ? '(百度API)' : ''}:`, url);
    
    try {
      // 检查是否是百度API请求
      if (!isBaiduApi && url && (url.includes('miao.baidu.com') || url.includes('banti.baidu.com'))) {
        isBaiduApi = true;
      }
      
      // 初始化提取的数据对象
      let extractedData = null;
      
      // 检查是否包含电话号码信息
      if (jsonData.data) {
        // 处理标准百度API响应格式
        if (jsonData.data.phoneInfo) {
          const phoneInfo = jsonData.data.phoneInfo;
          
          // 提取电话号码信息
          extractedData = {
            phoneNumber: this.lastSearchedPhone,
            province: phoneInfo.province || '',
            city: phoneInfo.city || '',
            carrier: phoneInfo.operator || '',
            type: phoneInfo.type || '',
            tag: phoneInfo.tag || '',
            count: phoneInfo.count || 0
          };
        }
        // 处理其他可能的百度API响应格式
        else if (isBaiduApi) {
          this.log('尝试处理非标准百度API响应格式');
          
          // 尝试从data字段中提取信息
          const data = jsonData.data;
          
          // 检查是否有phone_info字段
          if (data.phone_info) {
            const phoneInfo = data.phone_info;
            
            // 提取电话号码信息
            extractedData = {
              phoneNumber: phoneInfo.phone || phoneInfo.phoneNumber || this.lastSearchedPhone,
              province: phoneInfo.province || '',
              city: phoneInfo.city || '',
              carrier: phoneInfo.carrier || phoneInfo.sp || phoneInfo.operator || '',
              type: phoneInfo.type || '',
              tag: phoneInfo.tag || '',
              count: phoneInfo.count || 0
            };
          }
          // 检查是否有detail字段
          else if (data.detail) {
            const detail = data.detail;
            
            // 提取电话号码信息
            extractedData = {
              phoneNumber: detail.phone || detail.phoneNumber || detail.number || this.lastSearchedPhone,
              province: detail.province || '',
              city: detail.city || '',
              carrier: detail.carrier || detail.sp || detail.operator || '',
              type: detail.type || '',
              tag: detail.tag || '',
              count: detail.count || detail.markCount || 0
            };
          }
        }
      } else if (isBaiduApi) {
        // 尝试直接从根对象提取信息
        if (jsonData.phoneInfo || jsonData.phone_info) {
          const phoneInfo = jsonData.phoneInfo || jsonData.phone_info;
          
          // 提取电话号码信息
          extractedData = {
            phoneNumber: phoneInfo.phone || phoneInfo.phoneNumber || this.lastSearchedPhone,
            province: phoneInfo.province || '',
            city: phoneInfo.city || '',
            carrier: phoneInfo.carrier || phoneInfo.sp || phoneInfo.operator || '',
            type: phoneInfo.type || '',
            tag: phoneInfo.tag || '',
            count: phoneInfo.count || 0
          };
        } else if (jsonData.detail) {
          const detail = jsonData.detail;
          
          // 提取电话号码信息
          extractedData = {
            phoneNumber: detail.phone || detail.phoneNumber || detail.number || this.lastSearchedPhone,
            province: detail.province || '',
            city: detail.city || '',
            carrier: detail.carrier || detail.sp || detail.operator || '',
            type: detail.type || '',
            tag: detail.tag || '',
            count: detail.count || detail.markCount || 0
          };
        }
      }
      
      // 如果成功提取到数据
                                                                                                                  
        // 保存提取的数据
        this.extractedData = { ...this.extractedData, ...extractedData };
        
        // 如果有请求ID，直接发送结果
        if (requestId) {
          this.sendPluginResult(this.extractedData, requestId);
          this.extractedData = {}; // 重置提取的数据
        }
         } catch (error) {
      this.logError('Error processing JSON response:', error);
      
      // 如果是百度API请求，尝试使用原始响应处理
      if (isBaiduApi && requestId) {
        this.log('JSON处理出错，尝试使用原始响应处理');
        try {
          this.processBaiduApiRawResponse(url, JSON.stringify(jsonData), requestId);
        } catch (e) {
          this.logError('Error in fallback processing:', e);
        }
      }
    }
  }

  /**
   * 从脚本中提取JSON数据
   * @param {string} scriptContent - 脚本内容
   * @param {string} url - 脚本URL
   * @param {boolean} isBaiduApi - 是否是百度API请求
   */
  extractJsonFromScript(scriptContent, url = '', isBaiduApi = false) {
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
          if (variableName === 'phoneInfo' || variableName.includes('phone') || variableName.includes('Phone') || 
              (isBaiduApi && (variableName.includes('data') || variableName.includes('result')))) {
            this.processExtractedJson(variableName, jsonData, isBaiduApi);
          }
        } catch (e) {
          // 不是有效的JSON，忽略
          if (isBaiduApi) {
            this.log('百度API脚本中的JSON解析失败:', e.message);
          }
        }
      }
    } catch (error) {
      this.logError('Error extracting JSON from script:', error);
      
      // 如果是百度API请求且出错，尝试使用备用方法
      if (isBaiduApi && this.lastSearchedPhone) {
        this.log('百度API脚本JSON提取出错，尝试使用备用方法');
        this.tryBaiduApiFallback(this.lastSearchedPhone);
      }
    }
  }

  /**
   * 处理从脚本中提取的JSON数据
   * @param {string} variableName - 变量名
   * @param {object} jsonData - JSON数据
   * @param {boolean} isBaiduApi - 是否是百度API请求
   */
  processExtractedJson(variableName, jsonData, isBaiduApi = false) {
    this.log('Processing extracted JSON from variable:', variableName, isBaiduApi ? '(百度API)' : '');
    
    try {
      // 检查是否包含电话号码信息
      if (jsonData.province || jsonData.city || jsonData.operator || jsonData.type ||
          (isBaiduApi && (jsonData.data || jsonData.result))) {
        
        // 提取电话号码信息
        let extractedData = {
          phoneNumber: this.lastSearchedPhone,
          province: jsonData.province || '',
          city: jsonData.city || '',
          carrier: jsonData.operator || '',
          type: jsonData.type || '',
          tag: jsonData.tag || '',
          count: jsonData.count || 0
        };
        
        // 如果是百度API请求，尝试从特殊格式中提取数据
        if (isBaiduApi) {
          // 尝试从data字段中提取
          if (jsonData.data) {
            if (jsonData.data.phoneInfo) {
              extractedData = {
                ...extractedData,
                province: jsonData.data.phoneInfo.province || extractedData.province,
                city: jsonData.data.phoneInfo.city || extractedData.city,
                carrier: jsonData.data.phoneInfo.operator || extractedData.carrier,
                tag: jsonData.data.phoneInfo.tag || extractedData.tag,
                count: jsonData.data.phoneInfo.count || extractedData.count
              };
            } else if (jsonData.data.phone_info) {
              extractedData = {
                ...extractedData,
                province: jsonData.data.phone_info.province || extractedData.province,
                city: jsonData.data.phone_info.city || extractedData.city,
                carrier: jsonData.data.phone_info.operator || extractedData.carrier,
                tag: jsonData.data.phone_info.tag || extractedData.tag,
                count: jsonData.data.phone_info.count || extractedData.count
              };
            } else if (jsonData.data.detail) {
              extractedData = {
                ...extractedData,
                province: jsonData.data.detail.province || extractedData.province,
                city: jsonData.data.detail.city || extractedData.city,
                carrier: jsonData.data.detail.operator || extractedData.carrier,
                tag: jsonData.data.detail.tag || extractedData.tag,
                count: jsonData.data.detail.count || extractedData.count
              };
            }
          }
        }
        
        // 保存提取的数据
        this.extractedData = { ...this.extractedData, ...extractedData };
      }
    } catch (error) {
      this.logError('Error processing extracted JSON:', error);
      
      // 如果是百度API请求且出错，尝试使用备用方法
      if (isBaiduApi && this.lastSearchedPhone) {
        this.log('百度API JSON处理出错，尝试使用备用方法');
        this.tryBaiduApiFallback(this.lastSearchedPhone);
      }
    }
  }
  
  /**
   * 从脚本中提取变量
   * @param {string} scriptContent - 脚本内容
   * @param {string} url - 脚本URL
   * @param {boolean} isBaiduApi - 是否是百度API请求
   */
  extractVariablesFromScript(scriptContent, url = '', isBaiduApi = false) {
    try {
      // 查找变量赋值
      const varRegex = /(?:const|let|var)\s+([\w]+)\s*=\s*(['"](([\s\S]*?)['"])|(\d+(\.\d+)?));/g;
      let match;
      
      while ((match = varRegex.exec(scriptContent)) !== null) {
        const variableName = match[1];
        const value = match[3] !== undefined ? match[3] : match[4];
        
        // 处理提取到的变量
        this.processExtractedVariable(variableName, value, isBaiduApi);
      }
      
      // 如果是百度API请求，尝试查找特殊格式的变量
      if (isBaiduApi) {
        // 查找可能包含电话信息的变量
        const phoneRegex = /([\w]+)\s*=\s*['"](1\d{10})['"]/g;
        while ((match = phoneRegex.exec(scriptContent)) !== null) {
          const variableName = match[1];
          const phoneNumber = match[2];
          
          if (phoneNumber && phoneNumber.length === 11) {
            this.log('Found phone number in variable:', variableName, phoneNumber);
            this.lastSearchedPhone = phoneNumber;
            
            // 尝试查询该号码信息
            this.queryPhoneInfo(phoneNumber);
          }
        }
      }
    } catch (error) {
      this.logError('Error extracting variables from script:', error);
      
      // 如果是百度API请求且出错，尝试使用备用方法
      if (isBaiduApi && this.lastSearchedPhone) {
        this.log('百度API变量提取出错，尝试使用备用方法');
        this.tryBaiduApiFallback(this.lastSearchedPhone);
      }
    }
  }
  
  /**
   * 处理从脚本中提取的变量
   * @param {string} variableName - 变量名
   * @param {string|number} value - 变量值
   * @param {boolean} isBaiduApi - 是否是百度API请求
   */
  processExtractedVariable(variableName, value, isBaiduApi = false) {
    try {
      // 检查变量名是否与电话信息相关
      if (variableName.includes('phone') || variableName.includes('Phone') || 
          variableName.includes('mobile') || variableName.includes('Mobile') ||
          (isBaiduApi && (variableName.includes('province') || variableName.includes('city') || 
                         variableName.includes('carrier') || variableName.includes('operator')))) {
        
        this.log('Found relevant variable:', variableName, value);
        
        // 如果是电话号码
        if (typeof value === 'string' && /^1\d{10}$/.test(value)) {
          this.lastSearchedPhone = value;
          this.log('Found phone number:', value);
          
          // 尝试查询该号码信息
          this.queryPhoneInfo(value);
        }
        
        // 如果是省份、城市或运营商信息
        if (isBaiduApi) {
          let extractedData = {};
          
          if (variableName.includes('province')) {
            extractedData.province = value;
          } else if (variableName.includes('city')) {
            extractedData.city = value;
          } else if (variableName.includes('carrier') || variableName.includes('operator')) {
            extractedData.carrier = value;
          }
          
          // 如果提取到了数据且有电话号码，保存结果
          if (Object.keys(extractedData).length > 0 && this.lastSearchedPhone) {
            extractedData.phoneNumber = this.lastSearchedPhone;
            this.extractedData = { ...this.extractedData, ...extractedData };
          }
        }
      }
    } catch (error) {
      this.logError('Error processing extracted variable:', error);
    }
  }

  /**
   * 发送特殊请求，用于处理可能会遇到CORS问题的请求
   * @param {string} url - 请求URL
   * @param {string} method - HTTP方法
   * @param {object} headers - 请求头
   * @param {string} body - 请求体
   * @param {string} requestId - 请求ID
   */
  sendSpecialRequest(url, method, headers, body, requestId) {
    this.log('发送特殊请求:', url);
    
    if (!window.flutter_inappwebview) {
      this.logError('Flutter interface not available');
      return;
    }
    
    // 检查是否是本地文件路径，如果是则不发送请求
    if (url && (url.startsWith('/c:') || url.startsWith('c:') || url.includes('resource_interceptor.dart') || url.includes('file://'))) {
      this.log('跳过本地文件路径请求:', url);
      this.sendPluginError('本地文件路径请求已被跳过: ' + url, requestId);
      return;
    }
    
    try {
      // 如果没有提供requestId，生成一个新的
      if (!requestId) {
        requestId = this.generateRequestId();
      }
      
      const request = {
        method,
        url,
        headers,
        body,
        pluginId: pluginInfo.id,
        requestId
      };
      
      this.log('发送特殊请求:', url);
      // 使用特殊通道发送请求，避免CORS问题
      window.flutter_inappwebview.callHandler('XHRSpecialRequestChannel', JSON.stringify(request));
    } catch (error) {
      this.logError('Error sending special request:', error);
      this.sendPluginError('Failed to send special request: ' + error.message, requestId);
    }
  }
  
  /**
   * 尝试使用备用方法处理百度API请求
   * @param {string} phoneNumber - 电话号码
   */
  tryBaiduApiFallback(phoneNumber) {
    this.log('尝试使用备用方法处理百度API请求:', phoneNumber);
    
    try {
      // 确保有电话号码
      if (!phoneNumber || !/^1\d{10}$/.test(phoneNumber)) {
        this.logError('无法使用备用方法：缺少有效的电话号码');
        return;
      }
      
      // 创建请求头 - 这些头对于百度API请求是必要的
      const headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Origin': 'https://haoma.baidu.com',
        'Referer': 'https://haoma.baidu.com/',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      
      // 创建一个新的请求ID
      const fallbackRequestId = this.generateRequestId();
      
      // 构建百度API URL
      const url = `https://haoma.baidu.com/api/v1/search?query=${encodeURIComponent(phoneNumber)}`;
      
      // 记录备用请求信息
      this.log('使用备用方法发送请求:', url);
      this.log('备用请求ID:', fallbackRequestId);
      
      // 使用特殊请求通道发送请求，避免CORS问题
      this.sendSpecialRequest(
        url,
        'GET',
        headers,
        null, // GET请求没有请求体
        fallbackRequestId
      );
      
      // 记录这是一个备用请求
      this.pendingRequests[fallbackRequestId] = {
        isBaiduApi: true,
        isFallback: true, // 标记这是一个备用请求
        phoneNumber: phoneNumber
      };
    } catch (error) {
      this.logError('Error in tryBaiduApiFallback:', error);
    }
  }
  
  /**
   * 处理百度API原始响应
   * @param {string} url - 响应URL
   * @param {string} responseBody - 响应体
   * @param {string} requestId - 请求ID
   */
  processBaiduApiRawResponse(url, responseBody, requestId) {
    this.log('处理百度API原始响应:', url);
    
    try {
      // 尝试从响应中提取有用信息
      let phoneNumber = this.lastSearchedPhone;
      let province = '';
      let city = '';
      let carrier = '';
      let tags = [];
      let count = 0;
      
      // 尝试使用正则表达式提取电话号码
      if (!phoneNumber) {
        const phoneRegex = /(1[3-9]\d{9})/g;
        const phoneMatches = responseBody.match(phoneRegex);
        if (phoneMatches && phoneMatches.length > 0) {
          phoneNumber = phoneMatches[0];
          this.log('从响应中提取到电话号码:', phoneNumber);
        }
      }
      
      // 尝试提取省份和城市信息
      const provinceRegex = /"province"\s*:\s*"([^"]+)"/i;
      const provinceMatch = responseBody.match(provinceRegex);
      if (provinceMatch && provinceMatch[1]) {
        province = provinceMatch[1];
        this.log('从响应中提取到省份:', province);
      }
      
      // 尝试提取城市信息
      const cityRegex = /"city"\s*:\s*"([^"]+)"/i;
      const cityMatch = responseBody.match(cityRegex);
      if (cityMatch && cityMatch[1]) {
        city = cityMatch[1];
        this.log('从响应中提取到城市:', city);
      }
      
      // 尝试提取运营商信息
      const carrierRegex = /(移动|联通|电信|虚拟运营商)/g;
      const carrierMatches = responseBody.match(carrierRegex);
      if (carrierMatches && carrierMatches.length > 0) {
        carrier = carrierMatches[0];
        this.log('从响应中提取到运营商:', carrier);
      }
      
      // 尝试提取标签信息
      const tagRegex = /"tag"\s*:\s*"([^"]+)"/i;
      const tagMatch = responseBody.match(tagRegex);
      if (tagMatch && tagMatch[1]) {
        tags.push(tagMatch[1]);
        this.log('从响应中提取到标签:', tagMatch[1]);
      }
      
      // 尝试提取更多标签信息
      const tagsRegex = /"tags"\s*:\s*\[([^\]]+)\]/i;
      const tagsMatch = responseBody.match(tagsRegex);
      if (tagsMatch && tagsMatch[1]) {
        const tagsList = tagsMatch[1].split(',').map(t => t.trim().replace(/"/g, ''));
        tags = [...tags, ...tagsList];
        this.log('从响应中提取到更多标签:', tagsList.join(', '));
      }
      
      // 如果找到电话号码，创建提取的数据对象
      if (phoneNumber) {
        const extractedData = {
          phoneNumber,
          province,
          city,
          carrier,
          tag: tags.join(','),
          count
        };
        
        
        
        
        
      
        
        
        
      
        
        
        
      
        // 保存提取的数据
        this.extractedData = { ...this.extractedData, ...extractedData };
        
        // 发送结果
        this.sendPluginResult(this.extractedData, requestId);
        this.extractedData = {}; // 重置提取的数据
      } else {
        // 如果没有找到电话号码，尝试使用其他方法
        this.log('无法从响应中提取到电话号码信息，尝试使用其他方法');
        
        // 如果有lastSearchedPhone，尝试查询信息
        if (this.lastSearchedPhone) {
          this.queryPhoneInfo(this.lastSearchedPhone, requestId);
        }
      }
    } catch (error) {
      this.logError('Error processing Baidu API raw response:', error);
    }
  }

  /**
   * 处理动态脚本
   * @param {Document} doc - HTML文档
   * @param {boolean} isBaiduApi - 是否是百度API请求
   */
  handleDynamicScripts(doc, isBaiduApi = false) {
    try {
      // 查找所有脚本元素
      const scripts = doc.querySelectorAll('script');
      this.log(`找到 ${scripts.length} 个脚本元素`);
      
      // 收集脚本内容和URL
      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        
        // 外部脚本
        if (script.src) {
          // 检查是否是本地文件路径，如果是则跳过
          if (script.src && (script.src.startsWith('/c:') || script.src.startsWith('c:') || 
              script.src.includes('resource_interceptor.dart') || script.src.includes('file://'))) {
            this.log('跳过本地文件路径脚本:', script.src);
            continue;
          }
          
          // 检查是否是百度API请求，如果是则特殊处理
          const isBaiduApiScript = isBaiduApi || (script.src && (script.src.includes('miao.baidu.com/') || script.src.includes('banti.baidu.com/')));
          if (isBaiduApiScript) {
            this.log('检测到百度API脚本，特殊处理:', script.src);
            // 使用增强的方法获取脚本
            this.fetchExternalScript(script.src, true);
          } else {
            // 普通外部脚本
            this.fetchExternalScript(script.src);
          }
        }
        // 内联脚本
        else if (script.textContent && script.textContent.trim()) {
          // 检查内联脚本是否包含百度API相关代码
          const content = script.textContent;
          const isBaiduApiContent = isBaiduApi || content.includes('miao.baidu.com') || content.includes('banti.baidu.com');
          if (isBaiduApiContent) {
            this.log('检测到包含百度API的内联脚本，特殊处理');
          }
          
          this.processScript({
            isExternal: false,
            content: content,
            isBaiduApi: isBaiduApiContent
          });
        }
      }
    } catch (error) {
      this.logError('Error handling dynamic scripts:', error);
      
      // 如果是百度API请求且出错，尝试使用备用方法
      if (isBaiduApi && this.lastSearchedPhone) {
        this.log('百度API脚本处理出错，尝试使用备用方法');
        this.tryBaiduApiFallback(this.lastSearchedPhone);
      }
    }
  }

  /**
   * 获取外部脚本
   * @param {string} url - 脚本URL
   * @param {boolean} isBaiduApi - 是否是百度API请求
   */
  fetchExternalScript(url, isBaiduApi = false) {
    // 检查是否是本地文件路径，如果是则跳过
    if (url && (url.startsWith('/c:') || url.startsWith('c:') || url.includes('resource_interceptor.dart') || url.includes('file://'))) {
      this.log('跳过本地文件路径脚本请求:', url);
      return;
    }
    
    // 检查是否是百度API请求
    if (!isBaiduApi && (url.includes('miao.baidu.com') || url.includes('banti.baidu.com'))) {
      isBaiduApi = true;
    }
    
    this.log(`获取${isBaiduApi ? '百度API' : '外部'}脚本:`, url);
    
    // 创建一个请求ID
    const requestId = this.generateRequestId();
    
    // 为百度API请求设置特殊头信息
    let headers = {};
    if (isBaiduApi) {
      headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': '*/*',
        'Origin': 'https://haoma.baidu.com',
        'Referer': 'https://haoma.baidu.com/',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      };
      
      // 记录特殊处理信息
      this.log('为百度API请求设置特殊头信息');
    }
    
    // 发送请求到Flutter，标记是否为百度API请求
    this.sendRequest('GET', url, headers, requestId, isBaiduApi);
  }

  /**
   * 从DOM中提取数据
   * @param {Document} doc - HTML文档
   * @param {boolean} isBaiduApi - 是否是百度API请求
   * @returns {object} 提取的数据
   */
  extractDataFromDOM(doc, isBaiduApi = false) {
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
