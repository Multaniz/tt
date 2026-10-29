# tt (tizentube-custom-feed)

Personal add-on for [TizenTube](https://github.com/reisxd/TizenTube) (GPL-3.0): one extra module, `feedDedupe.js`, that removes videos already shown in an earlier shelf of the same YouTube TV page.

`dist/userScript.js` is the current upstream bundle (`@foxreis/tizentube`) with the module appended. `build.mjs` regenerates it, and a nightly workflow does so automatically, so upstream fixes arrive without merging anything.

Settings (browser localStorage key `tt-custom-config`): `enableFeedDedupe` (default true), `feedDedupeMinShelfItems` (default 1).

Test: `node test/feedDedupe.test.mjs`. Build: `node build.mjs`.

## License

GPL-3.0, same as upstream. `dist/userScript.js` is a combined work of the upstream TizenTube bundle (source: https://github.com/reisxd/TizenTube, npm package `@foxreis/tizentube`) and `feedDedupe.js`. The source of the added part is `feedDedupe.js`, the combination is produced by `build.mjs`. Upstream copyright notices are kept in the bundle.

## Releasing to the Shield

The patched TizenTube Cobalt app only fetches scripts from jsdelivr (the app's page policy blocks other hosts, and `@main` stayed stale for 25+ minutes). It is pinned to a git tag whose `dist/userScript.js` is the tiny stage-0 loader in `loader/loader.js`. At every app start the loader runs the last known bundle at once (pinned by exact commit, so never stale) and asks the GitHub API for the newest commit of the `stable` branch, which is used from the next start. To ship a new version, push the commit to `stable` (`git push origin <sha>:refs/heads/stable`); to roll back, push an older sha there. The APK only has to be rebuilt when the loader itself changes (`patch/make-loader-tag.ps1`, `patch/release.ps1`, kept in the working folder, not in this repo).
