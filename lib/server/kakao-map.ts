import { z } from 'zod';
import { fetchJson } from './http';

const coordinate = z.string().trim().min(1).transform(Number).pipe(z.number().finite());
export const kakaoGeocodeQuerySchema = z.strictObject({ address: z.string().trim().min(1).max(300) });
export const kakaoReverseGeocodeQuerySchema = z.strictObject({
  lat: coordinate.pipe(z.number().min(-90).max(90)), lng: coordinate.pipe(z.number().min(-180).max(180)),
});
const addressSchema = z.object({ address_name: z.string().min(1) }).nullable();
const documentSchema = z.object({ address: addressSchema, road_address: addressSchema });
const forwardSchema = z.object({ documents: z.array(documentSchema.extend({
  x: coordinate.pipe(z.number().min(-180).max(180)), y: coordinate.pipe(z.number().min(-90).max(90)),
})) });
const reverseSchema = z.object({ documents: z.array(documentSchema) });

export class KakaoMapError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function getKakaoMapConfig() {
  const key = process.env.KAKAO_JAVASCRIPT_KEY;
  if (!key) throw new KakaoMapError(503, 'KAKAO_MAP_NOT_CONFIGURED', '카카오맵 JavaScript API 미설정');
  return { provider: 'kakao', sdkUrl: `https://dapi.kakao.com/v2/maps/sdk.js?${new URLSearchParams({ appkey: key, autoload: 'false' })}` };
}

async function lookup<T>(operation: 'search/address' | 'geo/coord2address', params: Record<string, string>, schema: z.ZodType<T>): Promise<T> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) throw new KakaoMapError(503, 'KAKAO_MAP_NOT_CONFIGURED', '카카오맵 REST API 미설정');
  const url = new URL(`https://dapi.kakao.com/v2/local/${operation}.json`);
  url.search = new URLSearchParams(params).toString();
  try { return schema.parse(await fetchJson(url, { Authorization: `KakaoAK ${key}` })); }
  catch { throw new KakaoMapError(502, 'KAKAO_MAP_LOOKUP_FAILED', '카카오맵 주소 조회 실패'); }
}

function result(document: z.infer<typeof documentSchema> | undefined, lat: number, lng: number) {
  return { result: document ? { lat, lng, legalAddress: document.address?.address_name ?? null,
    administrativeAddress: null, roadAddress: document.road_address?.address_name ?? null } : null };
}

export async function kakaoGeocode(query: z.infer<typeof kakaoGeocodeQuerySchema>) {
  const { documents } = await lookup('search/address', { query: query.address, size: '1' }, forwardSchema);
  const first = documents[0];
  return first ? result(first, first.y, first.x) : { result: null };
}

export async function kakaoReverseGeocode(query: z.infer<typeof kakaoReverseGeocodeQuerySchema>) {
  const { documents } = await lookup('geo/coord2address', { x: String(query.lng), y: String(query.lat), input_coord: 'WGS84' }, reverseSchema);
  return result(documents[0], query.lat, query.lng);
}
