var manifest = chrome.runtime.getManifest();
var playerFrame;
var counter = 0;
var callbacks = {};
var activeTabId = null;

chrome.tabs.query({url: 'https://play.spotify.com/*'}, function(tabs) {
  if (!tabs.length) {
    document.querySelector('#loading-msg').classList.add('hidden');
    document.querySelector('#no-tab-msg').classList.remove('hidden');
    return;
  }

  var tabId = tabs[0].id;

  chrome.tabs.executeScript(tabId, {file: 'content_script.js', runAt: 'document_end'}, function() {
    var port = chrome.tabs.connect(tabId, {name: 'remotify'});

    port.postMessage({type: "bridge_setup", version: manifest.version});

    port.onMessage.addListener(function(request, sender, sendResponse) {
      console.log('R <<', request);
      switch(request.type) {
        case "bridge_setup_result":
          if (request.success) {
            document.querySelector('#loading-msg').classList.add('hidden');
            playerFrame = document.createElement('iframe');
            playerFrame.id = 'app-player';
            playerFrame.src = request.payload.url;
            playerFrame.frameBorder = 0;
            document.body.appendChild(playerFrame);
          }
          break;
        case "message_to_player":
          playerFrame.contentWindow.postMessage(request.payload, 'https://play.spotify.com');
          break;
        default:
          console.warn('[remotify] unhandled request type', request.type);
      }
    });

    var onMessage = function(e) {
      if (e.origin != 'https://play.spotify.com') return;
      var msg = {type: "message_from_player", payload: e.data};
      console.log('R >>', msg);
      port.postMessage(msg);
    };

    var onUnload = function(e) {
      port.postMessage({type: 'bridge_teardown'});
      port.disconnect();
    };

    window.addEventListener('message', onMessage);
    window.addEventListener('unload', onUnload);

    port.onDisconnect.addListener(function() {
      document.body.removeChild(playerFrame);
      playerFrame = null;

      window.removeEventListener('message', onMessage);
      window.removeEventListener('unload', onUnload);
    });
  });
});
