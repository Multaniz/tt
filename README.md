# tt (tizentube-custom-feed)

Personal add-on for [TizenTube](https://github.com/reisxd/TizenTube) (GPL-3.0): one extra module, `feedDedupe.js`, that removes videos already shown in an earlier shelf of the same YouTube TV page.

`dist/userScript.js` is the current upstream bundle (`@foxreis/tizentube`) with the module appended. `build.mjs` regenerates it, and a nightly workflow does so automatically, so upstream fixes arrive without merging anything.

Settings (browser localStorage key `tt-custom-config`): `enableFeedDedupe` (default true), `feedDedupeMinShelfItems` (default 1).

Test: `node test/feedDedupe.test.mjs`. Build: `node build.mjs`.

## License

GPL-3.0, same as upstream. `dist/userScript.js` is a combined work of the upstream TizenTube bundle (source: https://github.com/reisxd/TizenTube, npm package `@foxreis/tizentube`) and `feedDedupe.js`. The source of the added part is `feedDedupe.js`, the combination is produced by `build.mjs`. Upstream copyright notices are kept in the bundle.

## Releasing to the Shield

The patched TizenTube Cobalt app reads this bundle from jsdelivr at a git tag (`@main` stayed stale on the Shield's edge for 25+ minutes, and the app's page policy only allows jsdelivr as a script host). To ship a new version, tag it (`git tag vN && git push origin vN`) and rebuild/install the APK with `patch/release.ps1 -Tag vN` (kept next to this repo in the working folder, not part of it).
