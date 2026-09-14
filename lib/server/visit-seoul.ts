import { z } from 'zod';
import { placeSchema, type Place } from '../contracts';
import type { SourceRow } from './collect';
import { readResponseText } from './http';

const endpoint = 'https://api-call.visitseoul.net/api/v1/contents/';
const cidSchema = z.string().regex(/^[A-Za-z0-9]+$/);

export class VisitSeoulError extends Error {
  constructor(public status: number, public code: string, public retryAfterSeconds?: number) {
    super('비짓서울 장소 정보를 불러오지 못했습니다');
    this.name = 'VisitSeoulError';
  }
}

function retryAfter(value: string | null) {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return Number(value);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, Math.ceil((date - Date.now()) / 1000)) : undefined;
}

async function request(operation: 'list' | 'info', params: Record<string, string | number>) {
  const key = process.env.VISITSEOUL_API_KEY;
  if (!key) throw new VisitSeoulError(503, 'VISITSEOUL_NOT_CONFIGURED');
  let response: Response;
  try {
    response = await fetch(new URL(operation, endpoint), {
      method: 'POST', body: JSON.stringify(params), signal: AbortSignal.timeout(8000), cache: 'no-store', redirect: 'error',
      headers: { 'VISITSEOUL-API-KEY': key, Accept: 'application/json;charset=UTF-8', 'Content-Type': 'application/json;charset=UTF-8' },
    });
  } catch {
    throw new VisitSeoulError(502, 'VISITSEOUL_UNAVAILABLE');
  }
  const retryAfterSeconds = retryAfter(response.headers.get('retry-after'));
  let body: string;
  try {
    body = await readResponseText(response);
  } catch {
    throw new VisitSeoulError(502, 'VISITSEOUL_UNAVAILABLE');
  }
  if (response.status === 429) throw new VisitSeoulError(429, 'VISITSEOUL_RATE_LIMITED', retryAfterSeconds);
  if (response.headers.get('content-type')?.includes('text/html') || /^\s*</.test(body)) {
    throw new VisitSeoulError(503, 'VISITSEOUL_BLOCKED');
  }
  if (!response.ok) throw new VisitSeoulError(502, 'VISITSEOUL_PROVIDER_ERROR');
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    throw new VisitSeoulError(502, 'VISITSEOUL_INVALID_RESPONSE');
  }
  if (z.object({ result_code: z.number() }).safeParse(data).data?.result_code === 429) {
    throw new VisitSeoulError(429, 'VISITSEOUL_RATE_LIMITED', retryAfterSeconds);
  }
  return data;
}

const contentSchema = z.object({
  cid: cidSchema, lang_code_id: z.literal('ko'), post_sj: z.string().min(1), cate_depth: z.string().nullish(),
});
const pageSchema = z.object({
  result_code: z.literal(200), data: z.array(contentSchema),
  paging: z.object({ page_no: z.number().int().positive(), page_size: z.number().int().positive(), total_count: z.number().int().nonnegative() }),
});

async function page(pageNo: number) {
  if (!Number.isSafeInteger(pageNo) || pageNo < 1) throw new VisitSeoulError(400, 'VISITSEOUL_INVALID_PAGE');
  const parsed = pageSchema.safeParse(await request('list', { lang_code_id: 'ko', page_no: pageNo }));
  if (!parsed.success) throw new VisitSeoulError(502, 'VISITSEOUL_INVALID_RESPONSE');
  const result = parsed.data, { page_size: size, total_count: total } = result.paging;
  const expected = Math.min(size, Math.max(0, total - (pageNo - 1) * size));
  if (result.paging.page_no !== pageNo || result.data.length !== expected) {
    throw new VisitSeoulError(502, 'VISITSEOUL_INCOMPLETE_PAGE');
  }
  return result;
}

export async function collectVisitSeoul(sample = false): Promise<SourceRow[]> {
  const rows: SourceRow[] = [], ids = new Set<string>();
  let total: number | undefined;
  for (let pageNo = 1; ; pageNo++) {
    const result = await page(pageNo);
    if (total !== undefined && total !== result.paging.total_count) throw new VisitSeoulError(502, 'VISITSEOUL_INCOMPLETE_PAGE');
    total = result.paging.total_count;
    for (const row of result.data) {
      if (ids.has(row.cid)) throw new VisitSeoulError(502, 'VISITSEOUL_INCOMPLETE_PAGE');
      ids.add(row.cid);
      rows.push({
        service: 'VisitSeoul', POST_SN: row.cid, LANG_CODE_ID: row.lang_code_id, POST_SJ: row.post_sj,
        POST_URL: `https://api.visitseoul.net/contents/standard/view/${encodeURIComponent(row.cid)}?lang=ko`,
        ADDRESS: '', NEW_ADDRESS: '', CATEGORY_PATH: row.cate_depth || '',
      });
    }
    if (sample || pageNo * result.paging.page_size >= total) return rows;
  }
}

const optionalText = z.string().nullish();
const detailSchema = z.object({ result_code: z.literal(200), data: contentSchema.extend({
  cate_depth: optionalText, post_desc: optionalText, sumry: optionalText, schdul_info_bgnde: optionalText, schdul_info_endde: optionalText,
  traffic: z.object({ adres: optionalText, new_adres: optionalText,
    map_position_x: optionalText, map_position_y: optionalText }).nullish(),
  extra: z.object({ cmmn_use_time: optionalText, business_days: optionalText, closed_days: optionalText }).nullish(),
}) });

export function parseVisitSeoulDetail(raw: unknown) {
  return detailSchema.parse({ result_code: 200, data: raw }).data;
}

export async function fetchVisitSeoulDetail(cid: string) {
  const validCid = cidSchema.safeParse(cid);
  if (!validCid.success) throw new VisitSeoulError(400, 'VISITSEOUL_INVALID_CID');
  const parsed = detailSchema.safeParse(await request('info', { cid }));
  if (!parsed.success || parsed.data.data.cid !== cid) throw new VisitSeoulError(502, 'VISITSEOUL_INVALID_RESPONSE');
  return parsed.data.data;
}

export async function getVisitSeoulDetail(cid: string) {
  const data = await fetchVisitSeoulDetail(cid);
  return visitSeoulDetail(data);
}

export function visitSeoulDetail(data: ReturnType<typeof parseVisitSeoulDetail>) {
  const lat = Number(data.traffic?.map_position_y), lng = Number(data.traffic?.map_position_x);
  const location = data.traffic?.map_position_y?.trim() && data.traffic?.map_position_x?.trim()
    && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? {lat, lng} : null;
  return { name: data.post_sj, location, category: data.cate_depth || '',
    businessDaysText: data.extra?.business_days || '', closedDaysText: data.extra?.closed_days || '',
    availableFrom: data.schdul_info_bgnde || '', availableUntil: data.schdul_info_endde || '', description: data.post_desc || data.sumry || '',
    address: data.traffic?.new_adres || data.traffic?.adres || '',
    hoursText: data.extra?.cmmn_use_time || '' };
}

export function textContent(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Only enrich the places already chosen from the SQLite recommendation index.
 * 수동 추가 장소(비짓서울 외 ID)는 인덱스의 주소·설명을 그대로 쓰고 외부 API를 호출하지 않는다. */
export async function getPlaceDetails(places: Place[]): Promise<Place[]> {
  return Promise.all(places.map(async place => {
    if (!place.id.startsWith('VisitSeoul:')) return { ...place, detailFailed: false };
    const cid = place.id.match(/^VisitSeoul:([A-Za-z0-9]+)$/)?.[1];
    if (!cid) throw new VisitSeoulError(400, 'VISITSEOUL_INVALID_CID');
    try {
      const info = await getVisitSeoulDetail(cid);
      const date = (value: string, fallback: string | null) => {
        if (!value.trim()) return fallback;
        const parsed = z.iso.date().safeParse(value.trim().replaceAll('.', '-'));
        if (!parsed.success) throw new VisitSeoulError(502, 'VISITSEOUL_INVALID_RESPONSE');
        return parsed.data;
      };
      const availableFrom = date(info.availableFrom, place.availableFrom);
      const availableUntil = date(info.availableUntil, place.availableUntil);
      if (availableFrom && availableUntil && availableFrom > availableUntil) throw new VisitSeoulError(502, 'VISITSEOUL_INVALID_RESPONSE');
      return placeSchema.parse({ ...place, name: textContent(info.name), address: textContent(info.address),
        description: textContent(info.description), hoursText: textContent(info.hoursText), availableFrom, availableUntil, detailFailed: false });
    } catch (error) {
      if (!(error instanceof VisitSeoulError) && !(error instanceof z.ZodError)) throw error;
      return { ...place, detailFailed: true };
    }
  }));
}
