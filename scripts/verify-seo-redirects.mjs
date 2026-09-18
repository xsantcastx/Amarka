import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Run the actual server middleware, without starting Angular or requiring a build.
const server = readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');
const section = server.slice(server.indexOf('const legacyRedirects:'), server.indexOf('/**'))
  .replace('const legacyRedirects: Readonly<Record<string, string>>', 'const legacyRedirects');
let handler;
vm.runInNewContext(section, { Set, app: { use: fn => { handler = fn; } } });
const hosting = JSON.parse(readFileSync(new URL('../firebase.json', import.meta.url))).hosting;
assert.equal(hosting.trailingSlash, false);
assert.equal(hosting.cleanUrls, true);
for (const rule of hosting.redirects) {
  let next = false;
  let result;
  handler({ path: rule.source, url: rule.source }, { redirect: (status, destination) => { result = { status, destination }; } }, () => { next = true; });
  assert.equal(next, false, rule.source);
  assert.deepEqual(result, { status: 301, destination: rule.destination }, rule.source);
}
for (const path of ['/services/unknown', '/missing', '/enquire', '/design', '/']) {
  let next = false;
  handler({ path, url: path }, { redirect: () => assert.fail(`Unexpected redirect: ${path}`) }, () => { next = true; });
  assert.equal(next, true, path);
}
let target;
handler({ path: '/enquire/', url: '/enquire/?project=abc' }, { redirect: (_, destination) => { target = destination; } }, () => assert.fail('Expected redirect'));
assert.equal(target, '/enquire?project=abc');
console.log(`Verified ${hosting.redirects.length} permanent hosting/server redirects, unknown-route passthrough and query preservation.`);
