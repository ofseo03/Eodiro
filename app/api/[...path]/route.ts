import 'server-only';
import { z, ZodError } from 'zod';
import { constraintsSchema, dateTimeSchema, regionIdSchema, regions, requestSchema } from '../../../lib/contracts';
import { summarizeCourse } from '../../../lib/course';
import { preferencesSchema } from '../../../lib/contracts';
import { countPlacesByRegion, readPlaces } from '../../../lib/server/db';
import { getWeather } from '../../../lib/server/weather';
import { getRoute } from '../../../lib/server/routes';
import { getKakaoMapConfig, kakaoGeocode, kakaoGeocodeQuerySchema, kakaoReverseGeocode, kakaoReverseGeocodeQuerySchema, KakaoMapError } from '../../../lib/server/kakao-map';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
const placeIds = z.array(z.string().min(1).max(180)).min(2).max(5).refine(ids => new Set(ids).size === ids.length);

async function readBody(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ApiError(415, 'INVALID_CONTENT_TYPE', 'application/json이 필요합니다');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'INVALID_JSON', '요청 본문이 필요합니다');
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) { await reader.cancel(); throw new ApiError(413, 'BODY_TOO_LARGE', '요청이 너무 큽니다'); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ApiError(400, 'INVALID_JSON', 'JSON 형식이 잘못되었습니다'); }
}

function placesFor(regionId: string) {
  let places;
  try { places = readPlaces(regionId); }
  catch { throw new ApiError(503, 'PLACE_LOOKUP_FAILED', '장소 조회에 실패했습니다'); }
  if (!places.length) throw new ApiError(503, 'CATALOG_NOT_READY', '해당 지역의 검수된 장소 데이터가 준비되지 않았습니다');
  return places;
}
function future(at: string) {
  if (Date.parse(at) < Date.now()) throw new ApiError(400, 'PAST_START_TIME', '방문 시각은 현재 이후여야 합니다');
}
async function handle(run: () => Promise<Response>) {
  try { return await run(); }
  catch (error) {
    if (error instanceof ZodError) return json({ error: { code: 'INVALID_INPUT', message: '입력값을 확인하세요', fields: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) } }, 400);
    if (error instanceof ApiError || error instanceof KakaoMapError) return json({ error: { code: error.code, message: error.message } }, error.status);
    return json({ error: { code: 'INTERNAL_ERROR', message: '서버 처리에 실패했습니다' } }, 500);
  }
}

export async function GET(request: Request, context: Context) {
  return handle(async () => {
    const path = (await context.params).path.join('/');
    const params = Object.fromEntries(new URL(request.url).searchParams);
    if (path === 'health') return json({ status: 'ok' });
    if (path === 'regions') {
      // 후보 수는 안내용이다. 조회에 실패해도 지역 목록은 돌려주고, 후보 수는 비운다.
      let availability: ReturnType<typeof countPlacesByRegion> = {};
      try { availability = countPlacesByRegion(); } catch { /* 장소 캐시 없음 */ }
      return json({ regions: regions.map(r => ({ ...r, availability: availability[r.id] ?? { cafe: 0, restaurant: 0, activity: 0 } })) });
    }
    if (path === 'capabilities') return json({
      walking: { status: 'implemented', accuracy: 'estimated', factor: 1.3, speedKmh: 4 },
      places: { configured: true, source: 'visit_seoul', publicDownload: true },
      weather: { configured: Boolean(process.env.DATA_GO_KR_KEY), liveVerified: false },
      transit: { configured: Boolean(process.env.DATA_GO_KR_KEY), liveVerified: false,
        source: 'seoul_transit', timing: 'provider_duration' },
      taxi: { status: 'review_only', minutes: null },
      geocoding: { configured: Boolean(process.env.KAKAO_REST_API_KEY), source: 'kakao', liveVerified: false },
      map: { configured: Boolean(process.env.KAKAO_JAVASCRIPT_KEY), source: 'kakao', liveVerified: false },
    });
    if (path === 'map/config') { z.strictObject({}).parse(params); return json(getKakaoMapConfig()); }
    if (path === 'map/geocode') return json(await kakaoGeocode(kakaoGeocodeQuerySchema.parse(params)));
    if (path === 'map/reverse-geocode') return json(await kakaoReverseGeocode(kakaoReverseGeocodeQuerySchema.parse(params)));
    if (path === 'places') {
      const { regionId } = z.strictObject({ regionId: regionIdSchema }).parse(params);
      return json({ places: placesFor(regionId) });
    }
    if (path === 'weather') {
      const { regionId, startAt } = z.strictObject({ regionId: regionIdSchema, startAt: dateTimeSchema.default(() => new Date().toISOString()) }).parse(params);
      return json(await getWeather(regions.find(r => r.id === regionId)!, startAt));
    }
    throw new ApiError(404, 'NOT_FOUND', 'API를 찾을 수 없습니다');
  });
}

export async function POST(request: Request, context: Context) {
  return handle(async () => {
    const path = (await context.params).path.join('/');
    if (path !== 'routes' && path !== 'courses/evaluate') throw new ApiError(404, 'NOT_FOUND', 'API를 찾을 수 없습니다');
    const raw = await readBody(request);
    if (path === 'routes') {
      const body = z.strictObject({ regionId: regionIdSchema, fromId: z.string().max(180), toId: z.string().max(180),
        referenceAt: dateTimeSchema, constraints: constraintsSchema }).parse(raw);
      const places = placesFor(body.regionId), from = places.find(p => p.id === body.fromId), to = places.find(p => p.id === body.toId);
      if (!from || !to || from.id === to.id) throw new ApiError(400, 'INVALID_PLACE', '서로 다른 같은 지역 장소를 선택하세요');
      return json(await getRoute(from, to, body.referenceAt, body.constraints));
    }
    const body = z.strictObject({ request: requestSchema, placeIds }).parse(raw);
    // The default is generated during parsing, so only explicit timestamps require the future check here.
    if ((raw as {request?: {startAt?: unknown}}).request?.startAt) future(body.request.startAt);
    const all = placesFor(body.request.regionId);
    const places = body.placeIds.map(id => all.find(p => p.id === id));
    if (places.some(p => !p)) throw new ApiError(400, 'INVALID_PLACE', '선택 지역에 없는 장소입니다');
    const selected = places.filter(p => p !== undefined);
    if (Object.entries(body.request.counts).some(([c, n]) => selected.filter(p => p.category === c).length !== n)) throw new ApiError(400, 'INVALID_COMPOSITION', '코스 구성과 장소 수가 다릅니다');
    const weather = await getWeather(regions.find(r => r.id === body.request.regionId)!, body.request.startAt);
    const legs = [];
    let at: string | null = body.request.startAt;
    for (let i = 0; i < selected.length - 1; i++) {
      const departure: string = at ? new Date(Date.parse(at) + (selected[i].category === 'activity' ? 90 : 60) * 60000).toISOString() : body.request.startAt;
      const leg = await getRoute(selected[i], selected[i + 1], departure, body.request.constraints);
      legs.push(leg);
      at = at && leg.status === 'ok' && leg.minutes !== null ? new Date(Date.parse(departure) + leg.minutes * 60000).toISOString() : null;
    }
    return json(summarizeCourse(selected, legs, body.request, weather, preferencesSchema.parse({})));
  });
}
