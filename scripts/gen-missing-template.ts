// 장소가 부족한 동네(카페·식당·놀거리 중 하나라도 0개)를 뽑아, 부족한 카테고리마다 채워 넣을 자리를 만든 템플릿을 생성한다.
// 사용법: npm run gen:missing
//   → data/missing-places.md         부족한 동네 목록(구별)
//   → data/manual-places.todo.json   부족한 칸마다 한 건씩 들어 있는 add:places 입력 템플릿
// 템플릿 항목의 이름은 "(작성 필요)"로 시작하며, add:places 는 이 표식이 남은 항목을 저장하지 않는다.
import { writeFile } from 'node:fs/promises';
import boundaries from '../config/region-boundaries.json' with { type: 'json' };
import { placeIndexSchema, regions, type PlaceIndex } from '../lib/contracts';
import { polygonCenter } from '../lib/geo';
import { locateRegion } from '../lib/regions';
import { countPlacesByRegion } from '../lib/server/db';

export const TODO_MARK = '(작성 필요)';
const CATEGORIES = ['cafe', 'restaurant', 'activity'] as const;
const LABEL = { cafe: '카페', restaurant: '식당', activity: '놀거리' } as const;
const DEFAULTS = {
  cafe: { food: '카페 디저트', activity: null, environment: 'indoor' },
  restaurant: { food: '한식', activity: null, environment: 'indoor' },
  activity: { food: null, activity: '기타', environment: 'unknown' },
} as const;

/** 동네 행정동 경계 안에 확실히 들어가는 좌표. 자기 경계 안에 무게중심이 있는 첫 행정동을 쓴다. */
function anchor(regionId: string) {
  for (const feature of boundaries.features.filter(f => f.properties.regionId === regionId)) {
    const point = polygonCenter([feature.geometry.coordinates as never]);
    const located = locateRegion(point);
    if (located?.regionId === regionId && located.dong === feature.properties.dong) return { point, dong: feature.properties.dong };
  }
  throw new Error(`${regionId}: 경계 안 좌표를 찾지 못했습니다`);
}

const counts = countPlacesByRegion();
const now = new Date().toISOString();
const todo: PlaceIndex[] = [];
const rows: { district: string; name: string; id: string; c: Record<typeof CATEGORIES[number], number>; missing: string[] }[] = [];
for (const region of regions) {
  const c = counts[region.id] ?? { cafe: 0, restaurant: 0, activity: 0 };
  const missing = CATEGORIES.filter(k => c[k] === 0);
  if (!missing.length) continue;
  rows.push({ district: region.district, name: region.name, id: region.id, c, missing: missing.map(k => LABEL[k]) });
  const { point, dong } = anchor(region.id);
  for (const category of missing) todo.push(placeIndexSchema.parse({
    id: `manual:${region.id}-${category}-1`, name: `${TODO_MARK} ${region.name} ${LABEL[category]}`,
    regionId: region.id, district: region.district, dong, category,
    lat: Number(point.lat.toFixed(6)), lng: Number(point.lng.toFixed(6)),
    address: '', description: '', ...DEFAULTS[category], environmentSource: 'reviewed', atmospheres: [],
    hours: null, hoursText: '', availableFrom: null, availableUntil: null,
    source: '수동 검수', sourceUrl: `https://example.com/${region.id}-${category}-1`, collectedAt: now,
  }));
}

const byDistrict = new Map<string, typeof rows>();
for (const row of rows) byDistrict.set(row.district, [...(byDistrict.get(row.district) ?? []), row]);
const md = [
  '# 장소가 부족한 동네',
  '',
  `기준: \`data/places.sqlite\` (${now.slice(0, 10)} 생성, \`npm run gen:missing\`). 카페·식당·놀거리 중 하나라도 0개인 동네는 홈에서 회색으로 표시되고 선택할 수 없다.`,
  '',
  `- 전체 ${regions.length}곳 중 부족 ${rows.length}곳 (장소가 전혀 없는 곳 ${rows.filter(r => r.missing.length === 3).length}곳)`,
  `- 채워야 할 칸: ${todo.length}개 → 템플릿 [\`manual-places.todo.json\`](manual-places.todo.json)`,
  '',
  '채우는 방법: 템플릿에서 해당 항목의 `name`·`address`·`description`·`lat`·`lng`·`sourceUrl`을 실제 장소로 바꾸고(이름 앞 "(작성 필요)" 삭제), 채우지 않은 항목은 지운 뒤 `npm run add:places -- data/manual-places.todo.json` 을 실행한다. 템플릿 좌표는 행정동 중심의 자리표시자이므로 반드시 실제 좌표로 바꿔야 한다.',
  '',
  ...[...byDistrict.entries()].flatMap(([district, list]) => [
    `## ${district} (${list.length}곳)`, '',
    '| 동네 | ID | 카페 | 식당 | 놀거리 | 부족 |', '| --- | --- | ---: | ---: | ---: | --- |',
    ...list.map(r => `| ${r.name} | \`${r.id}\` | ${r.c.cafe} | ${r.c.restaurant} | ${r.c.activity} | ${r.missing.join('·')} |`), '',
  ]),
].join('\n');

await writeFile('data/missing-places.md', md);
await writeFile('data/manual-places.todo.json', JSON.stringify(todo, null, 2) + '\n');
console.log(`부족한 동네 ${rows.length}곳, 채울 칸 ${todo.length}개 → data/missing-places.md, data/manual-places.todo.json`);
