// Tiny stage-0 loader. The patched APK points at a git tag of this repo whose dist/userScript.js is this file.
// It starts the last known bundle at once (no network wait, upstream must wrap JSON.parse early) and checks
// GitHub in the background for a newer commit on the `stable` branch, which is used from the next app start.
// Bundles are loaded by exact commit from jsdelivr, so they are never stale.
(function () {
  'use strict';
  var REPO = 'Multaniz/tt';
  var CHANNEL = 'stable';
  var KEY = 'tt-custom-sha';
  // Known good commit, used on first start and whenever a cached commit fails to load.
  var FALLBACK = '737774d9b480686743dffa9b2785393b75af2f46';

  var policy = null;
  try {
    policy = window.trustedTypes.createPolicy('tt-custom-loader', {
      createScriptURL: function (url) { return url; },
    });
  } catch (e) { /* no Trusted Types, plain assignment below */ }

  function store(value) {
    try { if (value) window.localStorage[KEY] = value; else window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  function load(sha) {
    var url = 'https://cdn.jsdelivr.net/gh/' + REPO + '@' + sha + '/dist/userScript.js';
    var el = document.createElement('script');
    el.async = false;
    el.onerror = function () {
      console.error('[tt-loader] bundle ' + sha + ' failed to load');
      if (sha !== FALLBACK) {
        store(null);
        load(FALLBACK);
      }
    };
    el.src = policy ? policy.createScriptURL(url) : url;
    (document.head || document.documentElement).appendChild(el);
  }

  var cached = null;
  try { cached = window.localStorage[KEY]; } catch (e) { /* ignore */ }
  var current = /^[0-9a-f]{40}$/.test(cached || '') ? cached : FALLBACK;
  load(current);

  // Background check, picked up on the next start.
  fetch('https://api.github.com/repos/' + REPO + '/commits/' + CHANNEL, { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (j && /^[0-9a-f]{40}$/.test(j.sha || '') && j.sha !== current) {
        store(j.sha);
        console.error('[tt-loader] update ready: ' + j.sha.slice(0, 7) + ', active after the next app start');
      }
    })
    .catch(function (e) { console.error('[tt-loader] update check failed: ' + e); });
})();
