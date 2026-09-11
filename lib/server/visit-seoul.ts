import { z } from 'zod';
import { fetchJson } from './http';
import type { SourceRow } from './collect';

async function request(operation: 'list' | 'info', params: Record<string, string | number>) {
  const key = process.env.VISITSEOUL_API_KEY;
  if (!key) throw new Error('VISITSEOUL_API_KEY 미설정: 비짓서울 API에서 발급받은 키가 필요합니다');
  return fetchJson(new URL(`https://api-call.visitseoul.net/api/v1/contents/${operation}`), {
    'VISITSEOUL-API-KEY': key, Accept: 'application/json;charset=UTF-8', 'Content-Type': 'application/json;charset=UTF-8',
  }, JSON.stringify(params));
}

const contentSchema = z.object({ cid: z.string().min(1), lang_code_id: z.string(), post_sj: z.string() });
const pageSchema = z.object({
  result_code: z.literal(200), data: z.array(contentSchema),
  paging: z.object({ page_no: z.number().int().positive(), page_size: z.number().int().positive(), total_count: z.number().int().nonnegative() }),
});

export async function collectVisitSeoul(sample = false): Promise<SourceRow[]> {
  const rows: SourceRow[] = [];
  for (let pageNo = 1; ; pageNo++) {
    const page = pageSchema.parse(await request('list', { lang_code_id: 'ko', page_no: pageNo }));
    const { page_size: size, total_count: total } = page.paging;
    if (page.paging.page_no !== pageNo || page.data.length !== Math.min(size, Math.max(0, total - (pageNo - 1) * size))) {
      throw new Error('비짓서울 API 수집 중단: 불완전한 페이지');
    }
    rows.push(...page.data.filter(row => row.lang_code_id === 'ko').map(row => ({
      service: 'VisitSeoul' as const, POST_SN: row.cid, LANG_CODE_ID: row.lang_code_id, POST_SJ: row.post_sj,
      POST_URL: `https://api.visitseoul.net/contents/standard/view/${encodeURIComponent(row.cid)}?lang=ko`,
      ADDRESS: '', NEW_ADDRESS: '',
    })));
    if (sample || pageNo * size >= total) return rows;
  }
}

const optionalText = z.string().nullish();
const detailSchema = z.object({ result_code: z.literal(200), data: contentSchema.extend({
  post_desc: optionalText, sumry: optionalText,
  traffic: z.object({ adres: optionalText, new_adres: optionalText,
    map_position_x: optionalText, map_position_y: optionalText }).nullish(),
  extra: z.object({ cmmn_use_time: optionalText, business_days: optionalText, closed_days: optionalText }).nullish(),
}) });

export async function getVisitSeoulDetail(cid: string) {
  // The official info cURL example uses POST with a JSON body, like the list API.
  const { data } = detailSchema.parse(await request('info', { cid }));
  if (data.cid !== cid || data.lang_code_id !== 'ko') throw new Error('비짓서울 API 콘텐츠 불일치');
  const lat = Number(data.traffic?.map_position_y), lng = Number(data.traffic?.map_position_x);
  const location = data.traffic?.map_position_y?.trim() && data.traffic?.map_position_x?.trim()
    && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? {lat, lng} : null;
  return { location, description: data.post_desc || data.sumry || '',
    address: data.traffic?.new_adres || data.traffic?.adres || '',
    hoursText: [data.extra?.cmmn_use_time, data.extra?.business_days, data.extra?.closed_days].filter(Boolean).join(' / ') };
}
