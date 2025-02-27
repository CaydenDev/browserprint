let fingerprintValues = {};

chrome.runtime.sendMessage({ action: 'getFingerprintValues' }, (response) => {
  if (response && response.values) {
    fingerprintValues = response.values;
    applyProtections();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateFingerprintValues') {
    fingerprintValues = message.values;
    applyProtections();
    sendResponse({ success: true });
  }
  return true;
});

function applyProtections() {
  injectScript({
    code: `
      (function() {
        const originalFunctions = {};
        
        if (${fingerprintValues.userAgent ? true : false}) {
          Object.defineProperty(navigator, 'userAgent', {
            get: function() { return "${fingerprintValues.userAgent}"; }
          });
          
          Object.defineProperty(navigator, 'appVersion', {
            get: function() { return "${fingerprintValues.userAgent.split('Mozilla/')[1]}"; }
          });
          
          const isMac = ${fingerprintValues.userAgent?.includes('Mac') ? true : false};
          Object.defineProperty(navigator, 'platform', {
            get: function() { return isMac ? "MacIntel" : "Win32"; }
          });
          
          Object.defineProperty(navigator, 'vendor', {
            get: function() { return ${fingerprintValues.userAgent?.includes('Chrome') ? '"Google Inc."' : '""'}; }
          });
        }
        
        if (${fingerprintValues.canvasNoise > 0}) {
          const canvasNoise = ${fingerprintValues.canvasNoise};
          
          originalFunctions.getImageData = CanvasRenderingContext2D.prototype.getImageData;
          originalFunctions.toDataURL = HTMLCanvasElement.prototype.toDataURL;
          originalFunctions.toBlob = HTMLCanvasElement.prototype.toBlob;
          
          CanvasRenderingContext2D.prototype.getImageData = function() {
            const imageData = originalFunctions.getImageData.apply(this, arguments);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.floor(data[i] + (Math.random() - 0.5) * canvasNoise * 10);
              data[i+1] = Math.floor(data[i+1] + (Math.random() - 0.5) * canvasNoise * 10);
              data[i+2] = Math.floor(data[i+2] + (Math.random() - 0.5) * canvasNoise * 10);
            }
            
            return imageData;
          };
          
          HTMLCanvasElement.prototype.toDataURL = function() {
            const ctx = this.getContext('2d');
            if (ctx) {
              const imageData = ctx.getImageData(0, 0, this.width, this.height);
              ctx.putImageData(imageData, 0, 0);
            }
            return originalFunctions.toDataURL.apply(this, arguments);
          };
          
          HTMLCanvasElement.prototype.toBlob = function() {
            const ctx = this.getContext('2d');
            if (ctx) {
              const imageData = ctx.getImageData(0, 0, this.width, this.height);
              ctx.putImageData(imageData, 0, 0);
            }
            return originalFunctions.toBlob.apply(this, arguments);
          };
        }
        
        if (${true}) {
          if (window.RTCPeerConnection) {
            const originalRTCPeerConnection = window.RTCPeerConnection;
            window.RTCPeerConnection = function() {
              const pc = new originalRTCPeerConnection(...arguments);
              
              const originalCreateOffer = pc.createOffer;
              pc.createOffer = function() {
                const offerConstraints = arguments[0] || {};
                offerConstraints.offerToReceiveAudio = true;
                offerConstraints.offerToReceiveVideo = false;
                return originalCreateOffer.apply(this, [offerConstraints]);
              };
              
              return pc;
            };
            window.RTCPeerConnection.prototype = originalRTCPeerConnection.prototype;
          }
        }
        
        if (${fingerprintValues.languages?.length > 0}) {
          const spoofedLanguages = ${JSON.stringify(fingerprintValues.languages || ['en-US'])};
          
          Object.defineProperty(navigator, 'language', {
            get: function() { return spoofedLanguages[0]; }
          });
          
          Object.defineProperty(navigator, 'languages', {
            get: function() { return spoofedLanguages; }
          });
        }
        
        if (${fingerprintValues.screenOffset?.width > 0 || fingerprintValues.screenOffset?.height > 0}) {
          const widthOffset = ${fingerprintValues.screenOffset?.width || 0};
          const heightOffset = ${fingerprintValues.screenOffset?.height || 0};
          
          const originalScreen = window.screen;
          Object.defineProperties(window.screen, {
            'width': { get: function() { return originalScreen.width - widthOffset; } },
            'height': { get: function() { return originalScreen.height - heightOffset; } },
            'availWidth': { get: function() { return originalScreen.availWidth - widthOffset; } },
            'availHeight': { get: function() { return originalScreen.availHeight - heightOffset; } }
          });
        }
        
        if (${fingerprintValues.timezoneOffset !== undefined}) {
          const spoofedTimezoneOffset = ${fingerprintValues.timezoneOffset * 60};
          
          const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
          Date.prototype.getTimezoneOffset = function() {
            return spoofedTimezoneOffset;
          };
        }
        
        if (${fingerprintValues.hardwareConcurrency > 0}) {
          Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: function() { return ${fingerprintValues.hardwareConcurrency}; }
          });
        }
        
        if (${fingerprintValues.deviceMemory > 0}) {
          Object.defineProperty(navigator, 'deviceMemory', {
            get: function() { return ${fingerprintValues.deviceMemory}; }
          });
        }
        
        if (window.AudioContext || window.webkitAudioContext) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          const originalGetChannelData = AudioBuffer.prototype.getChannelData;
          
          AudioBuffer.prototype.getChannelData = function(channel) {
            const data = originalGetChannelData.call(this, channel);
            
            if (this.length < 1000) {
              const noise = ${fingerprintValues.canvasNoise * 0.0001};
              const noiseBuffer = new Float32Array(data.length);
              
              for (let i = 0; i < data.length; i++) {
                noiseBuffer[i] = data[i] + (Math.random() * 2 - 1) * noise;
              }
              
              return noiseBuffer;
            }
            
            return data;
          };
        }
        
        const originalDocumentFonts = document.fonts;
        if (originalDocumentFonts && originalDocumentFonts.check) {
          document.fonts.check = function() {
            if (Math.random() < 0.1) {
              return false;
            }
            return originalDocumentFonts.check.apply(this, arguments);
          };
        }
        
        console.log('[Browser Fingerprint Blocker] Protections applied');
      })();
    `
  });
}

function injectScript({ code }) {
  try {
    const script = document.createElement('script');
    script.textContent = code;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch (error) {
    console.error('[Browser Fingerprint Blocker] Error injecting script:', error);
  }
}