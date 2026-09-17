import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');
const section = source.slice(source.indexOf('const allowedRequestHosts'), source.indexOf('// Keep exact legacy'));
let middleware;
const context = { Set, URL, app: { use: fn => { middleware = fn; } } };
vm.runInNewContext(section, context);
const configured = JSON.parse(readFileSync(new URL('../angular.json', import.meta.url))).projects['commerce-template'].architect.build.options.security.allowedHosts;
const actual = JSON.parse(source.match(/new Set\((\[.*?\])\)/)[1]);
assert.deepEqual(actual, configured);
function check(host, forwardedHost, expected) {
  let status;
  let continued = false;
  middleware({ headers: { host, 'x-forwarded-host': forwardedHost } }, { status: value => { status = value; return { send() {} }; } }, () => { continued = true; });
  assert.equal(continued, expected, `${host} / ${forwardedHost}`);
  assert.equal(status, expected ? undefined : 400);
}
for (const host of configured) check(host, undefined, true);
check('localhost:4317', undefined, true);
check('127.0.0.1:4317', 'amarka.co', true);
for (const host of ['evil.example', 'amarka.co.evil.example', 'evil@amarka.co', 'amarka.co/path', 'amarka.co,evil.example', 'localhost:999999', undefined]) check(host, undefined, false);
check('amarka.co', 'evil.example', false);
check('amarka.co', 'amarka.co,evil.example', false);
console.log('Verified exact SSR hosts, port handling, forwarded host checks and HTTP 400 rejection.');
