// Runs BEFORE the upstream bundle, because upstream reads its config from localStorage once at load.
// Sets personal defaults only for keys that were never stored, so the TizenTube settings screen still wins.
(function () {
  'use strict';
  var KEY = 'ytaf-configuration';
  var DEFAULTS = {
    // no autoplaying preview videos when a tile gets focus
    enablePreviews: false,
  };
  try {
    var config = {};
    try {
      config = JSON.parse(window.localStorage[KEY] || '{}');
    } catch (e) {
      config = {};
    }
    var changed = false;
    Object.keys(DEFAULTS).forEach(function (name) {
      if (config[name] === undefined) {
        config[name] = DEFAULTS[name];
        changed = true;
      }
    });
    if (changed) window.localStorage[KEY] = JSON.stringify(config);
  } catch (e) {
    console.error('[prelude] could not set defaults', e);
  }
})();
