import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadLastRequest } from '../lib/storage';

test('saved town selections restore as districts without changing other preferences', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const saved = { townId: 'sillim-station', visitAt: '2030-01-02T10:00', maxWalkMeters: 300,
    composition: { 카페: 1, 식당: 1, 놀거리: 0 }, indoor: '실내' };
  let raw = JSON.stringify(saved);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: { getItem: () => raw },
  } });
  try {
    const restored = loadLastRequest();
    assert.deepEqual(restored, { ...saved, townId: '관악구' });
    assert.equal(loadLastRequest(), restored);
    raw = JSON.stringify({ ...saved, townId: '성동구' });
    assert.equal(loadLastRequest()?.townId, '성동구');
    raw = JSON.stringify({ ...saved, townId: 'unknown' });
    assert.equal(loadLastRequest()?.townId, null);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
