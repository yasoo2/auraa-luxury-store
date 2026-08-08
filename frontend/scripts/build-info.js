/**
 * Stamp this build so anyone can tell which one they are looking at.
 *
 * Two things here used to lie:
 *
 *   public/build-info.txt said "Fri Oct 10 2025" and nothing ever rewrote it —
 *   a file whose whole purpose is to report the build time, frozen months in
 *   the past.
 *
 *   The prebuild step searched sw.js for `const BUILD_TIMESTAMP = Date.now();`
 *   and replaced it with a literal. It ran once; from then on the file held a
 *   literal, the pattern never matched again, and the script printed
 *   "✅ Cache timestamp updated" on every build without changing anything.
 *
 * Both now do what they say, and this script fails loudly if it cannot.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const publicDir = path.join(__dirname, '..', 'public');

const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (err) {
    // Building from a tarball with no git history is legitimate.
    return 'unknown';
  }
})();

const builtAt = new Date().toISOString();
const stamp = Date.now();

// 1. The marker the browser can fetch, and the admin screen can show.
fs.writeFileSync(
  path.join(publicDir, 'build-info.json'),
  `${JSON.stringify({ commit, builtAt, stamp }, null, 2)}\n`
);
// The old .txt is kept so nothing linking to it 404s, but it now tells the truth.
fs.writeFileSync(
  path.join(publicDir, 'build-info.txt'),
  `commit ${commit}\nbuilt   ${builtAt}\n`
);

// 2. The service worker's cache name, so a deploy actually invalidates it.
const swPath = path.join(publicDir, 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8');
const pattern = /const BUILD_TIMESTAMP = .*?;/;
if (!pattern.test(sw)) {
  console.error('❌ BUILD_TIMESTAMP not found in sw.js — the cache would not be busted');
  process.exit(1);
}
fs.writeFileSync(swPath, sw.replace(pattern, `const BUILD_TIMESTAMP = ${stamp};`));

console.log(`✅ build ${commit} at ${builtAt} — service worker cache stamped ${stamp}`);
