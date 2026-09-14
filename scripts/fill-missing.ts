// 장소가 부족한 동네를 카카오 로컬 API로 채운다. KAKAO_REST_API_KEY 가 .env.local 에 있어야 한다.
// 사용법: npm run fill:missing -- [--per 3] [--region hongje,amsa] [--apply]
//   --per N     부족한 카테고리마다 모을 장소 수(기본 3)
//   --region    쉼표로 구분한 동네 ID만 처리(기본: 부족한 동네 전부)
//   --apply     결과를 data/places.sqlite 에 바로 추가. 없으면 data/manual-places.kakao.json 만 쓴다(검토 후 add:places 로 넣는다).
import { writeFile } from 'node:fs/promises';
import { regions, type Category } from '../lib/contracts';
import { countPlacesByRegion, upsertPlaces, readPlaceIds } from '../lib/server/db';
import { collectKakaoPlaces, KakaoPlacesError } from '../lib/server/kakao-places';

const args = process.argv.slice(2);
const option = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const per = Number(option('--per') ?? 3);
const only = option('--region')?.split(',').map(s => s.trim()).filter(Boolean);
const apply = args.includes('--apply');
if (!Number.isInteger(per) || per < 1 || per > 15) { console.error('--per 는 1~15 사이 정수여야 합니다'); process.exit(1); }
if (!process.env.KAKAO_REST_API_KEY) { console.error('KAKAO_REST_API_KEY 가 없습니다. .env.local 에 카카오 REST API 키를 넣으세요.'); process.exit(1); }

const CATEGORIES: Category[] = ['cafe', 'restaurant', 'activity'];
const LABEL = { cafe: '카페', restaurant: '식당', activity: '놀거리' } as const;
const counts = countPlacesByRegion();
const existing = readPlaceIds();
const targets = regions.filter(r => !only || only.includes(r.id)).map(region => {
  const c = counts[region.id] ?? { cafe: 0, restaurant: 0, activity: 0 };
  return { region, missing: CATEGORIES.filter(k => c[k] === 0) };
}).filter(t => t.missing.length);
if (only) for (const id of only) if (!regions.some(r => r.id === id)) { console.error(`알 수 없는 동네 ID: ${id}`); process.exit(1); }
console.log(`대상 동네 ${targets.length}곳, 카테고리마다 최대 ${per}건씩 검색합니다.`);

const collected = [];
const failed: string[] = [];
for (const { region, missing } of targets) {
  try {
    const places = await collectKakaoPlaces(region.id, missing, per, existing);
    for (const p of places) existing.add(p.id);
    collected.push(...places);
    const summary = missing.map(k => `${LABEL[k]} ${places.filter(p => p.category === k).length}/${per}`).join(' · ');
    const still = missing.filter(k => !places.some(p => p.category === k)).map(k => LABEL[k]);
    console.log(`  ${region.name}(${region.id}): ${summary}${still.length ? ` → 검색 결과 없음: ${still.join(', ')}` : ''}`);
  } catch (error) {
    failed.push(region.id);
    console.error(`  ${region.name}(${region.id}): 실패 — ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof KakaoPlacesError && error.fatal) { console.error('\n키·설정 문제라 나머지 동네도 같은 결과입니다. 위 안내를 확인한 뒤 다시 실행하세요.'); process.exit(1); }
  }
}

const out = 'data/manual-places.kakao.json';
await writeFile(out, JSON.stringify(collected, null, 2) + '\n');
console.log(`\n${collected.length}건 → ${out}${failed.length ? ` (실패 ${failed.length}곳: ${failed.join(', ')})` : ''}`);
if (!collected.length) process.exit(failed.length ? 1 : 0);
if (!apply) { console.log(`검토 후 넣으려면: npm run add:places -- ${out}`); process.exit(failed.length ? 1 : 0); }
const result = upsertPlaces(collected);
console.log(`DB 추가 ${result.inserted}건, 덮어쓰기 ${result.updated}건. 남은 부족 동네는 npm run gen:missing 으로 확인하세요.`);
process.exit(failed.length ? 1 : 0);
