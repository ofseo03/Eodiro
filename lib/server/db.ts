import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { placeSchema, placeIndexSchema, type Place } from '../contracts';

function openDb(readOnly = true) {
  const path = resolve(process.env.PLACE_DB_PATH || 'data/places.sqlite');
  if (readOnly) return new DatabaseSync(path, { readOnly: true });
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = DELETE; CREATE TABLE IF NOT EXISTS places (id TEXT PRIMARY KEY, region_id TEXT, payload TEXT NOT NULL); CREATE INDEX IF NOT EXISTS places_region ON places(region_id);');
  return db;
}

export function readPlaces(regionId: string): Place[] {
  const db = openDb();
  try {
    return db.prepare('SELECT payload FROM places WHERE region_id = ? ORDER BY id').all(regionId)
      .map(row => placeIndexSchema.parse(JSON.parse(String(row.payload))))
      .filter(p => p.category !== null && p.lat !== null && p.lng !== null)
      .map(p => placeSchema.parse(Object.fromEntries(Object.keys(placeSchema.shape).filter(key => key in p)
        .map(key => [key, p[key as keyof typeof p]]))));
  } finally { db.close(); }
}

export type Availability = Record<string, { cafe: number; restaurant: number; activity: number }>;

/** 동네별 카테고리 후보 수 (spec 2.3: 하나라도 0인 동네는 선택 불가). */
export function countPlacesByRegion(): Availability {
  const db = openDb();
  try {
    const counts: Availability = {};
    for (const row of db.prepare("SELECT region_id, json_extract(payload, '$.category') AS category, COUNT(*) AS n FROM places WHERE region_id IS NOT NULL AND json_extract(payload, '$.lat') IS NOT NULL AND json_extract(payload, '$.lng') IS NOT NULL GROUP BY region_id, category").all()) {
      const regionId = String(row.region_id), category = String(row.category);
      counts[regionId] ??= { cafe: 0, restaurant: 0, activity: 0 };
      if (category === 'cafe' || category === 'restaurant' || category === 'activity') counts[regionId][category] = Number(row.n);
    }
    return counts;
  } finally { db.close(); }
}

export function replaceCatalog(input: unknown) {
  const places = placeIndexSchema.array().min(1).parse(input);
  if (new Set(places.map(p => p.id)).size !== places.length) throw new Error('중복 장소 ID');
  const db = openDb(false);
  try {
    db.exec('BEGIN IMMEDIATE');
    db.exec('DROP TABLE places; CREATE TABLE places (id TEXT PRIMARY KEY, region_id TEXT, payload TEXT NOT NULL); CREATE INDEX places_region ON places(region_id);');
    const statement = db.prepare('INSERT INTO places (id, region_id, payload) VALUES (?, ?, ?)');
    for (const place of places) statement.run(place.id, place.regionId, JSON.stringify(placeIndexSchema.parse(place)));
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  finally { db.close(); }
  return places.length;
}
