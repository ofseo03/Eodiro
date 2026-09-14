import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { districts } from '../lib/districts';
import { CATEGORY_IMAGES, DISTRICT_IMAGES, PHOTO_SLOTS } from '../lib/images';

test('every selectable district has its own character image', () => {
  assert.deepEqual(Object.keys(DISTRICT_IMAGES).sort(), districts.map(d => d.id).sort());
  assert.equal(new Set(Object.values(DISTRICT_IMAGES)).size, districts.length);
});

test('all 31 character assets are present and encoded as WebP', () => {
  const paths = [
    ...Object.values(DISTRICT_IMAGES).map(name => `regions/${name}.webp`),
    ...Object.values(CATEGORY_IMAGES).map(src => src.replace('/images/', '')),
    ...Object.entries(PHOTO_SLOTS).filter(([slot]) => slot !== 'hero').map(([, meta]) => meta.file),
  ];
  assert.equal(new Set(paths).size, 31);
  for (const path of paths) {
    const bytes = readFileSync(join(process.cwd(), 'public/images', path));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', path);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', path);
  }
});
