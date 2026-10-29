// Removes videos that already appeared in an earlier shelf of the same page.
// Standalone IIFE: it wraps whatever JSON.parse is installed when it runs, so it must be
// appended AFTER the upstream TizenTube bundle. It touches no upstream internals.
(function () {
  'use strict';

  var CONFIG_KEY = 'tt-custom-config';
  var prevParse = JSON.parse;

  // Config is re-read at most every 2 s, JSON.parse runs for every YouTube response.
  var cached = null;
  var cachedAt = 0;
  function setting(key, fallback) {
    try {
      if (!cached || Date.now() - cachedAt > 2000) {
        cached = prevParse(window.localStorage[CONFIG_KEY] || '{}');
        cachedAt = Date.now();
      }
      return cached[key] === undefined ? fallback : cached[key];
    } catch (e) {
      return fallback;
    }
  }

  // Counters for checking on the TV that the item shapes really carry video ids.
  var stats = (window.__feedDedupeStats = { items: 0, withId: 0, removed: 0, responses: 0 });
  if (setting('feedDedupeDebug', true)) console.error('[feedDedupe] loaded');

  // Only plain videos are deduplicated. Channels, playlists and Shorts have no stable id here.
  function videoId(item) {
    var tile = item && item.tileRenderer;
    if (tile) {
      if (tile.contentType && tile.contentType !== 'TILE_CONTENT_TYPE_VIDEO') return null;
      return tile.contentId || (tile.onSelectCommand && tile.onSelectCommand.watchEndpoint && tile.onSelectCommand.watchEndpoint.videoId) || null;
    }
    var lockup = item && item.lockupViewModel;
    if (lockup) {
      if (lockup.contentType && lockup.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') return null;
      return lockup.contentId || null;
    }
    return null;
  }

  // Keeps the first occurrence of each video, drops shelves that end up too small.
  function dedupeSections(sections, seen, minShelfItems) {
    var removed = 0;
    for (var i = 0; i < sections.length; i++) {
      var list = sections[i] && sections[i].shelfRenderer && sections[i].shelfRenderer.content && sections[i].shelfRenderer.content.horizontalListRenderer;
      if (!list || !Array.isArray(list.items)) continue;

      var kept = [];
      for (var j = 0; j < list.items.length; j++) {
        var id = videoId(list.items[j]);
        stats.items++;
        if (id) stats.withId++;
        if (id && seen.has(id)) {
          removed++;
          continue;
        }
        if (id) seen.add(id);
        kept.push(list.items[j]);
      }
      list.items = kept;

      if (kept.length < minShelfItems && !list.continuations) {
        sections.splice(i, 1);
        i--;
      }
    }
    return removed;
  }

  // One Set per page load, shared with the continuation responses that follow it.
  var pageSeen = new Set();

  function process(r) {
    var minShelfItems = setting('feedDedupeMinShelfItems', 1);
    var removed = 0;

    var home = r && r.contents && r.contents.tvBrowseRenderer && r.contents.tvBrowseRenderer.content;
    var homeSections = home && home.tvSurfaceContentRenderer && home.tvSurfaceContentRenderer.content && home.tvSurfaceContentRenderer.content.sectionListRenderer && home.tvSurfaceContentRenderer.content.sectionListRenderer.contents;
    if (Array.isArray(homeSections)) {
      pageSeen = new Set();
      removed += dedupeSections(homeSections, pageSeen, minShelfItems);
    }

    var navSections = home && home.tvSecondaryNavRenderer && home.tvSecondaryNavRenderer.sections;
    if (Array.isArray(navSections)) {
      navSections.forEach(function (section) {
        var tabs = section && section.tvSecondaryNavSectionRenderer && section.tvSecondaryNavSectionRenderer.tabs;
        if (!Array.isArray(tabs)) return;
        tabs.forEach(function (tab) {
          var content = tab && tab.tabRenderer && tab.tabRenderer.content && tab.tabRenderer.content.tvSurfaceContentRenderer && tab.tabRenderer.content.tvSurfaceContentRenderer.content;
          var contents = content && content.sectionListRenderer && content.sectionListRenderer.contents;
          if (!Array.isArray(contents)) return;
          pageSeen = new Set();
          removed += dedupeSections(contents, pageSeen, minShelfItems);
        });
      });
    }

    var search = r && r.contents && r.contents.sectionListRenderer && r.contents.sectionListRenderer.contents;
    if (Array.isArray(search)) {
      pageSeen = new Set();
      removed += dedupeSections(search, pageSeen, minShelfItems);
    }

    var continuation = r && r.continuationContents && r.continuationContents.sectionListContinuation && r.continuationContents.sectionListContinuation.contents;
    if (Array.isArray(continuation)) {
      removed += dedupeSections(continuation, pageSeen, minShelfItems);
    }

    if (homeSections || navSections || search || continuation) {
      stats.responses++;
      // console.error because the Cobalt log on the Shield only reliably shows error level
      if (setting('feedDedupeDebug', true)) {
        console.error('[feedDedupe] response ' + stats.responses + ' items=' + stats.items + ' withId=' + stats.withId + ' removedTotal=' + (stats.removed + removed));
      }
    }
    if (removed > 0) {
      stats.removed += removed;
      window.__feedDedupe = stats.removed;
      console.info('[feedDedupe] removed ' + removed + ' duplicate videos');
    }
  }

  JSON.parse = function () {
    var r = prevParse.apply(this, arguments);
    try {
      if (setting('enableFeedDedupe', true)) process(r);
    } catch (e) {
      console.error('[feedDedupe] failed, response left untouched:', e);
    }
    return r;
  };

  // Same re-wiring the upstream bundle does, so YouTube's own JSON copies use this parser too.
  window.JSON.parse = JSON.parse;
  for (var key in window._yttv) {
    if (window._yttv[key] && window._yttv[key].JSON && window._yttv[key].JSON.parse) {
      window._yttv[key].JSON.parse = JSON.parse;
    }
  }
})();
