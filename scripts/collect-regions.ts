import { writeFile, rename } from 'node:fs/promises';
import { z } from 'zod';
import regions from '../config/regions.json';
import { polygonCenter } from '../lib/geo';
import { fetchText } from '../lib/server/http';

const source = 'https://data.seoul.go.kr/opendata/seoulStay/grid_viewer.html';
const page = await fetchText(new URL(source));
const embedded = /const\s+DONG\s*=\s*(\{[^;]+\})\s*;/.exec(page)?.[1];
if (!embedded) throw new Error('공식 행정동 경계 데이터 형식 변경');
const point = z.tuple([z.number().min(124).max(132), z.number().min(33).max(40)]);
const data = z.object({ features: z.array(z.object({ properties: z.object({name: z.string()}),
  geometry: z.object({ type: z.literal('Polygon'), coordinates: z.array(z.array(point).min(4)).min(1) }),
})) }).parse(JSON.parse(embedded));
const name = (value: string) => value.replace(/[.·,]/g, '');
const features = regions.flatMap(region => region.dongs.map(dong => {
  const matches = data.features.filter(f => name(f.properties.name) === name(dong));
  if (matches.length !== 1) throw new Error(`행정동 경계가 유일하지 않습니다: ${dong}`);
  return { type: 'Feature', properties: { regionId: region.id, district: region.district, dong }, geometry: matches[0].geometry };
}));
const updated = regions.map(region => ({ ...region,
  ...polygonCenter(features.filter(f => f.properties.regionId === region.id).map(f => f.geometry.coordinates)), centerSource: 'official' }));
await writeFile('config/region-boundaries.json.tmp', JSON.stringify({type: 'FeatureCollection', source, features}));
await writeFile('config/regions.json.tmp', '[\n' + updated.map(r => '  ' + JSON.stringify(r)).join(',\n') + '\n]\n');
await rename('config/region-boundaries.json.tmp', 'config/region-boundaries.json');
await rename('config/regions.json.tmp', 'config/regions.json');
console.log(`공식 경계 ${features.length}개와 지역 중심 ${updated.length}개 갱신`);
