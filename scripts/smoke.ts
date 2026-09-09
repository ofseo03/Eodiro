import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { replaceCatalog } from '../lib/server/db';

const directory = mkdtempSync(resolve('.smoke-'));
const oldDb = process.env.PLACE_DB_PATH;
process.env.PLACE_DB_PATH = resolve(directory, 'places.sqlite');
const at = new Date(Date.now() + 86400000).toISOString();
const probe = createServer().listen(0, '127.0.0.1');
await once(probe, 'listening');
const port = (probe.address() as { port: number }).port;
await new Promise<void>(resolve => probe.close(() => resolve()));
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  env: { ...process.env, DATA_GO_KR_KEY: '', SEOUL_API_KEY: '', KAKAO_REST_API_KEY: '', NEXT_TELEMETRY_DISABLED: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
server.stdout.on('data', chunk => { logs += String(chunk); });
server.stderr.on('data', chunk => { logs += String(chunk); });
async function call(path: string, body?: unknown) {
  const response = await fetch(`http://127.0.0.1:${port}/api/${path}`, body === undefined ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { ready = (await call('health')).status === 200; } catch { /* server is starting */ }
    if (ready || server.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, `서버 시작 실패: ${logs}`);
  assert.equal((await call('regions')).data.regions.length, 5);
  const empty = await call('places?regionId=seongsu');
  assert.equal(empty.status, 503); assert.equal(empty.data.error.code, 'CATALOG_NOT_READY');
  const places = ['cafe', 'restaurant', 'activity'].map((category, index) => ({
    id: `test-${index}`, name: `테스트 전용 ${category}`, category, regionId: 'seongsu', district: '성동구', dong: '성수2가1동',
    lat: 37.544, lng: 127.054 + index * 0.0001, address: '테스트 주소', source: 'synthetic test only',
    sourceUrl: 'https://example.com/test', collectedAt: at,
  }));
  replaceCatalog(places);
  assert.equal((await call('places?regionId=seongsu')).data.places.length, 3);
  assert.equal((await call('places?regionId=unknown')).status, 400);
  assert.equal((await call('places?regionId=seongsu&preferences=secret')).status, 400);
  const body = { regionId: 'seongsu', fromId: 'test-0', toId: 'test-1', referenceAt: at, constraints: { modes: ['walk'] } };
  const walk = await call('routes', body);
  assert.equal(walk.status, 200); assert.equal(walk.data.status, 'ok'); assert.equal(walk.data.accuracy, 'estimated');
  const failed = await call('routes', { ...body, constraints: { modes: ['bus', 'taxi'] } });
  assert.equal(failed.data.status, 'route_failed'); assert.equal(failed.data.minutes, null);
  assert.equal((await call('routes', { ...body, preferences: { foods: ['한식'] } })).status, 400);
  assert.equal((await call('routes', { ...body, constraints: { modes: ['taxi'] } })).status, 400);
  assert.equal((await call('routes', { ...body, toId: 'nonexistent' })).status, 400);
  const evaluated = await call('courses/evaluate', { request: { regionId: 'seongsu', startAt: at }, placeIds: places.map(p => p.id) });
  assert.equal(evaluated.status, 200); assert.equal(evaluated.data.valid, true);
  assert.equal(evaluated.data.weather.status, 'unavailable'); assert.equal(evaluated.data.visits.length, 3);
  assert.equal((await call('courses/evaluate', { request: { regionId: 'seongsu', startAt: '2000-01-01T00:00:00Z' }, placeIds: places.map(p => p.id) })).status, 400);
  assert.equal((await call('missing')).status, 404);
  assert.equal((await call('capabilities')).data.transit.liveVerified, false);
  const malformed = await fetch(`http://127.0.0.1:${port}/api/routes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  const large = await fetch(`http://127.0.0.1:${port}/api/routes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: ' '.repeat(17000) });
  assert.equal(large.status, 413);
  console.log('HTTP smoke passed: actual Next.js server, isolated SQLite, routes/evaluation, validation and degraded states');
} finally {
  if (server.exitCode === null) { server.kill('SIGTERM'); await once(server, 'exit'); }
  if (oldDb === undefined) delete process.env.PLACE_DB_PATH; else process.env.PLACE_DB_PATH = oldDb;
  rmSync(directory, { recursive: true, force: true });
}
