import { z } from 'zod';
import { atmosphereSchema, categorySchema, environmentSchema, foodSchema, activitySchema, hoursSchema, placeSchema, type Place } from '../contracts';
import rules from '../../config/classification.json';
import { fetchJson, fetchText } from './http';
import { locateRegion } from '../regions';
import { getVisitSeoulDetail } from './visit-seoul';

export const sources = ['TbVwRestaurants', 'TbVwEntertainment'] as const;
const rowSchema = z.object({
  POST_SN: z.string(), LANG_CODE_ID: z.string(), POST_SJ: z.string(), POST_URL: z.url(),
  ADDRESS: z.string(), NEW_ADDRESS: z.string(), CMMN_USE_TIME: z.string().optional(),
  CMMN_BSNDE: z.string().optional(), CMMN_RSTDE: z.string().optional(),
});
export type SourceRow = z.infer<typeof rowSchema> & { service: typeof sources[number] | 'VisitSeoul' };

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
  if (!key) {
    // The same official dataset also offers a public JSON download without an API key.
    const raw = await fetchJson(new URL('https://datafile.seoul.go.kr/bigfile/iot/sheet/json/download.do'), undefined,
      new URLSearchParams({srvType: 'S', infId: service === 'TbVwRestaurants' ? 'OA-21054' : 'OA-21052',
        serviceKind: '0', pageNo: '1', ssUserId: 'SAMPLE_VIEW', filterCol: 'LANG_CODE_ID', txtFilter: 'ko'}));
    return parseDownload(raw, service);
  }
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

export function parseDownload(raw: unknown, service: typeof sources[number]): SourceRow[] {
  const data = z.object({DATA: z.array(z.record(z.string(), z.unknown())).min(1)}).parse(raw);
  return data.DATA.map(row => rowSchema.parse(Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toUpperCase(), v === null ? '' : String(v)]))))
    .filter(row => row.LANG_CODE_ID === 'ko').map(row => ({...row, service}));
}

function textContent(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parsePlacePage(html: string) {
  const lat = /data-map-y="([\d.]+)"/.exec(html)?.[1], lng = /data-map-x="([\d.]+)"/.exec(html)?.[1];
  const description = /<meta\s+name="description"\s+content="([^"]*)"/.exec(html)?.[1] ?? '';
  const category = /<div class="text-type">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
  return { location: lat && lng ? {lat: Number(lat), lng: Number(lng)} : null,
    description: textContent(description), category: textContent(category) };
}

export async function getPlacePage(sourceUrl: string) {
  const url = new URL(sourceUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'korean.visitseoul.net') throw new Error('허용되지 않은 장소 출처');
  return parsePlacePage(await fetchText(url));
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

export async function normalizeRows(rows: SourceRow[], input: unknown) {
  const reviews = reviewsSchema.parse(input), places: Place[] = [], rejected: { id: string; reason: string }[] = [];
  for (const row of rows) {
    const id = `${row.service}:${row.POST_SN}`, review = reviews[id];
    if (!review) { rejected.push({ id, reason: '분류 미검수' }); continue; }
    const detail = row.service === 'VisitSeoul' ? await getVisitSeoulDetail(row.POST_SN) : {
      ...await getPlacePage(row.POST_URL), address: row.NEW_ADDRESS || row.ADDRESS,
      hoursText: [row.CMMN_USE_TIME, row.CMMN_BSNDE, row.CMMN_RSTDE].filter(Boolean).join(' / '),
    };
    const address = detail.address;
    const membership = detail.location ? locateRegion(detail.location) : null;
    const location = detail.location && membership ? {...detail.location, ...membership} : null;
    if (!location) { rejected.push({ id, reason: '좌표·행정동 미확인 또는 서비스 지역 밖' }); continue; }
    places.push(placeSchema.parse({ id, name: row.POST_SJ, address, ...location, ...review,
      environment: review.environment ?? inferEnvironment(review.category, review.activity),
      description: review.description || textContent(detail.description),
      environmentSource: review.environment ? 'reviewed' : 'inferred', atmospheres: atmosphereTags(review.description || textContent(detail.description)),
      hoursText: detail.hoursText,
      source: row.service === 'VisitSeoul' ? '서울관광재단 · 비짓서울 API' : '서울 열린데이터광장 · 서울관광재단 (공공누리 제1유형)',
      sourceUrl: row.POST_URL, collectedAt: new Date().toISOString() }));
  }
  return { places, rejected };
}
