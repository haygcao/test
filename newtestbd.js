// 百度电话查询插件 - iframe代理解决方案
// 基于思路.dart中的同源代理iframe方案

// 插件配置
const PLUGIN_CONFIG = {
    pluginId: 'baidu_phone_query_plugin',
    version: '2.0.0',
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

// 主JS插件入口函数
function initiateQuery(phoneNumber, requestId) {
    console.log(`Starting query for phone: ${phoneNumber}, requestId: ${requestId}`);
    
    try {
        // 构建百度搜索URL
        const searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(phoneNumber)}&ie=utf-8`;
        
        // 构建代理URL
        const proxyUrl = `${PROXY_SCHEME}://${PROXY_HOST}${PROXY_PATH_FETCH}?targetUrl=${encodeURIComponent(searchUrl)}`;
        
        console.log(`Proxy URL: ${proxyUrl}`);
        
        // 创建沙盒iframe
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.sandbox = 'allow-scripts allow-forms allow-same-origin'; // 允许脚本、表单和同源操作
        
        // 设置iframe的src为代理URL
        iframe.src = proxyUrl;
        
        // 存储iframe引用
        activeIFrames.set(requestId, iframe);
        
        // iframe加载完成后注入解析脚本
        iframe.onload = function() {
            console.log(`Iframe loaded for requestId: ${requestId}`);
            
            try {
                // 注入解析脚本到iframe
                const script = iframe.contentDocument.createElement('script');
                script.textContent = getParsingScriptForIframeContext();
                iframe.contentDocument.head.appendChild(script);
                
                console.log(`Parsing script injected for requestId: ${requestId}`);
                
            } catch (error) {
                console.error(`Error injecting script for requestId ${requestId}:`, error);
                sendResultToFlutterViaPluginResultChannel({
                    requestId: requestId,
                    success: false,
                    error: `Script injection failed: ${error.message}`
                });
                cleanupIframe(requestId);
            }
        };
        
        // iframe加载错误处理
        iframe.onerror = function(error) {
            console.error(`Iframe load error for requestId ${requestId}:`, error);
            sendResultToFlutterViaPluginResultChannel({
                requestId: requestId,
                success: false,
                error: `Iframe load failed: ${error.message || 'Unknown error'}`
            });
            cleanupIframe(requestId);
        };
        
        // 将iframe添加到DOM
        document.body.appendChild(iframe);
        
        // 设置超时清理
        setTimeout(() => {
            if (activeIFrames.has(requestId)) {
                console.log(`Query timeout for requestId: ${requestId}`);
                sendResultToFlutterViaPluginResultChannel({
                    requestId: requestId,
                    success: false,
                    error: 'Query timeout'
                });
                cleanupIframe(requestId);
            }
        }, 30000); // 30秒超时
        
    } catch (error) {
        console.error(`Error in initiateQuery for requestId ${requestId}:`, error);
        sendResultToFlutterViaPluginResultChannel({
            requestId: requestId,
            success: false,
            error: `Query initiation failed: ${error.message}`
        });
    }
}

// 监听来自iframe的postMessage
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
