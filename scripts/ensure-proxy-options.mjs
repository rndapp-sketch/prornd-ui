// proxyOptions.ts is gitignored so each machine can point the dev/preview
// proxy at its own backend without those IPs leaking into commits. But
// vite.config.ts imports it unconditionally, so a fresh clone (CI, a Jenkins
// checkout, a new developer) would fail with "Could not resolve
// ./proxyOptions". Run before dev/build/preview: if the file is missing,
// seed it from the tracked proxyOptions.default.ts. An existing local file is
// never overwritten.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'proxyOptions.ts');
const source = path.join(root, 'proxyOptions.default.ts');

if (!fs.existsSync(target)) {
    fs.copyFileSync(source, target);
    console.log('[ensure-proxy-options] proxyOptions.ts not found - created it from proxyOptions.default.ts');
}
