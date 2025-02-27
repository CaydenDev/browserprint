const defaultSettings = {
  enabled: true,
  protectUserAgent: true,
  protectCanvas: true,
  protectWebRTC: true,
  protectLanguage: true,
  protectScreen: true,
  protectTimezone: true,
  protectHardware: true,
  randomizationInterval: 'session'
};

let fingerprintValues = {
  userAgent: '',
  canvasNoise: 0,
  languages: [],
  screenOffset: { width: 0, height: 0 },
  timezoneOffset: 0,
  hardwareConcurrency: 0,
  deviceMemory: 0
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('settings', (data) => {
    if (!data.settings) {
      chrome.storage.local.set({ settings: defaultSettings });
    }
    generateFingerprintValues();
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSettings') {
    chrome.storage.local.get('settings', (data) => {
      sendResponse({ settings: data.settings || defaultSettings });
    });
    return true;
  } else if (message.action === 'updateSettings') {
    chrome.storage.local.set({ settings: message.settings }, () => {
      generateFingerprintValues();
      sendResponse({ success: true });
    });
    return true;
  } else if (message.action === 'getFingerprintValues') {
    sendResponse({ values: fingerprintValues });
    return true;
  } else if (message.action === 'regenerateFingerprints') {
    generateFingerprintValues();
    sendResponse({ success: true, values: fingerprintValues });
    return true;
  }
});

function generateFingerprintValues() {
  chrome.storage.local.get('settings', (data) => {
    const settings = data.settings || defaultSettings;
    
    if (settings.enabled) {
      if (settings.protectUserAgent) {
        fingerprintValues.userAgent = generateRandomUserAgent();
      }
      
      if (settings.protectCanvas) {
        fingerprintValues.canvasNoise = Math.random() * 0.1;
      }
      
      if (settings.protectLanguage) {
        fingerprintValues.languages = generateRandomLanguages();
      }
      
      if (settings.protectScreen) {
        fingerprintValues.screenOffset = {
          width: Math.floor(Math.random() * 10),
          height: Math.floor(Math.random() * 10)
        };
      }
      
      if (settings.protectTimezone) {
        fingerprintValues.timezoneOffset = Math.floor(Math.random() * 26) - 12;
      }
      
      if (settings.protectHardware) {
        fingerprintValues.hardwareConcurrency = Math.floor(Math.random() * 14) + 2;
        fingerprintValues.deviceMemory = Math.pow(2, Math.floor(Math.random() * 5) + 1);
      }
    }
    
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateFingerprintValues',
          values: fingerprintValues
        }).catch(() => {
        });
      });
    });
  });
}

function generateRandomUserAgent() {
  const browsers = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 12.1; rv:95.0) Gecko/20100101 Firefox/95.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15'
  ];
  
  return browsers[Math.floor(Math.random() * browsers.length)];
}

function generateRandomLanguages() {
  const languages = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES', 'it-IT', 'ja-JP', 'zh-CN', 'ru-RU'];
  const numLanguages = Math.floor(Math.random() * 3) + 1;
  const result = [];
  
  result.push(languages[Math.floor(Math.random() * languages.length)]);
  
  for (let i = 1; i < numLanguages; i++) {
    const lang = languages[Math.floor(Math.random() * languages.length)];
    if (!result.includes(lang)) {
      result.push(lang);
    }
  }
  
  return result;
}

chrome.storage.local.get('settings', (data) => {
  const settings = data.settings || defaultSettings;
  if (settings.randomizationInterval === 'time') {
    setInterval(generateFingerprintValues, 60 * 60 * 1000);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    chrome.storage.local.get('settings', (data) => {
      const settings = data.settings || defaultSettings;
      if (settings.enabled && settings.randomizationInterval === 'site') {
        generateFingerprintValues();
      }
    });
  }
});