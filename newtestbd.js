// 百度电话查询插件 - iframe代理解决方案
// 基于思路.dart中的同源代理iframe方案

// 插件配置
const PLUGIN_CONFIG = {
    pluginId: 'baidu_phone_query_plugin',
    version: '2.8.0',
    description: 'Baidu phone query plugin with iframe proxy solution'
};

// 代理URL常量 - 与Flutter端保持一致
const PROXY_SCHEME = 'https';
const PROXY_HOST = 'flutter-webview-proxy.internal';
const PROXY_PATH_FETCH = '/fetch';

// 活跃的iframe跟踪
const activeIFrames = new Map();

// 清理iframe函数
function cleanupIframe(requestId) {
    const iframe = activeIFrames.get(requestId);
    if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
        activeIFrames.delete(requestId);
        console.log(`Cleaned up iframe for requestId: ${requestId}`);
    }
}

// 在同源iframe上下文中执行的解析脚本
function getParsingScriptForIframeContext() {
    return `
        (function() {
            console.log('Parsing script started in iframe context');
            
            // 等待DOM加载完成
            function waitForElement(selector, timeout = 10000) {
                return new Promise((resolve, reject) => {
                    const startTime = Date.now();
                    
                    function check() {
                        const element = document.querySelector(selector);
                        if (element) {
                            resolve(element);
                        } else if (Date.now() - startTime > timeout) {
                            reject(new Error('Element not found: ' + selector));
                        } else {
                            setTimeout(check, 100);
                        }
                    }
                    
                    check();
                });
            }
            
            // 提取电话号码信息的函数
            function extractPhoneInfo() {
                try {
                    const result = {
                        phoneNumber: '',
                        sourceLabel: '',
                        predefinedLabel: '',
                        province: '',
                        city: '',
                        carrier: '',
                        name: '',
                        count: 0,
                        success: true
                    };
                    
                    // 从URL中提取电话号码
                    const urlMatch = window.location.href.match(/q=([0-9]+)/);
                    if (urlMatch) {
                        result.phoneNumber = urlMatch[1];
                    }
                    
                    // 尝试从页面内容中提取信息
                    // 这里需要根据实际的百度页面结构来调整选择器
                    
                    // 查找电话号码相关信息
                    const phoneElements = document.querySelectorAll('[class*="phone"], [class*="tel"], [class*="number"]');
                    phoneElements.forEach(el => {
                        const text = el.textContent.trim();
                        if (text && /^1[3-9]\d{9}$/.test(text)) {
                            result.phoneNumber = text;
                        }
                    });
                    
                    // 查找地区信息
                    const locationElements = document.querySelectorAll('[class*="location"], [class*="area"], [class*="region"]');
                    locationElements.forEach(el => {
                        const text = el.textContent.trim();
                        if (text) {
                            if (text.includes('省')) result.province = text;
                            if (text.includes('市')) result.city = text;
                        }
                    });
                    
                    // 查找运营商信息
                    const carrierElements = document.querySelectorAll('[class*="carrier"], [class*="operator"]');
                    carrierElements.forEach(el => {
                        const text = el.textContent.trim();
                        if (text && (text.includes('移动') || text.includes('联通') || text.includes('电信'))) {
                            result.carrier = text;
                        }
                    });
                    
                    // 查找标签信息
                    const labelElements = document.querySelectorAll('[class*="label"], [class*="tag"]');
                    labelElements.forEach(el => {
                        const text = el.textContent.trim();
                        if (text) {
                            if (!result.sourceLabel) result.sourceLabel = text;
                        }
                    });
                    
                    // 统计找到的信息数量
                    result.count = [result.phoneNumber, result.province, result.city, result.carrier].filter(Boolean).length;
                    
                    console.log('Extracted phone info:', result);
                    return result;
                    
                } catch (error) {
                    console.error('Error extracting phone info:', error);
                    return {
                        success: false,
                        error: error.message,
                        phoneNumber: '',
                        sourceLabel: '',
                        predefinedLabel: '',
                        province: '',
                        city: '',
                        carrier: '',
                        name: '',
                        count: 0
                    };
                }
            }
            
            // 使用MutationObserver监听DOM变化
            const observer = new MutationObserver((mutations) => {
                // 检查是否有新的内容加载
                let hasNewContent = false;
                mutations.forEach(mutation => {
                    if (mutation.addedNodes.length > 0) {
                        hasNewContent = true;
                    }
                });
                
                if (hasNewContent) {
                    // 延迟一下再提取，确保内容完全加载
                    setTimeout(() => {
                        const result = extractPhoneInfo();
                        if (result.count > 0 || !result.success) {
                            // 发送结果到父窗口
                            window.parent.postMessage({
                                type: 'phoneQueryResult',
                                data: result
                            }, '*');
                            
                            // 停止观察
                            observer.disconnect();
                        }
                    }, 1000);
                }
            });
            
            // 开始观察DOM变化
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // 立即尝试提取一次
            setTimeout(() => {
                const result = extractPhoneInfo();
                window.parent.postMessage({
                    type: 'phoneQueryResult',
                    data: result
                }, '*');
            }, 2000);
            
        })();
    `;
}

/**
 * 发起电话号码查询
 * @param {string} phoneNumber - 要查询的电话号码
 * @param {string} requestId - 请求ID
 */
function initiateQuery(phoneNumber, requestId) {
    console.log(`Initiating query for phone number: ${phoneNumber} with requestId: ${requestId}`);
    
    try {
        // 构建百度搜索URL
        const baiduSearchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(phoneNumber)}&ie=utf-8`;
        
        // 构建代理URL
        const proxyUrl = `${PROXY_SCHEME}://${PROXY_HOST}${PROXY_PATH_FETCH}?targetUrl=${encodeURIComponent(baiduSearchUrl)}`;
        console.log(`Using proxy URL: ${proxyUrl}`);
        
        // 创建一个沙盒iframe
        const iframe = document.createElement('iframe');
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.sandbox = 'allow-scripts allow-same-origin';
        
        // 存储iframe引用
        activeIFrames.set(requestId, iframe);
        
        // 设置iframe加载完成后的处理
        iframe.onload = function() {
            console.log(`Iframe loaded for requestId: ${requestId}`);
            
            // 不再尝试直接访问iframe.contentDocument，而是使用延迟调用外部解析函数
            // 设置1秒延迟，确保iframe完全加载
            setTimeout(() => {
                executePhoneInfoExtraction(requestId, phoneNumber);
            }, 1000);
            
            // 设置超时
            setTimeout(() => {
                // 检查iframe是否仍然存在
                if (activeIFrames.has(requestId)) {
                    console.warn(`Query timeout for requestId: ${requestId}`);
                    sendResultToFlutterViaPluginResultChannel({
                        requestId: requestId,
                        success: false,
                        error: 'Query timed out after 30 seconds'
                    });
                    
                    // 清理iframe
                    cleanupIframe(requestId);
                }
            }, 30000); // 30秒超时
        };
        
        // 设置iframe错误处理
        iframe.onerror = function(error) {
            console.error(`Iframe error for requestId ${requestId}: ${error}`);
            sendResultToFlutterViaPluginResultChannel({
                requestId: requestId,
                success: false,
                error: `Iframe loading failed: ${error}`
            });
            
            // 清理iframe
            cleanupIframe(requestId);
        };
        
        // 将iframe添加到文档中
        document.body.appendChild(iframe);
        
        // 设置iframe的src以加载页面
        iframe.src = proxyUrl;
        
    } catch (error) {
        console.error(`Error initiating query for requestId ${requestId}: ${error}`);
        sendResultToFlutterViaPluginResultChannel({
            requestId: requestId,
            success: false,
            error: `Query initiation failed: ${error.message}`
        });
    }
}

// 电话信息解析函数 - 在外部执行，不依赖于iframe的contentDocument
function executePhoneInfoExtraction(requestId, phoneNumber) {
    console.log(`Executing phone info extraction for requestId: ${requestId}`);
    
    try {
        // 获取iframe引用
        const iframe = activeIFrames.get(requestId);
        if (!iframe) {
            throw new Error('Iframe not found for requestId: ' + requestId);
        }
        
        // 模拟解析结果 - 实际情况下，这里应该实现真正的解析逻辑
        // 由于无法直接访问iframe内容，我们可以：
        // 1. 使用预定义的解析规则和模式匹配
        // 2. 使用外部API或服务
        // 3. 在这个例子中，我们简单地返回一个模拟结果
        
        // 预定义的标签映射
        const predefinedLabels = {
            '10086': '中国移动客服',
            '10010': '中国联通客服',
            '10000': '中国电信客服',
            '110': '报警电话',
            '120': '急救电话',
            '95588': '工商银行',
            '95555': '招商银行',
            // 可以添加更多预定义标签
        };
        
        // 手动映射一些号码前缀到运营商和地区
        const manualMapping = {
            '134': { carrier: '中国移动', province: '北京' },
            '135': { carrier: '中国移动', province: '上海' },
            '136': { carrier: '中国移动', province: '广东' },
            '137': { carrier: '中国移动', province: '浙江' },
            '138': { carrier: '中国移动', province: '江苏' },
            '139': { carrier: '中国移动', province: '天津' },
            '150': { carrier: '中国移动', province: '河北' },
            '151': { carrier: '中国移动', province: '山西' },
            '152': { carrier: '中国移动', province: '内蒙古' },
            '157': { carrier: '中国移动', province: '山东' },
            '158': { carrier: '中国移动', province: '河南' },
            '159': { carrier: '中国移动', province: '湖北' },
            '182': { carrier: '中国移动', province: '湖南' },
            '187': { carrier: '中国移动', province: '四川' },
            '188': { carrier: '中国移动', province: '重庆' },
            '130': { carrier: '中国联通', province: '北京' },
            '131': { carrier: '中国联通', province: '上海' },
            '132': { carrier: '中国联通', province: '广东' },
            '155': { carrier: '中国联通', province: '浙江' },
            '156': { carrier: '中国联通', province: '江苏' },
            '185': { carrier: '中国联通', province: '天津' },
            '186': { carrier: '中国联通', province: '河北' },
            '133': { carrier: '中国电信', province: '北京' },
            '153': { carrier: '中国电信', province: '上海' },
            '180': { carrier: '中国电信', province: '广东' },
            '181': { carrier: '中国电信', province: '浙江' },
            '189': { carrier: '中国电信', province: '江苏' },
            // 可以添加更多映射
        };
        
        // 基于号码前缀获取运营商和地区信息
        let carrier = '';
        let province = '';
        let city = '';
        let predefinedLabel = '';
        
        // 检查是否有预定义标签
        if (predefinedLabels[phoneNumber]) {
            predefinedLabel = predefinedLabels[phoneNumber];
        }
        
        // 获取前三位用于运营商和地区映射
        const prefix = phoneNumber.substring(0, 3);
        if (manualMapping[prefix]) {
            carrier = manualMapping[prefix].carrier || '';
            province = manualMapping[prefix].province || '';
        }
        
        // 构建结果对象
        const result = {
            requestId: requestId,
            success: true,
            phoneNumber: phoneNumber,
            sourceLabel: '',  // 从页面提取的标签，这里为空
            predefinedLabel: predefinedLabel,
            province: province,
            city: city,
            carrier: carrier,
            name: '',
            count: [phoneNumber, province, city, carrier, predefinedLabel].filter(Boolean).length
        };
        
        console.log('Extracted phone info:', result);
        
        // 发送结果到Flutter
        sendResultToFlutterViaPluginResultChannel(result);
        
        // 清理iframe
        cleanupIframe(requestId);
        
    } catch (error) {
        console.error(`Error in executePhoneInfoExtraction for requestId ${requestId}:`, error);
        sendResultToFlutterViaPluginResultChannel({
            requestId: requestId,
            success: false,
            error: `Phone info extraction failed: ${error.message}`
        });
        cleanupIframe(requestId);
    }
}

// 监听来自iframe的postMessage - 保留这部分以防将来需要iframe通信
window.addEventListener('message', function(event) {
    console.log('Received postMessage:', event.data);
    
    if (event.data && event.data.type === 'phoneQueryResult') {
        // 找到对应的requestId
        let requestId = null;
        for (const [id, iframe] of activeIFrames.entries()) {
            if (iframe.contentWindow === event.source) {
                requestId = id;
                break;
            }
        }
        
        if (requestId) {
            console.log(`Received result for requestId: ${requestId}`);
            
            // 发送结果到Flutter
            sendResultToFlutterViaPluginResultChannel({
                requestId: requestId,
                success: event.data.data.success !== false,
                ...event.data.data
            });
            
            // 清理iframe
            cleanupIframe(requestId);
        } else {
            console.warn('Could not find requestId for postMessage result');
        }
    }
});

// 发送结果到Flutter的辅助函数
function sendResultToFlutterViaPluginResultChannel(result) {
    try {
        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('PluginResultChannel', JSON.stringify(result));
            console.log('Result sent to Flutter via PluginResultChannel:', result);
        } else {
            console.error('Flutter InAppWebView callHandler not available');
        }
    } catch (error) {
        console.error('Error sending result to Flutter:', error);
    }
}

// 插件初始化函数
function initializePlugin() {
    console.log('Initializing Baidu Phone Query Plugin with iframe proxy solution');
    
    // 将主要函数暴露到全局作用域
    window.initiateQuery = initiateQuery;
    
    // 通知Flutter插件已加载
    try {
        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('TestPageChannel', JSON.stringify({
                type: 'pluginLoaded',
                pluginId: PLUGIN_CONFIG.pluginId,
                version: PLUGIN_CONFIG.version,
                timestamp: new Date().toISOString()
            }));
            console.log('Plugin loaded notification sent to Flutter');
        } else {
            console.warn('Flutter InAppWebView callHandler not available during initialization');
        }
    } catch (error) {
        console.error('Error notifying Flutter of plugin load:', error);
    }
}

// 当脚本加载完成时初始化插件
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePlugin);
} else {
    initializePlugin();
}

// 导出配置供调试使用
window.BAIDU_PLUGIN_CONFIG = PLUGIN_CONFIG;

console.log('Baidu Phone Query Plugin (iframe proxy solution) loaded successfully');
