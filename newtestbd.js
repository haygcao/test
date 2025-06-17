/**
 * 百度号码查询插件 - 用于查询电话号码信息
 * 此插件可以处理拦截到的数据并提取电话号码相关信息,  有插件复杂处理所有的逻辑， 插件发送请求到flutter 拦截器负责拦截并发回数据
 */

// 插件基础信息
const pluginInfo = {
    id: 'baidu_phone_search',
    name: '百度号码查询',
    version: '1.79.0',
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
          var originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
          
          // 统一的请求头
          var standardHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            'Referer': 'https://haoma.baidu.com/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Connection': 'keep-alive',
            'Origin': 'https://haoma.baidu.com',
            'X-Requested-With': 'XMLHttpRequest'
          };
          
          // 移动版特定请求头
          var mobileHeaders = {
            'Referer': 'https://m.baidu.com/',
            'Origin': 'https://m.baidu.com',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          };
          
          // 重写open方法，记录URL和方法
          XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
            this._baiduApiUrl = url;
            this._baiduApiMethod = method;
            
            // 记录所有请求的URL，便于调试
            console.log('[BaiduAPI] 打开请求:', method, url);
            
            return originalOpen.apply(this, [method, url, async, user, password]);
          };
          
          // 重写send方法，为所有百度域名请求添加统一的头信息
          XMLHttpRequest.prototype.send = function(body) {
            // 检查是否是百度域名的请求
            if (this._baiduApiUrl && (this._baiduApiUrl.includes('baidu.com') || this._baiduApiUrl.includes('bcebos.com'))) {
              console.log('[BaiduAPI] 处理百度域名请求:', this._baiduApiUrl);
              
              try {
                // 为所有百度域名请求添加统一的请求头
                for (var header in standardHeaders) {
                  try {
                    this.setRequestHeader(header, standardHeaders[header]);
                  } catch (e) {
                    console.warn('[BaiduAPI] 无法设置请求头:', header, e);
                  }
                }
                
                // 特殊处理miao.baidu.com和banti.baidu.com的请求
                if (this._baiduApiUrl.includes('miao.baidu.com') || this._baiduApiUrl.includes('banti.baidu.com')) {
                  try {
                    this.setRequestHeader('Accept', '*/*');
                    // 添加安全相关的请求头
                    this.setRequestHeader('Sec-Fetch-Dest', 'empty');
                    this.setRequestHeader('Sec-Fetch-Mode', 'cors');
                    this.setRequestHeader('Sec-Fetch-Site', 'same-site');
                  } catch (e) {
                    console.warn('[BaiduAPI] 无法设置特殊请求头:', e);
                  }
                }
                
                // 特殊处理移动版app.js脚本请求
                if (this._baiduApiUrl.includes('bdhm.cdn.bcebos.com/m/js/app')) {
                  try {
                    // 使用移动版特定请求头
                    for (var header in mobileHeaders) {
                      this.setRequestHeader(header, mobileHeaders[header]);
                    }
                    this.setRequestHeader('Sec-Fetch-Dest', 'script');
                    this.setRequestHeader('Sec-Fetch-Mode', 'no-cors');
                    this.setRequestHeader('Sec-Fetch-Site', 'cross-site');
                    this.setRequestHeader('Accept', '*/*');
                  } catch (e) {
                    console.warn('[BaiduAPI] 无法设置移动版特殊请求头:', e);
                  }
                }
                
                // 特殊处理POST请求
                if (this._baiduApiMethod === 'POST') {
                  try {
                    this.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                  } catch (e) {
                    console.warn('[BaiduAPI] 无法设置Content-Type请求头:', e);
                  }
                }
                
                console.log('[BaiduAPI] 已添加统一请求头');
              } catch (e) {
                console.error('[BaiduAPI] 添加请求头失败:', e);
              }
            }
            
            // 调用原始send方法
            return originalSend.apply(this, arguments);
          };
          
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
     * @param {string} method - 请求方法
     * @param {string} url - 请求URL
     * @param {object} headers - 请求头
     * @param {string} requestId - 请求ID
     * @param {string|object} body - 请求体
     */
    sendRequest(method, url, headers, requestId, body = null) {
      // 确保URL是绝对路径
      if (!url.startsWith('http') && !url.startsWith('https')) {
        this.logError('URL必须是绝对路径:', url);
        return;
      }
      
      if (!window.flutter_inappwebview) {
        this.logError('Flutter接口不可用');
        return;
      }
      
      try {
        this.log(`发送请求: ${method} ${url}`);
        this.log('请求头:', JSON.stringify(headers));
        
        // 更新待处理请求的信息
        if (this.pendingRequests[requestId]) {
          this.pendingRequests[requestId].timestamp = Date.now();
          this.pendingRequests[requestId].method = method;
        } else {
          this.pendingRequests[requestId] = {
            url: url,
            method: method,
            timestamp: Date.now()
          };
        }
        
        // 准备请求数据
        const request = {
          method,
          url,
          headers,
          pluginId: pluginInfo.id,
          requestId
        };
        
        // 如果有请求体，添加到请求数据中
        if (body) {
          request.body = typeof body === 'string' ? body : JSON.stringify(body);
        }
        
        // 发送请求到Flutter
        window.flutter_inappwebview.callHandler('RequestChannel', JSON.stringify(request));
      } catch (error) {
        this.logError('发送请求时出错:', error);
        this.sendPluginError('请求发送失败: ' + error.message, requestId);
        delete this.pendingRequests[requestId];
      }
    }
  
    /**
     * 处理响应
     * @param {object} response - 响应对象
     * @param {string} requestId - 请求ID
     */
    handleResponse(response, requestId) {
      try {
        this.log(`处理响应: ${response.url}, 状态: ${response.status}, 类型: ${response.contentType}`);
        
        // 检查是否有待处理的请求
        const pendingRequest = this.pendingRequests[requestId];
        if (!pendingRequest) {
          this.log(`没有找到请求ID为 ${requestId} 的待处理请求`);
          return;
        }
        
        const url = response.url || pendingRequest.url;
        const baseUrl = pendingRequest.baseUrl || url;
        const responseType = pendingRequest.type || '';
        
        // 检查响应状态
        if (response.status < 200 || response.status >= 300) {
          this.logError(`请求失败: ${url}, 状态: ${response.status}`);
          delete this.pendingRequests[requestId];
          return;
        }
        
        // 根据内容类型处理响应
        const contentType = response.contentType || '';
        
        if (contentType.includes('text/html') || url.endsWith('.html')) {
          // 处理HTML响应
          this.log('处理HTML响应');
          this.processHtml(response.body, url, requestId);
        } else if (contentType.includes('application/json') || url.endsWith('.json')) {
          // 处理JSON响应
          this.log('处理JSON响应');
          try {
            const jsonData = JSON.parse(response.body);
            this.processJsonResponse(url, jsonData, requestId);
          } catch (error) {
            this.logError('解析JSON响应失败:', error);
          }
        } else if (contentType.includes('text/css') || url.endsWith('.css') || responseType === 'stylesheet') {
          // 处理CSS响应
          this.log('处理CSS响应');
          this.processCssResponse(url, response.body, requestId);
        } else if (contentType.includes('application/javascript') || 
                   contentType.includes('text/javascript') || 
                   url.endsWith('.js') || 
                   responseType === 'script') {
          // 处理JavaScript响应
          this.log('处理JavaScript响应');
          this.processScript({
            isExternal: true,
            content: response.body,
            url: url,
            baseUrl: baseUrl
          });
        } else {
          // 处理其他类型的响应
          this.log(`未处理的响应类型: ${contentType}`);
        }
        
        // 从待处理队列中移除请求
        delete this.pendingRequests[requestId];
        
      } catch (error) {
        this.logError('处理响应时出错:', error);
        delete this.pendingRequests[requestId];
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
        
        // 首先提取数据，确保在处理脚本前获取静态内容
        const extractedData = this.extractDataFromDOM(doc);
        
        // 如果有提取到数据，保存结果
        if (extractedData && Object.keys(extractedData).length > 0) {
          this.extractedData = { ...this.extractedData, ...extractedData };
          this.log('成功从HTML中提取数据:', this.extractedData);
        }
        
        // 始终处理HTML中的脚本，确保head中的所有内容都被正确加载
        this.log('处理页面的所有脚本和资源');
        this.handleDynamicScripts(doc, data.url);
      } catch (error) {
        this.logError('Error processing HTML:', error);
      }
    }
    
    /**
     * 处理动态脚本
     * @param {Document} doc - HTML文档
     * @param {string} baseUrl - 基础URL，用于解析相对路径
     */
    handleDynamicScripts(doc, baseUrl) {
      try {
        // 处理head中的所有资源
        this.processHeadResources(doc, baseUrl);
        
        // 查找所有脚本元素
        const scripts = doc.querySelectorAll('script');
        this.log(`找到 ${scripts.length} 个脚本元素`);
        
        // 创建两个队列：head中的脚本和body中的脚本
        const headScripts = [];
        const bodyScripts = [];
        
        // 检查是否有特定的移动版app.js脚本需要处理
        const appScriptUrl = 'https://bdhm.cdn.bcebos.com/m/js/app.6664d39c.js';
        let hasAppScript = false;
        
        // 按照它们在HTML中出现的自然顺序分类脚本
        for (let i = 0; i < scripts.length; i++) {
          const script = scripts[i];
          
          // 检查是否是本地文件路径，如果是则跳过
          if (script.src && (script.src.startsWith('/c:') || script.src.startsWith('c:') || script.src.includes('resource_interceptor.dart'))) {
            this.log('跳过本地文件路径脚本:', script.src);
            continue;
          }
          
          // 检查是否是移动版app.js脚本
          if (script.src && script.src.includes('bdhm.cdn.bcebos.com/m/js/app')) {
            hasAppScript = true;
            this.log('找到移动版app.js脚本:', script.src);
          }
          
          // 判断脚本位置
          const isInHead = script.parentNode && (script.parentNode.nodeName === 'HEAD' || script.parentNode.closest('head'));
          const isExternal = !!script.src;
          
          // 创建脚本处理函数
          const processScriptFn = () => {
            if (isExternal) {
              this.fetchExternalScript(script.src, baseUrl);
            } else if (script.textContent && script.textContent.trim()) {
              this.processScript({
                isExternal: false,
                content: script.textContent,
                url: baseUrl
              });
            }
          };
          
          // 按照在HTML中的位置分类
          if (isInHead) {
            headScripts.push(processScriptFn);
          } else {
            bodyScripts.push(processScriptFn);
          }
        }
        
        // 首先处理head中的所有脚本，按照它们在HTML中出现的顺序
        this.log(`处理 ${headScripts.length} 个head中的脚本`);
        headScripts.forEach(fn => fn());
        
        // 然后处理body中的脚本
        this.log(`处理 ${bodyScripts.length} 个body中的脚本`);
        bodyScripts.forEach(fn => fn());
        
        // 如果没有找到移动版app.js脚本但URL包含bcebos.com，手动加载它
        if (!hasAppScript && baseUrl && baseUrl.includes('bcebos.com')) {
          this.log('手动加载移动版app.js脚本');
          this.fetchExternalScript(appScriptUrl, baseUrl);
        }
        
      } catch (error) {
        this.logError('Error handling dynamic scripts:', error);
      }
    }
    
    /**
     * 处理head中的所有资源
     * @param {Document} doc - HTML文档
     * @param {string} baseUrl - 基础URL，用于解析相对路径
     */
    processHeadResources(doc, baseUrl) {
      try {
        this.log('处理head中的所有资源');
        
        // 处理head中的所有link标签（CSS、预加载资源等）
        const links = doc.head.querySelectorAll('link');
        this.log(`找到 ${links.length} 个link元素`);
        
        for (let i = 0; i < links.length; i++) {
          const link = links[i];
          
          // 跳过本地文件路径
          if (link.href && (link.href.startsWith('/c:') || link.href.startsWith('c:') || link.href.includes('resource_interceptor.dart'))) {
            this.log('跳过本地文件路径link:', link.href);
            continue;
          }
          
          // 处理CSS和其他资源
          if (link.href) {
            this.log('加载外部资源:', link.href);
            this.fetchExternalResource(link.href, link.rel, baseUrl);
          }
        }
        
        // 处理head中的meta标签
        const metas = doc.head.querySelectorAll('meta');
        this.log(`找到 ${metas.length} 个meta元素`);
        
        // 处理head中的内联JSON数据
        const jsonScripts = doc.head.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]');
        this.log(`找到 ${jsonScripts.length} 个JSON脚本元素`);
        
        for (let i = 0; i < jsonScripts.length; i++) {
          const script = jsonScripts[i];
          if (script.textContent && script.textContent.trim()) {
            this.log('处理内联JSON数据');
            try {
              const jsonData = JSON.parse(script.textContent);
              this.processJsonData(jsonData, baseUrl);
            } catch (e) {
              this.logError('解析JSON数据失败:', e);
            }
          }
        }
        
        // 处理cookie
        if (doc.cookie) {
          this.log('处理cookie');
          this.processCookies(doc.cookie, baseUrl);
        }
      } catch (error) {
        this.logError('Error processing head resources:', error);
      }
    }
    
    /**
     * 获取外部资源
     * @param {string} url - 资源URL
     * @param {string} resourceType - 资源类型（如'stylesheet'）
     * @param {string} baseUrl - 基础URL，用于设置正确的Referer
     */
    fetchExternalResource(url, resourceType, baseUrl) {
      // 检查是否是本地文件路径，如果是则跳过
      if (url && (url.startsWith('/c:') || url.startsWith('c:') || url.includes('resource_interceptor.dart'))) {
        this.log('跳过本地文件路径资源请求:', url);
        return;
      }
      
      // 确保URL是绝对路径
      const absoluteUrl = this.resolveRelativeUrl(url, baseUrl);
      this.log('Fetching external resource:', absoluteUrl, 'type:', resourceType);
      
      // 创建一个请求ID
      const requestId = this.generateRequestId();
      
      // 构建适合的请求头
      const resourceHeaders = { ...headers };
      
      // 为所有百度域名请求添加统一的请求头
      if (absoluteUrl.includes('baidu.com') || absoluteUrl.includes('bcebos.com')) {
        // 设置正确的Referer和Origin
        resourceHeaders['Referer'] = baseUrl || 'https://haoma.baidu.com/';
        resourceHeaders['Origin'] = new URL(baseUrl || 'https://haoma.baidu.com/').origin;
        
        // 根据资源类型设置Accept头
        if (resourceType === 'stylesheet') {
          resourceHeaders['Accept'] = 'text/css,*/*;q=0.1';
          resourceHeaders['Sec-Fetch-Dest'] = 'style';
        } else if (resourceType === 'script') {
          resourceHeaders['Accept'] = '*/*';
          resourceHeaders['Sec-Fetch-Dest'] = 'script';
        } else if (resourceType === 'image' || url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
          resourceHeaders['Accept'] = 'image/webp,image/apng,image/*,*/*;q=0.8';
          resourceHeaders['Sec-Fetch-Dest'] = 'image';
        } else {
          resourceHeaders['Accept'] = '*/*';
          resourceHeaders['Sec-Fetch-Dest'] = 'empty';
        }
        
        resourceHeaders['Accept-Language'] = 'zh-CN,zh;q=0.9,en;q=0.8';
        resourceHeaders['Connection'] = 'keep-alive';
        
        // 添加安全相关的请求头
        resourceHeaders['Sec-Fetch-Mode'] = 'no-cors';
        resourceHeaders['Sec-Fetch-Site'] = 'same-site';
        
        // 添加移动设备UA
        if (absoluteUrl.includes('m.baidu.com') || absoluteUrl.includes('/m/') || absoluteUrl.includes('miao.baidu.com')) {
          resourceHeaders['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
        }
      }
      
      this.log('使用以下请求头获取资源:', JSON.stringify(resourceHeaders));
      
      // 对于脚本资源，标记为待处理
      if (resourceType === 'script' || url.match(/\.(js)$/i)) {
        this.pendingRequests[requestId] = {
          type: 'script',
          url: absoluteUrl,
          baseUrl: baseUrl
        };
      } else if (resourceType === 'stylesheet' || url.match(/\.(css)$/i)) {
        this.pendingRequests[requestId] = {
          type: 'css',
          url: absoluteUrl,
          baseUrl: baseUrl
        };
      }
      
      // 发送请求到Flutter
      this.sendRequest('GET', absoluteUrl, resourceHeaders, requestId);
    }
  
    /**
     * 处理JSON数据
     * @param {object} jsonData - JSON数据
     * @param {string} baseUrl - 基础URL
     */
    processJsonData(jsonData, baseUrl) {
      this.log('处理JSON数据');
      // 这里可以添加特定的JSON数据处理逻辑
    }
    
    /**
     * 处理CSS响应
     * @param {string} url - CSS资源URL
     * @param {string} cssContent - CSS内容
     * @param {string} requestId - 请求ID
     */
    processCssResponse(url, cssContent, requestId) {
      this.log('处理CSS响应:', url);
      
      try {
        // 解析CSS中的@import和url()引用
        this.processCssImportsAndUrls(cssContent, url);
      } catch (error) {
        this.logError('Error processing CSS response:', error);
      }
    }
    
    /**
     * 处理CSS中的@import和url()引用
     * @param {string} cssContent - CSS内容
     * @param {string} baseUrl - 基础URL，用于解析相对路径
     */
    processCssImportsAndUrls(cssContent, baseUrl) {
      try {
        // 提取@import规则
        const importRegex = /@import\s+(?:url\(\s*)?['"]?([^'"\)\s]+)['"]?\s*\)?\s*;/g;
        let importMatch;
        
        while ((importMatch = importRegex.exec(cssContent)) !== null) {
          const importUrl = importMatch[1];
          if (importUrl) {
            // 解析相对URL
            const absoluteUrl = this.resolveRelativeUrl(importUrl, baseUrl);
            this.log('加载CSS @import:', absoluteUrl);
            this.fetchExternalResource(absoluteUrl, 'stylesheet', baseUrl);
          }
        }
        
        // 提取url()引用
        const urlRegex = /url\(\s*['"]?([^'"\)\s]+)['"]?\s*\)/g;
        let urlMatch;
        
        while ((urlMatch = urlRegex.exec(cssContent)) !== null) {
          const resourceUrl = urlMatch[1];
          if (resourceUrl && !resourceUrl.startsWith('data:')) {
            // 解析相对URL
            const absoluteUrl = this.resolveRelativeUrl(resourceUrl, baseUrl);
            this.log('加载CSS url()资源:', absoluteUrl);
            this.fetchExternalResource(absoluteUrl, '', baseUrl);
          }
        }
      } catch (error) {
        this.logError('Error processing CSS imports and URLs:', error);
      }
    }
    
    /**
     * 解析相对URL
     * @param {string} relativeUrl - 相对URL
     * @param {string} baseUrl - 基础URL
     * @returns {string} 绝对URL
     */
    resolveRelativeUrl(relativeUrl, baseUrl) {
      try {
        // 如果已经是绝对URL，直接返回
        if (relativeUrl.match(/^(https?:|data:|\/\/)/) || !baseUrl) {
          return relativeUrl;
        }
        
        // 创建URL对象来解析相对路径
        return new URL(relativeUrl, baseUrl).href;
      } catch (error) {
        this.logError('Error resolving relative URL:', error);
        return relativeUrl; // 出错时返回原始URL
      }
    }
    
    /**
     * 处理cookies
     * @param {string} cookies - cookie字符串
     * @param {string} baseUrl - 基础URL
     */
    processCookies(cookies, baseUrl) {
      this.log('处理cookies');
      // 这里可以添加特定的cookie处理逻辑
    }
    
    /**
     * 处理脚本内容
     * @param {object} data - 脚本数据
     * @param {boolean} data.isExternal - 是否是外部脚本
     * @param {string} data.content - 脚本内容
     * @param {string} data.url - 脚本URL或基础URL
     */
    processScript(data) {
      try {
        this.log(`处理${data.isExternal ? '外部' : '内联'}脚本:`, data.url);
        
        const scriptContent = data.content;
        if (!scriptContent || scriptContent.trim() === '') {
          this.log('脚本内容为空，跳过处理');
          return;
        }
        
        // 检查脚本是否包含关键的API或函数
        const containsKeyAPI = (
          scriptContent.includes('XMLHttpRequest') ||
          scriptContent.includes('fetch(') ||
          scriptContent.includes('$.ajax') ||
          scriptContent.includes('axios')
        );
        
        // 检查脚本是否包含关键的DOM操作
        const containsDOMManipulation = (
          scriptContent.includes('document.getElementById') ||
          scriptContent.includes('document.querySelector') ||
          scriptContent.includes('document.getElementsBy') ||
          scriptContent.includes('innerHTML') ||
          scriptContent.includes('appendChild') ||
          scriptContent.includes('removeChild')
        );
        
        // 检查脚本是否包含事件监听器
        const containsEventListeners = (
          scriptContent.includes('addEventListener') ||
          scriptContent.includes('onclick') ||
          scriptContent.includes('onload') ||
          scriptContent.includes('DOMContentLoaded')
        );
        
        // 检查脚本是否包含JSON处理
        const containsJSONProcessing = (
          scriptContent.includes('JSON.parse') ||
          scriptContent.includes('JSON.stringify')
        );
        
        // 记录脚本特征
        if (containsKeyAPI) this.log('脚本包含网络请求API');
        if (containsDOMManipulation) this.log('脚本包含DOM操作');
        if (containsEventListeners) this.log('脚本包含事件监听器');
        if (containsJSONProcessing) this.log('脚本包含JSON处理');
        
        // 检查脚本是否包含百度特定的API或函数
        const containsBaiduAPI = (
          scriptContent.includes('baiduboxapp') ||
          scriptContent.includes('swan.') ||
          scriptContent.includes('_hmt') ||
          scriptContent.includes('hm.baidu.com') ||
          scriptContent.includes('passport.baidu') ||
          scriptContent.includes('bdstatic')
        );
        
        if (containsBaiduAPI) {
          this.log('脚本包含百度特定API');
        }
        
        // 如果脚本包含关键功能，可以考虑执行它
        if (containsKeyAPI || containsDOMManipulation || containsEventListeners || containsJSONProcessing || containsBaiduAPI) {
          this.log('脚本包含关键功能，尝试执行');
          // 这里可以添加执行脚本的逻辑，但需要注意安全性
        }
      } catch (error) {
        this.logError('Error processing script:', error);
      }
    }
    
    /**
     * 处理JSON响应
     * @param {string} url - 响应URL
     * @param {object} jsonData - JSON数据
     * @param {string} requestId - 请求ID
     */
    processJsonResponse(url, jsonData, requestId) {
      try {
        this.log('处理JSON响应:', url);
        
        // 检查是否包含电话号码相关信息
        if (jsonData.data && jsonData.data.phoneNumber) {
          this.log('从JSON响应中提取电话号码信息');
          this.extractedData = { ...this.extractedData, ...jsonData.data };
        }
        
        // 检查是否包含错误信息
        if (jsonData.error) {
          this.logError('JSON响应包含错误:', jsonData.error);
        }
        
        // 处理特定的百度API响应
        if (url.includes('miao.baidu.com') || url.includes('banti.baidu.com')) {
          this.log('处理百度特定API响应');
          // 这里可以添加特定的百度API响应处理逻辑
        }
      } catch (error) {
        this.logError('Error processing JSON response:', error);
      }
    }
  
    /**
     * 获取外部样式表
     * @param {string} url - 样式表URL
     * @param {string} baseUrl - 基础URL，用于设置正确的Referer
     */
    fetchExternalStylesheet(url, baseUrl) {
      // 检查是否是本地文件路径，如果是则跳过
      if (url && (url.startsWith('/c:') || url.startsWith('c:') || url.includes('resource_interceptor.dart'))) {
        this.log('跳过本地文件路径样式表:', url);
        return;
      }
      
      // 确保URL是绝对路径
      const absoluteUrl = this.resolveRelativeUrl(url, baseUrl);
      this.log('获取外部样式表:', absoluteUrl);
      
      // 创建一个请求ID
      const requestId = this.generateRequestId();
      
      // 构建适合的请求头
      const cssHeaders = { ...headers };
      
      // 为所有百度域名请求添加统一的请求头
      if (absoluteUrl.includes('baidu.com') || absoluteUrl.includes('bcebos.com')) {
        // 设置正确的Referer和Origin
        cssHeaders['Referer'] = baseUrl || 'https://haoma.baidu.com/';
        cssHeaders['Origin'] = new URL(baseUrl || 'https://haoma.baidu.com/').origin;
        
        // 设置CSS相关的请求头
        cssHeaders['Accept'] = 'text/css,*/*;q=0.1';
        cssHeaders['Sec-Fetch-Dest'] = 'style';
        cssHeaders['Accept-Language'] = 'zh-CN,zh;q=0.9,en;q=0.8';
        cssHeaders['Connection'] = 'keep-alive';
        
        // 添加安全相关的请求头
        cssHeaders['Sec-Fetch-Mode'] = 'no-cors';
        cssHeaders['Sec-Fetch-Site'] = 'same-site';
        
        // 添加移动设备UA
        if (absoluteUrl.includes('m.baidu.com') || absoluteUrl.includes('/m/') || absoluteUrl.includes('miao.baidu.com')) {
          cssHeaders['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
        }
      }
      
      this.log('使用以下请求头获取样式表:', JSON.stringify(cssHeaders));
      
      // 将CSS请求添加到待处理队列
      this.pendingRequests[requestId] = {
        type: 'stylesheet',
        url: absoluteUrl,
        baseUrl: baseUrl,
        timestamp: Date.now()
      };
      
      // 发送请求到Flutter
      this.sendRequest('GET', absoluteUrl, cssHeaders, requestId);
    }
  
    /**
     * 处理JSON数据
     * @param {object} jsonData - JSON数据
     * @param {string} baseUrl - 基础URL
     */
    processJsonData(jsonData, baseUrl) {
      this.log('处理JSON数据');
      // 这里可以添加特定的JSON数据处理逻辑
    }
    
    /**
     * 处理CSS响应
     * @param {string} url - CSS资源URL
     * @param {string} cssContent - CSS内容
     * @param {string} requestId - 请求ID
     */
    processCssResponse(url, cssContent, requestId) {
      this.log('处理CSS响应:', url);
      
      try {
        // 解析CSS中的@import和url()引用
        this.processCssImportsAndUrls(cssContent, url);
      } catch (error) {
        this.logError('Error processing CSS response:', error);
      }
    }
    
    /**
     * 处理CSS中的@import和url()引用
     * @param {string} cssContent - CSS内容
     * @param {string} baseUrl - 基础URL，用于解析相对路径
     */
    processCssImportsAndUrls(cssContent, baseUrl) {
      try {
        // 提取@import规则
        const importRegex = /@import\s+(?:url\(\s*)?['"]?([^'"\)\s]+)['"]?\s*\)?\s*;/g;
        let importMatch;
        
        while ((importMatch = importRegex.exec(cssContent)) !== null) {
          const importUrl = importMatch[1];
          if (importUrl) {
            // 解析相对URL
            const absoluteUrl = this.resolveRelativeUrl(importUrl, baseUrl);
            this.log('加载CSS @import:', absoluteUrl);
            this.fetchExternalResource(absoluteUrl, 'stylesheet', baseUrl);
          }
        }
        
        // 提取url()引用
        const urlRegex = /url\(\s*['"]?([^'"\)\s]+)['"]?\s*\)/g;
        let urlMatch;
        
        while ((urlMatch = urlRegex.exec(cssContent)) !== null) {
          const resourceUrl = urlMatch[1];
          if (resourceUrl && !resourceUrl.startsWith('data:')) {
            // 解析相对URL
            const absoluteUrl = this.resolveRelativeUrl(resourceUrl, baseUrl);
            this.log('加载CSS url()资源:', absoluteUrl);
            this.fetchExternalResource(absoluteUrl, '', baseUrl);
          }
        }
      } catch (error) {
        this.logError('Error processing CSS imports and URLs:', error);
      }
    }
    
    /**
     * 解析相对URL
     * @param {string} relativeUrl - 相对URL
     * @param {string} baseUrl - 基础URL
     * @returns {string} 绝对URL
     */
    resolveRelativeUrl(relativeUrl, baseUrl) {
      try {
        // 如果已经是绝对URL，直接返回
        if (relativeUrl.match(/^(https?:|data:|\/\/)/) || !baseUrl) {
          return relativeUrl;
        }
        
        // 创建URL对象来解析相对路径
        return new URL(relativeUrl, baseUrl).href;
      } catch (error) {
        this.logError('Error resolving relative URL:', error);
        return relativeUrl; // 出错时返回原始URL
      }
    }
    
    /**
     * 处理cookies
     * @param {string} cookies - cookie字符串
     * @param {string} baseUrl - 基础URL
     */
    processCookies(cookies, baseUrl) {
      this.log('处理cookies');
      // 这里可以添加特定的cookie处理逻辑
    }
    
    /**
     * 处理脚本内容
     * @param {object} data - 脚本数据
     * @param {boolean} data.isExternal - 是否是外部脚本
     * @param {string} data.content - 脚本内容
     * @param {string} data.url - 脚本URL或基础URL
     */
    processScript(data) {
      try {
        this.log(`处理${data.isExternal ? '外部' : '内联'}脚本:`, data.url);
        
        const scriptContent = data.content;
        if (!scriptContent || scriptContent.trim() === '') {
          this.log('脚本内容为空，跳过处理');
          return;
        }
        
        // 检查脚本是否包含关键的API或函数
        const containsKeyAPI = (
          scriptContent.includes('XMLHttpRequest') ||
          scriptContent.includes('fetch(') ||
          scriptContent.includes('$.ajax') ||
          scriptContent.includes('axios')
        );
        
        // 检查脚本是否包含关键的DOM操作
        const containsDOMManipulation = (
          scriptContent.includes('document.getElementById') ||
          scriptContent.includes('document.querySelector') ||
          scriptContent.includes('document.getElementsBy') ||
          scriptContent.includes('innerHTML') ||
          scriptContent.includes('appendChild') ||
          scriptContent.includes('removeChild')
        );
        
        // 检查脚本是否包含事件监听器
        const containsEventListeners = (
          scriptContent.includes('addEventListener') ||
          scriptContent.includes('onclick') ||
          scriptContent.includes('onload') ||
          scriptContent.includes('DOMContentLoaded')
        );
        
        // 检查脚本是否包含JSON处理
        const containsJSONProcessing = (
          scriptContent.includes('JSON.parse') ||
          scriptContent.includes('JSON.stringify')
        );
        
        // 记录脚本特征
        if (containsKeyAPI) this.log('脚本包含网络请求API');
        if (containsDOMManipulation) this.log('脚本包含DOM操作');
        if (containsEventListeners) this.log('脚本包含事件监听器');
        if (containsJSONProcessing) this.log('脚本包含JSON处理');
        
        // 检查脚本是否包含百度特定的API或函数
        const containsBaiduAPI = (
          scriptContent.includes('baiduboxapp') ||
          scriptContent.includes('swan.') ||
          scriptContent.includes('_hmt') ||
          scriptContent.includes('hm.baidu.com') ||
          scriptContent.includes('passport.baidu') ||
          scriptContent.includes('bdstatic')
        );
        
        if (containsBaiduAPI) {
          this.log('脚本包含百度特定API');
        }
        
        // 如果脚本包含关键功能，可以考虑执行它
        if (containsKeyAPI || containsDOMManipulation || containsEventListeners || containsJSONProcessing || containsBaiduAPI) {
          this.log('脚本包含关键功能，尝试执行');
          // 这里可以添加执行脚本的逻辑，但需要注意安全性
        }
      } catch (error) {
        this.logError('Error processing script:', error);
      }
    }
    
    /**
     * 处理JSON响应
     * @param {string} url - 响应URL
     * @param {object} jsonData - JSON数据
     * @param {string} requestId - 请求ID
     */
    processJsonResponse(url, jsonData, requestId) {
      try {
        this.log('处理JSON响应:', url);
        
        // 检查是否包含电话号码相关信息
        if (jsonData.data && jsonData.data.phoneNumber) {
          this.log('从JSON响应中提取电话号码信息');
          this.extractedData = { ...this.extractedData, ...jsonData.data };
        }
        
        // 检查是否包含错误信息
        if (jsonData.error) {
          this.logError('JSON响应包含错误:', jsonData.error);
        }
        
        // 处理特定的百度API响应
        if (url.includes('miao.baidu.com') || url.includes('banti.baidu.com')) {
          this.log('处理百度特定API响应');
          // 这里可以添加特定的百度API响应处理逻辑
        }
      } catch (error) {
        this.logError('Error processing JSON response:', error);
      }
    }
  
    /**
     * 获取外部脚本
     * @param {string} url - 脚本URL
     * @param {string} baseUrl - 基础URL，用于设置正确的Referer
     */
    fetchExternalScript(url, baseUrl) {
      // 检查是否是本地文件路径，如果是则跳过
      if (url && (url.startsWith('/c:') || url.startsWith('c:') || url.includes('resource_interceptor.dart'))) {
        this.log('跳过本地文件路径脚本:', url);
        return;
      }
      
      // 确保URL是绝对路径
      const absoluteUrl = this.resolveRelativeUrl(url, baseUrl);
      this.log('获取外部脚本:', absoluteUrl);
      
      // 创建一个请求ID
      const requestId = this.generateRequestId();
      
      // 构建适合的请求头
      const scriptHeaders = { ...headers };
      
      // 为所有百度域名请求添加统一的请求头
      if (absoluteUrl.includes('baidu.com') || absoluteUrl.includes('bcebos.com')) {
        // 设置正确的Referer和Origin
        scriptHeaders['Referer'] = baseUrl || 'https://haoma.baidu.com/';
        scriptHeaders['Origin'] = new URL(baseUrl || 'https://haoma.baidu.com/').origin;
        
        // 设置脚本相关的请求头
        scriptHeaders['Accept'] = '*/*';
        scriptHeaders['Sec-Fetch-Dest'] = 'script';
        scriptHeaders['Accept-Language'] = 'zh-CN,zh;q=0.9,en;q=0.8';
        scriptHeaders['Connection'] = 'keep-alive';
        
        // 添加安全相关的请求头
        scriptHeaders['Sec-Fetch-Mode'] = 'no-cors';
        scriptHeaders['Sec-Fetch-Site'] = 'same-site';
        
        // 添加移动设备UA
        if (absoluteUrl.includes('m.baidu.com') || absoluteUrl.includes('/m/') || absoluteUrl.includes('miao.baidu.com')) {
          scriptHeaders['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
        }
      }
      
      this.log('使用以下请求头获取脚本:', JSON.stringify(scriptHeaders));
      
      // 将脚本请求添加到待处理队列
      this.pendingRequests[requestId] = {
        type: 'script',
        url: absoluteUrl,
        baseUrl: baseUrl,
        timestamp: Date.now()
      };
      
      // 发送请求到Flutter
      this.sendRequest('GET', absoluteUrl, scriptHeaders, requestId);
    }
  
    /**
     * 处理CSS响应
     * @param {string} url - CSS资源URL
     * @param {string} cssContent - CSS内容
     * @param {string} requestId - 请求ID
     */
    processCssResponse(url, cssContent, requestId) {
      this.log('处理CSS响应:', url);
      
      try {
        // 解析CSS中的@import和url()引用
        this.processCssImportsAndUrls(cssContent, url);
      } catch (error) {
        this.logError('Error processing CSS response:', error);
      }
    }
    
    /**
     * 处理CSS中的@import和url()引用
     * @param {string} cssContent - CSS内容
     * @param {string} baseUrl - 基础URL，用于解析相对路径
     */
    processCssImportsAndUrls(cssContent, baseUrl) {
      try {
        // 提取@import规则
        const importRegex = /@import\s+(?:url\(\s*)?['"]?([^'"\)\s]+)['"]?\s*\)?\s*;/g;
        let importMatch;
        
        while ((importMatch = importRegex.exec(cssContent)) !== null) {
          const importUrl = importMatch[1];
          if (importUrl) {
            // 解析相对URL
            const absoluteUrl = this.resolveRelativeUrl(importUrl, baseUrl);
            this.log('加载CSS @import:', absoluteUrl);
            this.fetchExternalResource(absoluteUrl, 'stylesheet', baseUrl);
          }
        }
        
        // 提取url()引用
        const urlRegex = /url\(\s*['"]?([^'"\)\s]+)['"]?\s*\)/g;
        let urlMatch;
        
        while ((urlMatch = urlRegex.exec(cssContent)) !== null) {
          const resourceUrl = urlMatch[1];
          if (resourceUrl && !resourceUrl.startsWith('data:')) {
            // 解析相对URL
            const absoluteUrl = this.resolveRelativeUrl(resourceUrl, baseUrl);
            this.log('加载CSS url()资源:', absoluteUrl);
            this.fetchExternalResource(absoluteUrl, '', baseUrl);
          }
        }
      } catch (error) {
        this.logError('Error processing CSS imports and URLs:', error);
      }
    }
    
    /**
     * 解析相对URL
     * @param {string} relativeUrl - 相对URL
     * @param {string} baseUrl - 基础URL
     * @returns {string} 绝对URL
     */
    resolveRelativeUrl(relativeUrl, baseUrl) {
      try {
        // 如果已经是绝对URL，直接返回
        if (relativeUrl.match(/^(https?:|data:|\/\/)/) || !baseUrl) {
          return relativeUrl;
        }
        
        // 创建URL对象来解析相对路径
        return new URL(relativeUrl, baseUrl).href;
      } catch (error) {
        this.logError('Error resolving relative URL:', error);
        return relativeUrl; // 出错时返回原始URL
      }
    }
    
    /**
     * 处理cookies
     * @param {string} cookies - cookie字符串
     * @param {string} baseUrl - 基础URL
     */
    processCookies(cookies, baseUrl) {
      this.log('处理cookies');
      // 这里可以添加特定的cookie处理逻辑
    }
    
    /**
     * 处理脚本内容
     * @param {object} data - 脚本数据
     * @param {boolean} data.isExternal - 是否是外部脚本
     * @param {string} data.content - 脚本内容
     * @param {string} data.url - 脚本URL或基础URL
     */
    processScript(data) {
      try {
        this.log(`处理${data.isExternal ? '外部' : '内联'}脚本:`, data.url);
        
        const scriptContent = data.content;
        if (!scriptContent || scriptContent.trim() === '') {
          this.log('脚本内容为空，跳过处理');
          return;
        }
        
        // 检查脚本是否包含关键的API或函数
        const containsKeyAPI = (
          scriptContent.includes('XMLHttpRequest') ||
          scriptContent.includes('fetch(') ||
          scriptContent.includes('$.ajax') ||
          scriptContent.includes('axios')
        );
        
        // 检查脚本是否包含关键的DOM操作
        const containsDOMManipulation = (
          scriptContent.includes('document.getElementById') ||
          scriptContent.includes('document.querySelector') ||
          scriptContent.includes('document.getElementsBy') ||
          scriptContent.includes('innerHTML') ||
          scriptContent.includes('appendChild') ||
          scriptContent.includes('removeChild')
        );
        
        // 检查脚本是否包含事件监听器
        const containsEventListeners = (
          scriptContent.includes('addEventListener') ||
          scriptContent.includes('onclick') ||
          scriptContent.includes('onload') ||
          scriptContent.includes('DOMContentLoaded')
        );
        
        // 检查脚本是否包含JSON处理
        const containsJSONProcessing = (
          scriptContent.includes('JSON.parse') ||
          scriptContent.includes('JSON.stringify')
        );
        
        // 记录脚本特征
        if (containsKeyAPI) this.log('脚本包含网络请求API');
        if (containsDOMManipulation) this.log('脚本包含DOM操作');
        if (containsEventListeners) this.log('脚本包含事件监听器');
        if (containsJSONProcessing) this.log('脚本包含JSON处理');
        
        // 检查脚本是否包含百度特定的API或函数
        const containsBaiduAPI = (
          scriptContent.includes('baiduboxapp') ||
          scriptContent.includes('swan.') ||
          scriptContent.includes('_hmt') ||
          scriptContent.includes('hm.baidu.com') ||
          scriptContent.includes('passport.baidu') ||
          scriptContent.includes('bdstatic')
        );
        
        if (containsBaiduAPI) {
          this.log('脚本包含百度特定API');
        }
        
        // 如果脚本包含关键功能，可以考虑执行它
        if (containsKeyAPI || containsDOMManipulation || containsEventListeners || containsJSONProcessing || containsBaiduAPI) {
          this.log('脚本包含关键功能，尝试执行');
          // 这里可以添加执行脚本的逻辑，但需要注意安全性
        }
      } catch (error) {
        this.logError('Error processing script:', error);
      }
    }
    
    /**
     * 处理JSON响应
     * @param {string} url - 响应URL
     * @param {object} jsonData - JSON数据
     * @param {string} requestId - 请求ID
     */
    processJsonResponse(url, jsonData, requestId) {
      try {
        this.log('处理JSON响应:', url);
        
        // 检查是否包含电话号码相关信息
        if (jsonData.data && jsonData.data.phoneNumber) {
          this.log('从JSON响应中提取电话号码信息');
          this.extractedData = { ...this.extractedData, ...jsonData.data };
        }
        
        // 检查是否包含错误信息
        if (jsonData.error) {
          this.logError('JSON响应包含错误:', jsonData.error);
        }
        
        // 处理特定的百度API响应
        if (url.includes('miao.baidu.com') || url.includes('banti.baidu.com')) {
          this.log('处理百度特定API响应');
          // 这里可以添加特定的百度API响应处理逻辑
        }
      } catch (error) {
        this.logError('Error processing JSON response:', error);
      }
    }
  
    /**
     * 获取外部样式表
     * @param {string} url - 样式表URL
     * @param {string} baseUrl - 基础URL，用于设置正确的Referer
     */
    fetchExternalStylesheet(url, baseUrl) {
      // 检查是否是本地文件路径，如果是则跳过
      if (url && (url.startsWith('/c:') || url.startsWith('c:') || url.includes('resource_interceptor.dart'))) {
        this.log('跳过本地文件路径样式表:', url);
        return;
      }
      
      // 确保URL是绝对路径
      const absoluteUrl = this.resolveRelativeUrl(url, baseUrl);
      this.log('获取外部样式表:', absoluteUrl);
      
      // 创建一个请求ID
      const requestId = this.generateRequestId();
      
      // 构建适合的请求头
      const cssHeaders = { ...headers };
      
      // 为所有百度域名请求添加统一的请求头
      if (absoluteUrl.includes('baidu.com') || absoluteUrl.includes('bcebos.com')) {
        // 设置正确的Referer和Origin
        cssHeaders['Referer'] = baseUrl || 'https://haoma.baidu.com/';
        cssHeaders['Origin'] = new URL(baseUrl || 'https://haoma.baidu.com/').origin;
        
        // 设置CSS相关的请求头
        cssHeaders['Accept'] = 'text/css,*/*;q=0.1';
        cssHeaders['Sec-Fetch-Dest'] = 'style';
        cssHeaders['Accept-Language'] = 'zh-CN,zh;q=0.9,en;q=0.8';
        cssHeaders['Connection'] = 'keep-alive';
        
        // 添加安全相关的请求头
        cssHeaders['Sec-Fetch-Mode'] = 'no-cors';
        cssHeaders['Sec-Fetch-Site'] = 'same-site';
        
        // 添加移动设备UA
        if (absoluteUrl.includes('m.baidu.com') || absoluteUrl.includes('/m/') || absoluteUrl.includes('miao.baidu.com')) {
          cssHeaders['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
        }
      }
      
      this.log('使用以下请求头获取样式表:', JSON.stringify(cssHeaders));
      
      // 将CSS请求添加到待处理队列
      this.pendingRequests[requestId] = {
        type: 'stylesheet',
        url: absoluteUrl,
        baseUrl: baseUrl,
        timestamp: Date.now()
      };
      
      // 发送请求到Flutter
      this.sendRequest('GET', absoluteUrl, cssHeaders, requestId);
    }
  
    /**
     * 处理JSON数据
     * @param {object} jsonData - JSON数据
     * @param {string} baseUrl - 基础URL
     */
    processJsonData(jsonData, baseUrl) {
      this.log('处理JSON数据');
      // 这里可以添加特定的JSON数据处理逻辑
    }
    
    /**
     * 处理CSS响应
     * @param {string} url - CSS资源URL
     * @param {string} cssContent - CSS内容
     * @param {string} requestId - 请求ID
     */
    processCssResponse(url, cssContent, requestId) {
      this.log('处理CSS响应:', url);
      
      try {
        // 解析CSS中的@import和url()引用
        this.processCssImportsAndUrls(cssContent, url);
      } catch (error) {
        this.logError('Error processing CSS response:', error);
      }
    }
    
    /**
     * 处理CSS中的@import和url()引用
     * @param {string} cssContent - CSS内容
     * @param {string} baseUrl - 基础URL，用于解析相对路径
     */
    processCssImportsAndUrls(cssContent, baseUrl) {
      try {
        // 提取@import规则
        const importRegex = /@import\s+(?:url\(\s*)?['"]?([^'"\)\s]+)['"]?\s*\)?\s*;/g;
        let importMatch;
        
        while ((importMatch = importRegex.exec(cssContent)) !== null) {
          const importUrl = importMatch[1];
          if (importUrl) {
            // 解析相对URL
            const absoluteUrl = this.resolveRelativeUrl(importUrl, baseUrl);
            this.log('加载CSS @import:', absoluteUrl);
            this.fetchExternalResource(absoluteUrl, 'stylesheet', baseUrl);
          }
        }
        
        // 提取url()引用
        const urlRegex = /url\(\s*['"]?([^'"\)\s]+)['"]?\s*\)/g;
        let urlMatch;
        
        while ((urlMatch = urlRegex.exec(cssContent)) !== null) {
          const resourceUrl = urlMatch[1];
          if (resourceUrl && !resourceUrl.startsWith('data:')) {
            // 解析相对URL
            const absoluteUrl = this.resolveRelativeUrl(resourceUrl, baseUrl);
            this.log('加载CSS url()资源:', absoluteUrl);
            this.fetchExternalResource(absoluteUrl, '', baseUrl);
          }
        }
      } catch (error) {
        this.logError('Error processing CSS imports and URLs:', error);
      }
    }
    
    /**
     * 解析相对URL
     * @param {string} relativeUrl - 相对URL
     * @param {string} baseUrl - 基础URL
     * @returns {string} 绝对URL
     */
    resolveRelativeUrl(relativeUrl, baseUrl) {
      try {
        // 如果已经是绝对URL，直接返回
        if (relativeUrl.match(/^(https?:|data:|\/\/)/) || !baseUrl) {
          return relativeUrl;
        }
        
        // 创建URL对象来解析相对路径
        return new URL(relativeUrl, baseUrl).href;
      } catch (error) {
        this.logError('Error resolving relative URL:', error);
        return relativeUrl; // 出错时返回原始URL
      }
    }
    
    /**
     * 处理cookies
     * @param {string} cookies - cookie字符串
     * @param {string} baseUrl - 基础URL
     */
    processCookies(cookies, baseUrl) {
      this.log('处理cookies');
      // 这里可以添加特定的cookie处理逻辑
    }
    
    /**
     * 处理脚本内容
     * @param {object} data - 脚本数据
     * @param {boolean} data.isExternal - 是否是外部脚本
     * @param {string} data.content - 脚本内容
     * @param {string} data.url - 脚本URL或基础URL
     */
    processScript(data) {
      try {
        this.log(`处理${data.isExternal ? '外部' : '内联'}脚本:`, data.url);
        
        const scriptContent = data.content;
        if (!scriptContent || scriptContent.trim() === '') {
          this.log('脚本内容为空，跳过处理');
          return;
        }
        
        // 检查脚本是否包含关键的API或函数
        const containsKeyAPI = (
          scriptContent.includes('XMLHttpRequest') ||
          scriptContent.includes('fetch(') ||
          scriptContent.includes('$.ajax') ||
          scriptContent.includes('axios')
        );
        
        // 检查脚本是否包含关键的DOM操作
        const containsDOMManipulation = (
          scriptContent.includes('document.getElementById') ||
          scriptContent.includes('document.querySelector') ||
          scriptContent.includes('document.getElementsBy') ||
          scriptContent.includes('innerHTML') ||
          scriptContent.includes('appendChild') ||
          scriptContent.includes('removeChild')
        );
        
        // 检查脚本是否包含事件监听器
        const containsEventListeners = (
          scriptContent.includes('addEventListener') ||
          scriptContent.includes('onclick') ||
          scriptContent.includes('onload') ||
          scriptContent.includes('DOMContentLoaded')
        );
        
        // 检查脚本是否包含JSON处理
        const containsJSONProcessing = (
          scriptContent.includes('JSON.parse') ||
          scriptContent.includes('JSON.stringify')
        );
        
        // 记录脚本特征
        if (containsKeyAPI) this.log('脚本包含网络请求API');
        if (containsDOMManipulation) this.log('脚本包含DOM操作');
        if (containsEventListeners) this.log('脚本包含事件监听器');
        if (containsJSONProcessing) this.log('脚本包含JSON处理');
        
        // 检查脚本是否包含百度特定的API或函数
        const containsBaiduAPI = (
          scriptContent.includes('baiduboxapp') ||
          scriptContent.includes('swan.') ||
          scriptContent.includes('_hmt') ||
          scriptContent.includes('hm.baidu.com') ||
          scriptContent.includes('passport.baidu') ||
          scriptContent.includes('bdstatic')
        );
        
        if (containsBaiduAPI) {
          this.log('脚本包含百度特定API');
        }
        
        // 如果脚本包含关键功能，可以考虑执行它
        if (containsKeyAPI || containsDOMManipulation || containsEventListeners || containsJSONProcessing || containsBaiduAPI) {
          this.log('脚本包含关键功能，尝试执行');
          // 这里可以添加执行脚本的逻辑，但需要注意安全性
        }
      } catch (error) {
        this.logError('Error processing script:', error);
      }
    }
    
    /**
     * 处理JSON响应
     * @param {string} url - 响应URL
     * @param {object} jsonData - JSON数据
     * @param {string} requestId - 请求ID
     */
    processJsonResponse(url, jsonData, requestId) {
      try {
        this.log('处理JSON响应:', url);
        
        // 检查是否包含电话号码相关信息
        if (jsonData.data && jsonData.data.phoneNumber) {
          this.log('从JSON响应中提取电话号码信息');
          this.extractedData = { ...this.extractedData, ...jsonData.data };
        }
        
        // 检查是否包含错误信息
        if (jsonData.error) {
          this.logError('JSON响应包含错误:', jsonData.error);
        }
        
        // 处理特定的百度API响应
        if (url.includes('miao.baidu.com') || url.includes('banti.baidu.com')) {
          this.log('处理百度特定API响应');
          // 这里可以添加特定的百度API响应处理逻辑
        }
      } catch (error) {
        this.logError('Error processing JSON response:', error);
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
        this.logError('发送结果时出错:', error);
      }
    }
  
    /**
     * 发送插件错误到Flutter
     * @param {string} errorMessage - 错误消息
     * @param {string} requestId - 请求ID
     */
    sendPluginError(errorMessage, requestId) {
      if (!window.flutter_inappwebview) {
        this.logError('Flutter接口不可用');
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
        this.logError('发送错误时出错:', error);
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
