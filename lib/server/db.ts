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
