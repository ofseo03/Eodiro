import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { placeSchema, placeIndexSchema, type Place } from '../contracts';

const SCHEMA = 'CREATE TABLE IF NOT EXISTS places (id TEXT PRIMARY KEY, region_id TEXT, payload TEXT NOT NULL); CREATE INDEX IF NOT EXISTS places_region ON places(region_id);';

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
      .map(row => placeIndexSchema.parse(JSON.parse(String(row.payload))))
      .filter(p => p.category !== null && p.lat !== null && p.lng !== null)
      .map(p => placeSchema.parse(Object.fromEntries(Object.keys(placeSchema.shape).filter(key => key in p)
        .map(key => [key, p[key as keyof typeof p]]))));
  } finally { db.close(); }
}

export type Availability = Record<string, { cafe: number; restaurant: number; activity: number }>;

/** 동네별 카테고리 후보 수 (spec 2.3: 하나라도 0인 동네는 선택 불가). */
export function countPlacesByRegion(): Availability {
  const db = openReadableDb();
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

/** 기존 인덱스를 유지한 채 장소를 추가한다(수동 검수 장소용). 같은 ID가 있으면 덮어쓰고, `strict`면 오류로 거부한다.
 * 한 건이라도 형식이 틀리면 전체를 저장하지 않는다. */
export function upsertPlaces(input: unknown, options: { strict?: boolean } = {}) {
  const places = placeIndexSchema.array().min(1).parse(input);
  if (new Set(places.map(p => p.id)).size !== places.length) throw new Error('중복 장소 ID');
  const db = openWritableDb();
  try {
    db.exec('BEGIN IMMEDIATE');
    const exists = db.prepare('SELECT 1 FROM places WHERE id = ?');
    const existing = places.filter(p => exists.get(p.id) !== undefined).map(p => p.id);
    if (options.strict && existing.length) throw new Error(`이미 있는 장소 ID: ${existing.join(', ')}`);
    const statement = db.prepare('INSERT INTO places (id, region_id, payload) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET region_id = excluded.region_id, payload = excluded.payload');
    for (const place of places) statement.run(place.id, place.regionId, JSON.stringify(place));
    db.exec('COMMIT');
    return { inserted: places.length - existing.length, updated: existing.length };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  finally { db.close(); }
}

export function replaceCatalog(input: unknown) {
  const places = placeIndexSchema.array().min(1).parse(input);
  if (new Set(places.map(p => p.id)).size !== places.length) throw new Error('중복 장소 ID');
  const db = openWritableDb();
  try {
    db.exec('BEGIN IMMEDIATE');
    db.exec(`DROP TABLE places; ${SCHEMA}`);
    const statement = db.prepare('INSERT INTO places (id, region_id, payload) VALUES (?, ?, ?)');
    for (const place of places) statement.run(place.id, place.regionId, JSON.stringify(placeIndexSchema.parse(place)));
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  finally { db.close(); }
  return places.length;
}
