var pgxn_url = 'http://pgxn.org';
var recent_dist_url = 'http://master.pgxn.org/stats/dist.json';
var api_url = 'http://api.pgxn.org/search/dists?l=10&q=';

chrome.browserAction.onClicked.addListener(function(tab) {
  selectOrCreateTab(pgxn_url);
});
chrome.omnibox.onInputEntered.addListener(function(text) {
  searchOnPGXN(text);
});
chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
  var suggestions = [];
  if(text.length > 0) {
    var obj = getSuggestions(text);
    for(var i = 0, len = obj.hits.length; i < len; i++) {
      console.log(obj.hits[i].dist);
      var tmp = {
        content : obj.hits[i].dist,
        description : obj.hits[i].abstract + ' ' + obj.hits[i].user
      };
      suggestions.push(tmp);
    }
  }
  suggest(suggestions);
});
/*
 * Get suggestions from pgxn.org
 */
function getSuggestions(text) {
  var query = api_url + text;
  var xhr = new XMLHttpRequest();
  xhr.open("GET", query, false);
  xhr.send();
  return JSON.parse(xhr.responseText);
}

/*
 * Search on pgxn.org
 */
function searchOnPGXN(text) {
  var target_url = encodeURI(pgxn_url + '/search?in=dists&q=' + text);
  selectOrCreateTab(target_url);
}

/*
 * Create tab
 */
function selectOrCreateTab(url) {
  chrome.tabs.getAllInWindow(null, function(tabs) {
    for(var i = 0, len = tabs.length; i < len; i++) {
      if(tabs[i].url == url) {
        chrome.tabs.update(tabs[i].id, {
          selected : true
        });
        return;
      }
    }
    chrome.tabs.create({
      url : url
    });
  });
}

// Default settings
if(!localStorage.getItem('settings')) {
  var settings = {
    notify : true,
    display : 10
  };
  localStorage.setItem('settings', JSON.stringify(settings));
}

/*
 * Check PGXN update
 */
var notified = {};
function loadFeed() {
  var settings = JSON.parse(localStorage.getItem('settings'));
  if(settings.notify) {
    var query = recent_dist_url;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", query, false);
    xhr.send();
    var res = JSON.parse(xhr.responseText);
    var rows = res.recent;
    var len = rows.length > 10 ? 10 : rows.length;
    for(var i = 0; i < len; i++) {
      var name = rows[i].dist;
      if(rows[i].version) {
        name += ' ' + rows[i].version;
      }
      var message = rows[i].abstract;
      var link = pgxn_url + '/dist/' + rows[i].dist;
      if(!notified[name]) {
        notify(name, message, link, settings.display);
        notified[name] = true;
      }
    }
  }
  setTimeout(loadFeed, 10000);
}

loadFeed();

var n;
function notify(title, message, link, display) {
  if(webkitNotifications.checkPermission() == 0) {
    n = webkitNotifications.createNotification('icons/pgxn-32.png', title, message);
    n.ondisplay = function() {
      setTimeout(function() {
        n.cancel();
      }, display * 1000);
    };
    n.onclick = function() {
      selectOrCreateTab(link);
      n.cancel();
    };
    n.show();
  } else {
    webkitNotifications.requestPermission();
  }
}