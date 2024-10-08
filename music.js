// 加载 axios 
function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadAxios() {
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js');
    console.log('Axios loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading Axios:', error);
    return false;
  }
}

const pageNum = 20;

function formatMusicItem(item) {
  return {
    id: item.id,
    title: item.title,
    artist:
      item?.allArtistNames ||
      item.artists?.map?.((s) => s.name).join(", ") ||
      item.user?.niceName,
    artwork: item?.headImg,
    urls: item?.fullClip?.urls,
  };
}

function formatArtistItem(item) {
  return {
    id: item.id,
    name: item.name,
    avatar: item.headImg,
  };
}

let lastQuery;
let lastMusicId;
async function searchMusic(query, page) {
  if (query !== lastQuery || page === 1) {
    lastMusicId = 0;
  }
  lastQuery = query;

  let data = JSON.stringify({
    searchType: "MV",
    key: query,
    sinceId: lastMusicId,
    size: pageNum,
    requestTagRows: [
      {
        key: "sortType",
        chosenTags: ["HOTTEST"],
      },
      {
        key: "source",
        chosenTags: ["-1"],
      },
      {
        key: "duration",
        chosenTags: ["-1"],
      },
    ],
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://search-api.yinyuetai.com/search/get_search_result.json",
    headers: {
      referrer: "https://www.yinyuetai.com/",
      accept: "application/json",
      "content-type": "application/json",
      wua: "YYT/1.0.0 (WEB;web;11;zh-CN;kADiV2jNJFy2ryvuyB5Ne)",
    },
    data: data,
  };

  // 使用 FlutterChannel 发送 XMLHttpRequest 请求信息
  FlutterChannel.postMessage(JSON.stringify({
    method: config.method,
    url: config.url,
    headers: config.headers,
    body: config.data, 
  }), window.location.origin);

  // 监听来自 Flutter 的响应
  return new Promise((resolve, reject) => {
    window.addEventListener('message', (event) => {
      if (event.source === window && event.data.type === 'xhrResponse') {
        const response = event.data.response;
        if (response.status >= 200 && response.status < 300) {
          // 处理响应数据
          const responseData = JSON.parse(response.responseText).data;
          lastMusicId = responseData[responseData.length - 1].id;
          resolve({
            isEnd: pageNum > responseData.length,
            data: responseData.map(formatMusicItem),
          });
        } else {
          reject(new Error(`HTTP error! status: ${response.status}`));
        }
      }
    });
  });
}

// async function searchArtist(query, page) {
//   // ... (代码不变，或者删除) 
// }

async function search(query, page, type) {
  if (type === "music") {
    return await searchMusic(query, page);
  } 
  // else if (type === "artist") {
  //   return await searchArtist(query, page);
  // }
}

async function getMediaSource(musicItem, quality) {
  // ... (代码不变) 
}

// let lastArtistId;
// let lastArtistSinceId = 0;
// let cacheExtendId;
// async function getArtistWorks(artistItem, page, type) {
//   // ... (代码不变，或者删除) 
// }

// 初始化
async function initialize() {
  const axiosLoaded = await loadAxios();
  if (axiosLoaded) {
    // 初始化完成后，通知 Flutter 插件已加载完成
    if (typeof FlutterChannel !== 'undefined') {
      FlutterChannel.postMessage('PluginReady'); 
    } else {
      console.error('FlutterChannel is not defined');
    }
  } else {
    console.error('Failed to load Axios.');
  }
}

// 初始化插件
initialize();

module.exports = {
  platform: "音悦台",
  author: '猫头猫',
  version: "0.0.1",
  supportedSearchType: ["music"],
  srcUrl:
    "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/yinyuetai/index.js",
  cacheControl: "no-cache",
  search,
  getMediaSource,
  // getArtistWorks,
};
