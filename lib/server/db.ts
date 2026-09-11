import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { placeSchema, type Place } from '../contracts';

function openDb() {
  const path = resolve(process.env.PLACE_DB_PATH || 'data/places.sqlite');
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS places (id TEXT PRIMARY KEY, region_id TEXT NOT NULL, payload TEXT NOT NULL); CREATE INDEX IF NOT EXISTS places_region ON places(region_id);');
  return db;
}

export function readPlaces(regionId: string): Place[] {
  const db = openDb();
  try {
    return db.prepare('SELECT payload FROM places WHERE region_id = ? ORDER BY id').all(regionId)
      .map(row => placeSchema.parse(JSON.parse(String(row.payload))));
  } finally { db.close(); }
}

export type Availability = Record<string, { cafe: number; restaurant: number; activity: number }>;

/** 동네별 카테고리 후보 수 (spec 2.3: 하나라도 0인 동네는 선택 불가). */
export function countPlacesByRegion(): Availability {
  const db = openDb();
  try {
    const counts: Availability = {};
    for (const row of db.prepare("SELECT region_id AS regionId, json_extract(payload, '$.category') AS category, COUNT(*) AS n FROM places GROUP BY region_id, category").all()) {
      const regionId = String(row.regionId), category = String(row.category);
      counts[regionId] ??= { cafe: 0, restaurant: 0, activity: 0 };
      if (category === 'cafe' || category === 'restaurant' || category === 'activity') counts[regionId][category] = Number(row.n);
    }
    return counts;
  } finally { db.close(); }
}

export function replaceCatalog(input: unknown) {
  const places = placeSchema.array().min(1).parse(input);
  if (new Set(places.map(p => p.id)).size !== places.length) throw new Error('중복 장소 ID');
  const db = openDb();
  try {
    db.exec('BEGIN IMMEDIATE');
    db.exec('DELETE FROM places');
    const statement = db.prepare('INSERT INTO places (id, region_id, payload) VALUES (?, ?, ?)');
    for (const place of places) statement.run(place.id, place.regionId, JSON.stringify(place));
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  finally { db.close(); }
  return places.length;
}
