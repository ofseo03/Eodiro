// 기존 장소 인덱스(data/places.sqlite)를 유지한 채 수동 검수 장소를 추가한다.
// 사용법: npm run add:places -- <추가 장소 JSON> [--strict]
//   --strict  이미 있는 ID가 하나라도 있으면 저장하지 않는다(기본은 덮어쓰기).
// 예시 형식은 data/manual-places.example.json, 부족한 동네별 템플릿은 `npm run gen:missing`, 필드 설명은 data/README.md 를 본다.
// 이름에 "(작성 필요)"가 남은 템플릿 항목은 실제 장소가 아니므로 저장하지 않는다.
import { readFile } from 'node:fs/promises';
import { placeIndexSchema, regions } from '../lib/contracts';
import { countPlacesByRegion, upsertPlaces } from '../lib/server/db';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const path = args.find(arg => !arg.startsWith('--'));
if (!path) { console.error('사용법: npm run add:places -- <추가 장소 JSON 경로> [--strict]'); process.exit(1); }

let raw: unknown;
try { raw = JSON.parse(await readFile(path, 'utf8')); }
catch { console.error(`파일을 읽지 못했습니다: ${path} (JSON 배열이어야 합니다)`); process.exit(1); }

const parsed = placeIndexSchema.array().min(1).safeParse(raw);
if (!parsed.success) {
  console.error('장소 형식 오류 — 아무것도 저장하지 않았습니다.');
  for (const issue of parsed.error.issues) {
    const [index, ...rest] = issue.path;
    const item = typeof index === 'number' && Array.isArray(raw) ? raw[index] as { id?: unknown } : undefined;
    const label = typeof index === 'number' ? `[${index}]${item && typeof item.id === 'string' ? ` ${item.id}` : ''}` : '';
    console.error(`  ${label}${rest.length ? ` ${rest.join('.')}` : ''}: ${issue.message}`);
  }
  process.exit(1);
}

const TODO_MARK = '(작성 필요)';
const unfilled = parsed.data.filter(p => p.name.includes(TODO_MARK));
if (unfilled.length) {
  console.error(`템플릿 자리표시자 ${unfilled.length}건이 남아 있습니다 — 아무것도 저장하지 않았습니다. 실제 장소로 채우고 이름의 "${TODO_MARK}"를 지우거나 항목을 삭제하세요.`);
  for (const p of unfilled.slice(0, 10)) console.error(`  ${p.id}: ${p.name}`);
  if (unfilled.length > 10) console.error(`  … 외 ${unfilled.length - 10}건`);
  process.exit(1);
}

try {
  const result = upsertPlaces(parsed.data, { strict });
  console.log(`추가 ${result.inserted}건, 덮어쓰기 ${result.updated}건 (${path})`);
  const counts = countPlacesByRegion();
  for (const regionId of new Set(parsed.data.map(p => p.regionId).filter(id => id !== null))) {
    const c = counts[regionId] ?? { cafe: 0, restaurant: 0, activity: 0 };
    const missing = (['cafe', 'restaurant', 'activity'] as const).filter(k => c[k] === 0)
      .map(k => ({ cafe: '카페', restaurant: '식당', activity: '놀거리' })[k]);
    const name = regions.find(r => r.id === regionId)?.name ?? regionId;
    console.log(`  ${name}(${regionId}): 카페 ${c.cafe} · 식당 ${c.restaurant} · 놀거리 ${c.activity}${missing.length ? ` → 아직 부족: ${missing.join(', ')}` : ' → 선택 가능'}`);
  }
} catch (error) {
  console.error(`저장 실패: ${error instanceof Error ? error.message : String(error)} 기존 데이터는 유지됩니다.`);
  process.exit(1);
}
