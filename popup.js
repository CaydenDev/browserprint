const enabledToggle = document.getElementById('enabled');
const protectUserAgentToggle = document.getElementById('protectUserAgent');
const protectCanvasToggle = document.getElementById('protectCanvas');
const protectWebRTCToggle = document.getElementById('protectWebRTC');
const protectLanguageToggle = document.getElementById('protectLanguage');
const protectScreenToggle = document.getElementById('protectScreen');
const protectTimezoneToggle = document.getElementById('protectTimezone');
const protectHardwareToggle = document.getElementById('protectHardware');
const sessionRadio = document.getElementById('session');
const siteRadio = document.getElementById('site');
const timeRadio = document.getElementById('time');
const regenerateButton = document.getElementById('regenerate');
const statusText = document.getElementById('status');

chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
  if (response && response.settings) {
    const settings = response.settings;
    
    enabledToggle.checked = settings.enabled;
    protectUserAgentToggle.checked = settings.protectUserAgent;
    protectCanvasToggle.checked = settings.protectCanvas;
    protectWebRTCToggle.checked = settings.protectWebRTC;
    protectLanguageToggle.checked = settings.protectLanguage;
    protectScreenToggle.checked = settings.protectScreen;
    protectTimezoneToggle.checked = settings.protectTimezone;
    protectHardwareToggle.checked = settings.protectHardware;
    
    switch (settings.randomizationInterval) {
      case 'session':
        sessionRadio.checked = true;
        break;
      case 'site':
        siteRadio.checked = true;
        break;
      case 'time':
        timeRadio.checked = true;
        break;
    }
    
    updateStatusText(settings.enabled);
  }
});

function saveSettings() {
  const settings = {
    enabled: enabledToggle.checked,
    protectUserAgent: protectUserAgentToggle.checked,
    protectCanvas: protectCanvasToggle.checked,
    protectWebRTC: protectWebRTCToggle.checked,
    protectLanguage: protectLanguageToggle.checked,
    protectScreen: protectScreenToggle.checked,
    protectTimezone: protectTimezoneToggle.checked,
    protectHardware: protectHardwareToggle.checked,
    randomizationInterval: getSelectedRandomizationInterval()
  };
  
  chrome.runtime.sendMessage({ 
    action: 'updateSettings', 
    settings: settings 
  }, () => {
    updateStatusText(settings.enabled);
  });
}

function getSelectedRandomizationInterval() {
  if (sessionRadio.checked) return 'session';
  if (siteRadio.checked) return 'site';
  if (timeRadio.checked) return 'time';
  return 'session';
}

function updateStatusText(enabled) {
  statusText.textContent = enabled ? 'Protection active' : 'Protection disabled';
  statusText.style.color = enabled ? '#4CAF50' : '#F44336';
}

enabledToggle.addEventListener('change', saveSettings);
protectUserAgentToggle.addEventListener('change', saveSettings);
protectCanvasToggle.addEventListener('change', saveSettings);
protectWebRTCToggle.addEventListener('change', saveSettings);
protectLanguageToggle.addEventListener('change', saveSettings);
protectScreenToggle.addEventListener('change', saveSettings);
protectTimezoneToggle.addEventListener('change', saveSettings);
protectHardwareToggle.addEventListener('change', saveSettings);
sessionRadio.addEventListener('change', saveSettings);
siteRadio.addEventListener('change', saveSettings);
timeRadio.addEventListener('change', saveSettings);

regenerateButton.addEventListener('click', () => {
  regenerateButton.textContent = 'Regenerating...';
  regenerateButton.disabled = true;
  
  chrome.runtime.sendMessage({ action: 'regenerateFingerprints' }, () => {
    regenerateButton.textContent = 'Fingerprints Regenerated!';
    
    setTimeout(() => {
      regenerateButton.textContent = 'Regenerate Fingerprints Now';
      regenerateButton.disabled = false;
    }, 1500);
  });
});