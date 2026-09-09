import { z } from 'zod';
import { atmosphereSchema, categorySchema, environmentSchema, foodSchema, activitySchema, hoursSchema, placeSchema, regions, type Place } from '../contracts';
import rules from '../../config/classification.json';
import { fetchJson } from './http';

export const sources = ['TbVwRestaurants', 'TbVwEntertainment'] as const;
const rowSchema = z.object({
  POST_SN: z.string(), LANG_CODE_ID: z.string(), POST_SJ: z.string(), POST_URL: z.url(),
  ADDRESS: z.string(), NEW_ADDRESS: z.string(), CMMN_USE_TIME: z.string().optional(),
  CMMN_BSNDE: z.string().optional(), CMMN_RSTDE: z.string().optional(),
});
export type SourceRow = z.infer<typeof rowSchema> & { service: typeof sources[number] };

export function parseSource(raw: unknown, service: typeof sources[number]) {
  const root = z.record(z.string(), z.unknown()).parse(raw);
  if (!root[service]) throw new Error('관광 API 응답 오류');
  const body = z.object({ list_total_count: z.number().int().nonnegative(),
    RESULT: z.object({ CODE: z.literal('INFO-000') }), row: z.array(rowSchema) }).parse(root[service]);
  return { total: body.list_total_count, received: body.row.length,
    rows: body.row.filter(r => r.LANG_CODE_ID === 'ko').map(r => ({ ...r, service })) };
}

export async function collectSource(service: typeof sources[number], sample = false): Promise<SourceRow[]> {
  const key = sample ? 'sample' : process.env.SEOUL_API_KEY;
  if (!key) throw new Error('SEOUL_API_KEY가 필요합니다');
  const collected: SourceRow[] = [];
  let total = Infinity;
  for (let start = 1; start <= total; start += 1000) {
    // Seoul documents this HTTP endpoint on port 8088; HTTPS on that port is unsupported.
    const language = service === 'TbVwEntertainment' ? '/ko' : '';
    const url = new URL(`http://openapi.seoul.go.kr:8088/${encodeURIComponent(key)}/json/${service}/${start}/${sample ? 5 : start + 999}${language}`);
    const page = parseSource(await fetchJson(url), service);
    total = page.total;
    if (!sample && page.received !== Math.min(1000, total - start + 1)) throw new Error('관광 API 수집 중단: 불완전한 페이지');
    collected.push(...page.rows);
    if (sample) break;
  }
  return collected;
}

const reviewSchema = z.strictObject({
  category: categorySchema, food: foodSchema.nullable().default(null), activity: activitySchema.nullable().default(null),
  environment: environmentSchema.optional(), description: z.string().default(''),
  hours: hoursSchema.nullable().default(null),
});
export const reviewsSchema = z.record(z.string(), reviewSchema);

export function inferEnvironment(category: Place['category'], activity: Place['activity']): Place['environment'] {
  return category !== 'activity' || activity === '전시' || activity === '공연' ? 'indoor' : activity === '공원' ? 'outdoor' : 'unknown';
}

export function atmosphereTags(description: string) {
  return Object.entries(rules.atmospheres).filter(([, terms]) => terms.some(t => description.includes(t)))
    .map(([tag]) => atmosphereSchema.parse(tag));
}

export async function geocode(address: string) {
  if (!process.env.KAKAO_REST_API_KEY) throw new Error('KAKAO_REST_API_KEY가 필요합니다');
  const headers = { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` };
  const search = new URL('https://dapi.kakao.com/v2/local/search/address.json');
  search.searchParams.set('query', address.replace(/^\d{3}-?\d{3}\s+|^\d{5}\s+/, '').trim());
  const raw = z.object({ documents: z.array(z.object({ x: z.string(), y: z.string() })) }).parse(await fetchJson(search, headers));
  if (raw.documents.length !== 1) return null; // Ambiguous addresses require correction, never pick an arbitrary result.
  const { x, y } = raw.documents[0];
  const reverse = new URL('https://dapi.kakao.com/v2/local/geo/coord2regioncode.json');
  reverse.search = new URLSearchParams({ x, y }).toString();
  const result = z.object({ documents: z.array(z.object({
    region_type: z.string(), region_1depth_name: z.string(), region_2depth_name: z.string(), region_3depth_name: z.string(),
  })) }).parse(await fetchJson(reverse, headers));
  const dong = result.documents.find(d => d.region_type === 'H' && d.region_1depth_name === '서울특별시');
  if (!dong) return null;
  const dongName = (name: string) => name.replace(/[.·,]/g, '');
  const region = regions.find(r => r.district === dong.region_2depth_name && r.dongs.some(d => dongName(d) === dongName(dong.region_3depth_name)));
  return region ? { lat: Number(y), lng: Number(x), regionId: region.id, district: region.district,
    dong: region.dongs.find(d => dongName(d) === dongName(dong.region_3depth_name))! } : null;
}

export async function normalizeRows(rows: SourceRow[], input: unknown) {
  const reviews = reviewsSchema.parse(input), places: Place[] = [], rejected: { id: string; reason: string }[] = [];
  for (const row of rows) {
    const id = `${row.service}:${row.POST_SN}`, review = reviews[id];
    if (!review) { rejected.push({ id, reason: '분류 미검수' }); continue; }
    const address = row.NEW_ADDRESS || row.ADDRESS;
    const location = await geocode(address);
    if (!location) { rejected.push({ id, reason: '좌표·행정동 미확인 또는 서비스 지역 밖' }); continue; }
    places.push(placeSchema.parse({ id, name: row.POST_SJ, address, ...location, ...review,
      environment: review.environment ?? inferEnvironment(review.category, review.activity),
      environmentSource: review.environment ? 'reviewed' : 'inferred', atmospheres: atmosphereTags(review.description),
      hoursText: [row.CMMN_USE_TIME, row.CMMN_BSNDE, row.CMMN_RSTDE].filter(Boolean).join(' / '),
      source: '서울관광재단 · Visit Seoul (공공누리 제1유형)', sourceUrl: row.POST_URL, collectedAt: new Date().toISOString() }));
  }
  return { places, rejected };
}
