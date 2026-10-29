// Builds dist/userScript.js = prelude.js (config defaults) + current upstream TizenTube bundle + feedDedupe.js.
// Upstream stays untouched, so updating means re-running this script, nothing to merge.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const UPSTREAM_URL = 'https://cdn.jsdelivr.net/npm/@foxreis/tizentube/dist/userScript.js';

const res = await fetch(UPSTREAM_URL);
if (!res.ok) throw new Error(`Upstream fetch failed: ${res.status}`);
const upstream = await res.text();
const prelude = fs.readFileSync(path.join(here, 'prelude.js'), 'utf8');
const custom = fs.readFileSync(path.join(here, 'feedDedupe.js'), 'utf8');

fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
fs.writeFileSync(path.join(here, 'dist', 'userScript.js'), `${prelude}\n;\n${upstream}\n;\n${custom}`);
console.log(`dist/userScript.js: prelude ${prelude.length} + upstream ${upstream.length} + custom ${custom.length} bytes`);
