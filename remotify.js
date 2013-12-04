var manifest = chrome.runtime.getManifest();
var playerFrame;
var counter = 0;
var callbacks = {};
var activeTabId = null;

chrome.tabs.query({url: 'https://play.spotify.com/*'}, function(tabs) {
  if (!tabs.length) return;

  var port = chrome.tabs.connect(tabs[0].id, {name: 'remotify'});
  port.postMessage({type: "bridge_setup", version: manifest.version});
  port.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('R <<', request);
    switch(request.type) {
      case "bridge_setup_result":
        if (request.success) {
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
  port.onDisconnect.addListener(function() {
    document.body.removeChild(playerFrame);
    playerFrame = null;
  });

  window.addEventListener('message', function(e) {
    if (e.origin != 'https://play.spotify.com') return;
    var msg = {type: "message_from_player", payload: e.data};
    console.log('R >>', msg)
    port.postMessage(msg);
  });

  window.addEventListener('unload', function(e) {
    port.postMessage({type: 'bridge_teardown'});
    port.disconnect();
  });
});