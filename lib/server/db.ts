import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { placeSchema, type Place } from '../contracts';

const SCHEMA = 'CREATE TABLE IF NOT EXISTS places (id TEXT PRIMARY KEY, region_id TEXT NOT NULL, payload TEXT NOT NULL); CREATE INDEX IF NOT EXISTS places_region ON places(region_id);';

function dbPath() { return resolve(process.env.PLACE_DB_PATH || 'data/places.sqlite'); }

/** 쓰기용. 폴더와 테이블을 만든다. 배포 환경(Vercel 등)의 읽기 전용 파일시스템에서는 호출하지 않는다. */
function openWritableDb() {
  const path = dbPath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  // WAL은 -wal/-shm 파일을 만들어야 해서 읽기 전용 파일시스템에서 열 수 없다. 기본 저널 모드를 쓴다.
  db.exec(`PRAGMA busy_timeout = 5000; PRAGMA journal_mode = DELETE; ${SCHEMA}`);
  return db;
}

/** 읽기용. 파일이 없으면 만들지 않고, 있으면 읽기 전용으로 연다(읽기 전용 파일시스템 호환). */
function openReadableDb() {
  const path = dbPath();
  if (!existsSync(path)) throw new Error(`장소 캐시 없음: ${path}`);
  const db = new DatabaseSync(path, { readOnly: true });
  db.exec('PRAGMA busy_timeout = 5000');
  return db;
}

export function readPlaces(regionId: string): Place[] {
  const db = openReadableDb();
  try {
    return db.prepare('SELECT payload FROM places WHERE region_id = ? ORDER BY id').all(regionId)
      .map(row => placeSchema.parse(JSON.parse(String(row.payload))));
  } finally { db.close(); }
}

export type Availability = Record<string, { cafe: number; restaurant: number; activity: number }>;

/** 동네별 카테고리 후보 수 (spec 2.3: 하나라도 0인 동네는 선택 불가). */
export function countPlacesByRegion(): Availability {
  const db = openReadableDb();
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
  const db = openWritableDb();
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
