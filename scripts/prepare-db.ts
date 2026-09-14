// 배포 빌드 전에 장소 캐시(data/places.sqlite)가 없으면 샘플 장소로 채운다.
// 실제 검수 데이터를 쓰려면 빌드 전에 `npm run import:places -- <json>` 을 먼저 실행하거나 DB 파일을 두면 된다.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { replaceCatalog } from '../lib/server/db';
import sample from '../data/sample-places.json' with { type: 'json' };

const path = resolve(process.env.PLACE_DB_PATH || 'data/places.sqlite');
if (existsSync(path)) console.log(`장소 캐시 유지: ${path}`);
else console.log(`장소 캐시 없음 → 샘플 ${replaceCatalog(sample)}건으로 생성: ${path}`);
