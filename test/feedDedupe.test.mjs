import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync(new URL('../feedDedupe.js', import.meta.url), 'utf8');

function load(config) {
  const window = { localStorage: config ? { 'tt-custom-config': JSON.stringify(config) } : {}, _yttv: {} };
  const sandbox = { window, console: { info() {}, error: console.error }, JSON, Set, Array };
  window.JSON = sandbox.JSON = { parse: JSON.parse, stringify: JSON.stringify };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return { parse: window.JSON.parse, window };
}

const tile = (id, type = 'TILE_CONTENT_TYPE_VIDEO') => ({ tileRenderer: { contentId: id, contentType: type } });
const lockup = (id) => ({ lockupViewModel: { contentId: id, contentType: 'LOCKUP_CONTENT_TYPE_VIDEO' } });
const shelf = (...items) => ({ shelfRenderer: { content: { horizontalListRenderer: { items } } } });
const home = (...shelves) => ({ contents: { tvBrowseRenderer: { content: { tvSurfaceContentRenderer: { content: { sectionListRenderer: { contents: shelves } } } } } } });
const homeShelves = (r) => r.contents.tvBrowseRenderer.content.tvSurfaceContentRenderer.content.sectionListRenderer.contents;
// Array.from copies into this realm, the parsed arrays come from the vm context
const ids = (s) => Array.from(s.shelfRenderer.content.horizontalListRenderer.items, (i) => i.tileRenderer?.contentId ?? i.lockupViewModel?.contentId);

// 1. duplicates across shelves are removed, first occurrence wins
{
  const { parse } = load();
  const r = parse(JSON.stringify(home(shelf(tile('a'), tile('b')), shelf(tile('b'), tile('c')), shelf(lockup('a'), lockup('d')))));
  const s = homeShelves(r);
  assert.deepEqual(ids(s[0]), ['a', 'b']);
  assert.deepEqual(ids(s[1]), ['c']);
  assert.deepEqual(ids(s[2]), ['d']);
}

// 2. a shelf that becomes empty is dropped
{
  const { parse } = load();
  const r = parse(JSON.stringify(home(shelf(tile('a'), tile('b')), shelf(tile('a'), tile('b')), shelf(tile('c')))));
  const s = homeShelves(r);
  assert.equal(s.length, 2);
  assert.deepEqual(ids(s[1]), ['c']);
}

// 3. continuation responses share the page's seen set; a new home load resets it
{
  const { parse } = load();
  parse(JSON.stringify(home(shelf(tile('a')))));
  const cont = parse(JSON.stringify({ continuationContents: { sectionListContinuation: { contents: [shelf(tile('a'), tile('z'))] } } }));
  assert.deepEqual(ids(cont.continuationContents.sectionListContinuation.contents[0]), ['z']);
  const again = parse(JSON.stringify(home(shelf(tile('a')))));
  assert.deepEqual(ids(homeShelves(again)[0]), ['a']);
}

// 4. non-video items (channels, playlists) and items without ids are kept
{
  const { parse } = load();
  const r = parse(JSON.stringify(home(shelf(tile('ch', 'TILE_CONTENT_TYPE_CHANNEL'), { other: 1 }), shelf(tile('ch', 'TILE_CONTENT_TYPE_CHANNEL'), { other: 1 }))));
  const s = homeShelves(r);
  assert.equal(s[0].shelfRenderer.content.horizontalListRenderer.items.length, 2);
  assert.equal(s[1].shelfRenderer.content.horizontalListRenderer.items.length, 2);
}

// 5. the switch turns it off
{
  const { parse } = load({ enableFeedDedupe: false });
  const r = parse(JSON.stringify(home(shelf(tile('a')), shelf(tile('a')))));
  assert.equal(homeShelves(r).length, 2);
}

// 6. minimum shelf size drops sparse shelves
{
  const { parse } = load({ feedDedupeMinShelfItems: 2 });
  const r = parse(JSON.stringify(home(shelf(tile('a'), tile('b')), shelf(tile('a'), tile('c')))));
  assert.equal(homeShelves(r).length, 1);
}

// 7. non-feed JSON is untouched
{
  const { parse } = load();
  assert.deepEqual(parse('{"x":[1,2]}'), { x: [1, 2] });
  assert.equal(parse('null'), null);
}

console.log('feedDedupe: all tests passed');
