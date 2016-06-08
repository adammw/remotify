var sendBridgeRequest = function(request) {
  var payload = {
    id: 0,
    type: 'bridge_request',
    name: request,
    args: ['main'],
    appVendor: 'com.spotify',
    appVersion: '4.0.0'
  };

  chrome.tabs.query({url: 'https://play.spotify.com/*'}, function(tabs) {
    var tabId = tabs[0].id;

    chrome.tabs.executeScript(tabId, {file: 'content_script.js', runAt: 'document_end'}, function() {
      var port = chrome.tabs.connect(tabId, {name: 'remotify'});
      port.postMessage({type: 'message_from_player', payload: JSON.stringify(payload)});
      port.disconnect();
    });
  });
};

chrome.commands.onCommand.addListener(function(command) {
  switch(command) {
    case 'next-track':
      sendBridgeRequest('player_skip_to_next');
      break;
    case 'prev-track':
      sendBridgeRequest('player_skip_to_prev');
      break;
    case 'play-pause':
      sendBridgeRequest('player_play_toggle');
      break;
    case 'volume-up':
      sendBridgeRequest('player_volume_up');
      break;
    case 'volume-down':
      sendBridgeRequest('player_volume_down');
      break;
  }
});
