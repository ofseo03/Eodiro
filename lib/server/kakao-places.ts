// 카카오 로컬 API(카테고리 검색)로 장소가 부족한 동네의 카페·식당·놀거리 후보를 모아 수동 추가 형식(PlaceIndex)으로 바꾼다.
// 문서: https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-category
import { z } from 'zod';
import boundaries from '../../config/region-boundaries.json' with { type: 'json' };
import { placeIndexSchema, regions, type Category, type PlaceIndex } from '../contracts';
import { locateRegion } from '../regions';
import { inferEnvironment } from './collect';
import { readResponseText } from './http';

export const KAKAO_GROUPS: Record<Category, readonly string[]> = { cafe: ['CE7'], restaurant: ['FD6'], activity: ['CT1', 'AT4'] };
const PAGE_SIZE = 15, MAX_PAGES = 3; // 카카오 카테고리 검색은 쿼리당 최대 45건(15건 × 3쪽)

const coordinate = z.string().trim().min(1).transform(Number).pipe(z.number().finite());
export const kakaoDocumentSchema = z.object({
  id: z.string().regex(/^\d+$/), place_name: z.string().trim().min(1), category_name: z.string().default(''),
  address_name: z.string().default(''), road_address_name: z.string().default(''),
  place_url: z.url(), x: coordinate, y: coordinate,
});
const pageSchema = z.object({ documents: z.array(kakaoDocumentSchema), meta: z.object({ is_end: z.boolean() }) });
export type KakaoDocument = z.infer<typeof kakaoDocumentSchema>;

/** 카카오 category_name(예: "음식점 > 한식 > 육류,고기")을 서비스 분류로 바꾼다. 요청 카테고리에 맞지 않으면 null. */
export function classifyKakao(categoryName: string, wanted: Category): { category: Category; food: PlaceIndex['food']; activity: PlaceIndex['activity'] } | null {
  const parts = categoryName.split('>').map(p => p.trim());
  const has = (...terms: string[]) => parts.some(p => terms.some(t => p.includes(t)));
  if (wanted === 'cafe') return has('카페', '디저트', '제과', '베이커리', '찻집') ? { category: 'cafe', food: '카페 디저트', activity: null } : null;
  if (wanted === 'restaurant') {
    if (parts[0] !== '음식점' || has('카페', '술집', '뷔페')) return null;
    const food = has('한식') ? '한식' : has('양식') ? '양식' : has('일식') ? '일식' : has('중식') ? '중식' : has('아시아') ? '아시안' : '기타';
    return { category: 'restaurant', food, activity: null };
  }
  if (parts[0] === '음식점') return null;
  const activity = has('미술관', '박물관', '전시', '갤러리') ? '전시' : has('공연', '극장', '영화관') ? '공연' : has('공원') ? '공원'
    : has('체험') ? '체험' : has('쇼핑', '시장', '백화점') ? '쇼핑' : '기타';
  return { category: 'activity', food: null, activity };
}

/** 동네 경계 전체를 감싸는 카카오 rect 파라미터(minx,miny,maxx,maxy = 경도·위도) — 행정동별로 하나씩. */
export function regionRects(regionId: string) {
  return boundaries.features.filter(f => f.properties.regionId === regionId).map(feature => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const ring of feature.geometry.coordinates as number[][][]) for (const [x, y] of ring) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    return { dong: feature.properties.dong, rect: `${minX},${minY},${maxX},${maxY}` };
  });
}

/** 카카오 검색 결과 한 건을 수동 추가 장소로 바꾼다. 좌표가 요청한 동네 경계 밖이거나 분류가 맞지 않으면 null. */
export function toManualPlace(doc: KakaoDocument, regionId: string, wanted: Category, collectedAt: string): PlaceIndex | null {
  const located = locateRegion({ lat: doc.y, lng: doc.x });
  if (located?.regionId !== regionId) return null;
  const classified = classifyKakao(doc.category_name, wanted);
  if (!classified) return null;
  const detail = doc.category_name.split('>').map(p => p.trim()).filter(Boolean).slice(1).join(' · ');
  return placeIndexSchema.parse({
    id: `manual:kakao-${doc.id}`, name: doc.place_name, regionId, district: located.district, dong: located.dong,
    lat: doc.y, lng: doc.x, address: doc.road_address_name || doc.address_name, description: detail,
    sourceCategory: doc.category_name, ...classified,
    environment: inferEnvironment(classified.category, classified.activity), environmentSource: 'inferred',
    atmospheres: [], hours: null, hoursText: '',
    source: '카카오 로컬 API', sourceUrl: doc.place_url, collectedAt,
  });
}

export async function searchKakaoCategory(group: string, rect: string, page: number) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) throw new Error('KAKAO_REST_API_KEY 미설정 (.env.local)');
  const url = new URL('https://dapi.kakao.com/v2/local/search/category.json');
  url.search = new URLSearchParams({ category_group_code: group, rect, page: String(page), size: String(PAGE_SIZE) }).toString();
  const response = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` }, signal: AbortSignal.timeout(8000), cache: 'no-store', redirect: 'error' });
  const text = await readResponseText(response);
  if (!response.ok) throw new KakaoPlacesError(response.status, text);
  return pageSchema.parse(JSON.parse(text));
}

/** 카카오가 거부한 이유(HTTP 상태와 errorType·message)를 그대로 보여 준다. 401·403은 키·설정 문제라 재시도해도 같다. */
export class KakaoPlacesError extends Error {
  constructor(public status: number, body: string) {
    let detail = body.replace(/\s+/g, ' ').trim().slice(0, 200);
    try { const e = JSON.parse(body) as { errorType?: string; code?: unknown; message?: string; msg?: string }; detail = [e.errorType ?? e.code, e.message ?? e.msg].filter(Boolean).join(': '); } catch { /* JSON이 아니면 본문 앞부분 */ }
    const hint = status === 401 ? ' → 카카오 개발자 콘솔의 "REST API 키"인지 확인하세요(JavaScript·네이티브 키 아님)'
      : status === 403 ? ' → 카카오 개발자 콘솔 > 앱 > 카카오맵(로컬 API) 사용 설정을 켰는지 확인하세요'
      : status === 429 ? ' → 일일 호출 한도 초과. 내일 다시 실행하세요' : '';
    super(`카카오 로컬 API HTTP ${status}${detail ? ` — ${detail}` : ''}${hint}`);
    this.name = 'KakaoPlacesError';
  }
  get fatal() { return this.status === 401 || this.status === 403 || this.status === 429; }
}

/** 한 동네에서 부족한 카테고리마다 최대 `perCategory`건을 모은다. 이미 있는 ID(`existing`)는 건너뛴다. */
export async function collectKakaoPlaces(regionId: string, missing: Category[], perCategory: number, existing: Set<string>,
  search: typeof searchKakaoCategory = searchKakaoCategory, collectedAt = new Date().toISOString()) {
  if (!regions.some(r => r.id === regionId)) throw new Error(`알 수 없는 동네: ${regionId}`);
  const found: PlaceIndex[] = [];
  const seen = new Set(existing);
  for (const category of missing) {
    let count = 0;
    outer: for (const group of KAKAO_GROUPS[category]) for (const { rect } of regionRects(regionId)) for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await search(group, rect, page);
      for (const doc of result.documents) {
        const place = toManualPlace(doc, regionId, category, collectedAt);
        if (!place || seen.has(place.id)) continue;
        seen.add(place.id); found.push(place);
        if (++count >= perCategory) break outer;
      }
      if (result.meta.is_end) break;
    }
  }
  return found;
}
