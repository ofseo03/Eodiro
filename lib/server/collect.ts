import { z } from 'zod';
import { atmosphereSchema, hoursSchema, placeIndexSchema, type Place, type PlaceIndex } from '../contracts';
import rules from '../../config/classification.json';
import { fetchJson, fetchText } from './http';
import { locateRegion } from '../regions';
import { getVisitSeoulDetail, textContent } from './visit-seoul';

export const sources = ['TbVwRestaurants', 'TbVwEntertainment'] as const;
const rowSchema = z.object({
  POST_SN: z.string(), LANG_CODE_ID: z.string(), POST_SJ: z.string(), POST_URL: z.url(),
  ADDRESS: z.string(), NEW_ADDRESS: z.string(), CATEGORY_PATH: z.string().optional(), CMMN_USE_TIME: z.string().optional(),
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

export function inferEnvironment(category: Place['category'], activity: Place['activity']): Place['environment'] {
  return category !== 'activity' || activity === '전시' || activity === '공연' ? 'indoor' : activity === '공원' ? 'outdoor' : 'unknown';
}

export function atmosphereTags(description: string) {
  return Object.entries(rules.atmospheres).filter(([, terms]) => terms.some(t => description.includes(t)))
    .map(([tag]) => atmosphereSchema.parse(tag));
}

export function classifyCategory(path: string): Pick<PlaceIndex, 'category' | 'food' | 'activity'> {
  const parts = path.split('>').map(p => p.trim()), root = parts[0];
  if (root === '음식' || ['한식', '양식', '중식', '일식', '카페&디저트', '카페/찻집'].includes(root)) {
    if (parts.includes('카페/찻집') || parts.includes('카페&디저트')) return { category: 'cafe', food: '카페 디저트', activity: null };
    const food = parts.includes('한식') ? '한식' : (parts.includes('서양식') || parts.includes('양식')) ? '양식'
      : parts.includes('중식') ? '중식' : parts.includes('일식') ? '일식' : null;
    return { category: 'restaurant', food, activity: null };
  }
  if (['문화관광', '자연관광', '역사관광', '쇼핑', '체험관광', '축제/공연/행사'].includes(root)) {
    const activity = root === '쇼핑' ? '쇼핑' : root === '체험관광' ? '체험'
      : /공원/.test(path) ? '공원' : /전시|박물관|미술관/.test(path) ? '전시' : ['공연', '공연시설'].includes(parts.at(-1) || '') ? '공연' : null;
    return { category: 'activity', food: null, activity };
  }
  return { category: null, food: null, activity: null };
}

// Only unambiguous schedules are parsed; conditional/holiday prose remains in the index as unknown.
export function parseHours(time: string, business: string, closed: string): PlaceIndex['hours'] {
  const weekly: NonNullable<PlaceIndex['hours']>['weekly'] = {};
  let uncertain = false;
  const days = (text: string): number[] => {
    if (/^(매일|연중무휴)$/.test(text)) return [0, 1, 2, 3, 4, 5, 6];
    if (/^(평일|월~금|월요일~금요일)$/.test(text)) return [1, 2, 3, 4, 5];
    if (/^(주말|토~일|토요일~일요일)$/.test(text)) return [0, 6];
    if (/^(?:[일월화수목금토](?:요일)?)(?:[,·/ ]+[일월화수목금토](?:요일)?)*$/.test(text))
      return [...text.matchAll(/([일월화수목금토])(?:요일)?/g)].map(m => '일월화수목금토'.indexOf(m[1]));
    return [];
  };
  for (const line of time.split(/\r?\n/)) {
    const match = /^(.*?)\s*(\d{1,2}):(\d{2})\s*[~–-]\s*(\d{1,2}):(\d{2})$/.exec(line.trim());
    if (!match) { if (line.trim()) uncertain = true; continue; }
    const [, label, h1, m1, h2, m2] = match;
    if (+h1 > 23 || +h2 > 24 || +m1 > 59 || +m2 > 59 || (+h2 === 24 && +m2 !== 0)) continue;
    const start = +h1 * 60 + +m1, end = +h2 * 60 + +m2;
    const openDays = days(label.trim() || business.trim());
    if (!openDays.length) uncertain = true;
    for (const day of openDays) weekly[day] = [[start, end > start ? end : end + 1440]];
  }
  const closure = closed.trim().replace(/\s*(정기)?휴무$/, '');
  const closedWeekdays = days(closure.replace(/^매주\s*/, ''));
  for (const day of closedWeekdays) weekly[day] = [];
  const dates = closure.split(/[,·/\s]+/).map(value => z.iso.date().safeParse(value.replaceAll('.', '-')));
  const exceptions = dates.every(d => d.success) ? Object.fromEntries(dates.map(d => [d.data!, []])) : {};
  if (uncertain || (!closedWeekdays.length && !Object.keys(exceptions).length && !/^(?:없음|연중\s?무휴|무휴|-)?$/.test(closure)))
    for (const day of Object.keys(weekly)) if (weekly[day].length) delete weekly[day];
  return Object.keys(weekly).length || Object.keys(exceptions).length ? hoursSchema.parse({ weekly, exceptions }) : null;
}

export function indexRow(row: SourceRow, detail?: {
  location: { lat: number; lng: number } | null; category: string; description: string; hoursText: string;
  businessDaysText?: string; closedDaysText?: string; availableFrom?: string; availableUntil?: string;
}, status: PlaceIndex['detailStatus'] = detail ? 'ok' : 'pending'): PlaceIndex {
  const point = detail?.location ?? null, membership = point ? locateRegion(point) : null;
  const sourceCategory = detail?.category || row.CATEGORY_PATH || '';
  const classification = classifyCategory(sourceCategory);
  const business = detail?.businessDaysText || '', closed = detail?.closedDaysText || '', time = detail?.hoursText || '';
  const date = (value = '') => { const parsed = z.iso.date().safeParse(value.trim().replaceAll('.', '-')); return parsed.success ? parsed.data : null; };
  return placeIndexSchema.parse({
    id: `${row.service}:${row.POST_SN}`, name: row.POST_SJ, sourceCategory, ...classification,
    lat: point?.lat ?? null, lng: point?.lng ?? null, regionId: membership?.regionId ?? null,
    district: membership?.district || '', dong: membership?.dong || '',
    environment: classification.category ? inferEnvironment(classification.category, classification.activity) : 'unknown',
    environmentSource: 'inferred', atmospheres: atmosphereTags(detail?.description || ''),
    hours: parseHours(time, business, closed), hoursText: time, businessDaysText: business, closedDaysText: closed,
    availableFrom: date(detail?.availableFrom), availableUntil: date(detail?.availableUntil), detailStatus: status,
    source: row.service === 'VisitSeoul' ? '서울관광재단 · 비짓서울 API' : '서울 열린데이터광장 · 서울관광재단',
    sourceUrl: row.POST_URL, collectedAt: new Date().toISOString(),
  });
}

export async function normalizeRows(rows: SourceRow[]) {
  const places: PlaceIndex[] = [], failures: { id: string; reason: string }[] = [];
  for (const row of rows) {
    try {
      const detail = row.service === 'VisitSeoul' ? await getVisitSeoulDetail(row.POST_SN) : {
        ...await getPlacePage(row.POST_URL), hoursText: row.CMMN_USE_TIME || '',
        businessDaysText: row.CMMN_BSNDE || '', closedDaysText: row.CMMN_RSTDE || '',
      };
      places.push(indexRow(row, detail));
    } catch {
      places.push(indexRow(row, undefined, 'failed'));
      failures.push({ id: `${row.service}:${row.POST_SN}`, reason: '상세 조회 또는 형식 확인 실패' });
    }
  }
  return { places, failures };
}
