import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toBackendPreferences } from '../lib/api';
import { loadLastRequest, loadPreferences } from '../lib/storage';

test('saved town selections restore as districts without changing other preferences', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const saved = { townId: 'sillim-station', visitAt: '2030-01-02T10:00', maxWalkMeters: 300,
    composition: { 카페: 1, 식당: 1, 놀거리: 0 } };
  let raw = JSON.stringify({ ...saved, indoor: '실내' });
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

test('food types removed from the option list are dropped from saved preferences', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const saved = { foods: ['한식', '카페 디저트'], plays: ['전시'], moods: ['조용함'] };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: { getItem: () => JSON.stringify(saved) },
  } });
  try {
    assert.deepEqual(loadPreferences(), { foods: ['한식'], plays: ['전시'], moods: ['조용함'] });
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('legacy indoor preference is ignored while other preferences are preserved', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const saved = { foods: ['한식'], plays: ['전시'], moods: ['조용함'], indoor: '실외' };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: { getItem: () => JSON.stringify(saved) },
  } });
  try {
    const prefs = loadPreferences();
    assert.deepEqual(prefs, { foods: saved.foods, plays: saved.plays, moods: saved.moods });
    assert.equal(toBackendPreferences(prefs).environment, 'any');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
