// 카카오로 채운 장소 중 현재 제외 규칙(키즈카페·만화카페·보드카페·구내식당 등)에 걸리는 것을 DB에서 지운다.
// 사용법: npm run prune:kakao [-- --dry-run]
// 지운 뒤 카테고리가 0이 된 동네는 `npm run fill:missing -- --apply` 로 다시 채운다(이미 있는 ID는 건너뛴다).
import { regions } from '../lib/contracts';
import { countPlacesByRegion, deletePlaces, readAllPlaces } from '../lib/server/db';
import { passesKakaoRules } from '../lib/server/kakao-places';

const dryRun = process.argv.includes('--dry-run');
const LABEL = { cafe: '카페', restaurant: '식당', activity: '놀거리' } as const;
const excluded = readAllPlaces().filter(p => !passesKakaoRules(p));
for (const p of excluded) console.log(`  ${p.regionId ?? '-'} · ${p.category ? LABEL[p.category] : '-'} · ${p.name} (${p.sourceCategory})`);
if (!excluded.length) { console.log('제외 규칙에 걸리는 장소가 없습니다.'); process.exit(0); }
if (dryRun) { console.log(`\n${excluded.length}건이 제외 대상입니다 (--dry-run 이라 지우지 않음).`); process.exit(0); }
const deleted = deletePlaces(excluded.map(p => p.id));
const counts = countPlacesByRegion();
const gaps = regions.filter(r => excluded.some(p => p.regionId === r.id)).map(r => {
  const c = counts[r.id] ?? { cafe: 0, restaurant: 0, activity: 0 };
  return { r, missing: (['cafe', 'restaurant', 'activity'] as const).filter(k => c[k] === 0).map(k => LABEL[k]) };
}).filter(g => g.missing.length);
console.log(`\n${deleted}건 삭제.`);
if (gaps.length) {
  console.log(`다시 부족해진 동네 ${gaps.length}곳:`);
  for (const g of gaps) console.log(`  ${g.r.name}(${g.r.id}): ${g.missing.join(', ')}`);
  console.log(`\n다시 채우려면: npm run fill:missing -- --region ${gaps.map(g => g.r.id).join(',')} --apply`);
} else console.log('모든 동네가 여전히 세 카테고리를 갖추고 있습니다.');
