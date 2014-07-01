var manifest = chrome.runtime.getManifest(),
    log = {};

(function(log) {
  var header = '[remotify v' + manifest.version + ']';
  ["debug", "error", "info", "log", "warn"].forEach(function(key) {
    log[key] = function() {
      var args = Array.prototype.slice.call(arguments);
      if ('string' === typeof args[0]) {
        args[0] = header + ' ' + args[0];
      } else {
        args.unshift(header);
      }
      console[key].apply(console, args);
    };
  });
})(log);

log.log('content script running');

chrome.runtime.onConnect.addListener(function listener(port) {
  console.assert(port.name == "remotify");

  chrome.runtime.onConnect.removeListener(listener);

  var player = document.querySelector('#app-player');

  var sendMessageToPlayer = function(e) {
    if (e.origin != 'https://play.spotify.com') return;
    log.debug('[TO PLAYER] >>',e.origin,e.data);
    try {
      port.postMessage({type: "message_to_player", payload: e.data});
    } catch (e) {
      // assume all errors are fatal and remove ourselves
      player.contentWindow.removeEventListener('message', sendMessageToPlayer);
      port.disconnect();
    }
  };

  var bridgeTeardown = function() {
    log.log('bridge teardown...');
    player.contentWindow.removeEventListener('message', sendMessageToPlayer);
    port.disconnect();
  };

  port.onMessage.addListener(function(request) {
    log.debug('[REQ] <<', request);
    switch(request.type) {
      case "bridge_setup":
        if (!player) {
          port.postMessage({type: "bridge_setup_result", success: false, payload: null});
        } else {
          port.postMessage({
            type: "bridge_setup_result",
            success: true,
            payload: {
              height: player.offsetHeight,
              width: player.offsetWidth,
              url: player.src
            }
          });

          player.contentWindow.addEventListener('message', sendMessageToPlayer);
        }
        break;
      case "bridge_teardown":
        bridgeTeardown();
        break;
      case "message_from_player":
        log.debug('[FROM PLAYER] <<', request.payload);
        var e = new MessageEvent('message', {
          data: request.payload,
          origin: 'https://play.spotify.com',
          source: player.contentWindow
        });

        window.dispatchEvent(e);
        break;
      default:
        log.warn('unhandled request type', request.type);
    }
  });
  port.onDisconnect.addListener(function() {
    log.log('port disconnected...');
    bridgeTeardown();
  });
});
