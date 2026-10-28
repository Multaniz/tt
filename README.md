# tizentube-custom-feed

Personal add-on for [TizenTube](https://github.com/reisxd/TizenTube) (GPL-3.0): one extra module, `feedDedupe.js`, that removes videos already shown in an earlier shelf of the same YouTube TV page.

`dist/userScript.js` is the current upstream bundle (`@foxreis/tizentube`) with the module appended. `build.mjs` regenerates it, and a nightly workflow does so automatically, so upstream fixes arrive without merging anything.

Settings (browser localStorage key `tt-custom-config`): `enableFeedDedupe` (default true), `feedDedupeMinShelfItems` (default 1).

Test: `node test/feedDedupe.test.mjs`. Build: `node build.mjs`.
