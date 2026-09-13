import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getKakaoMapConfig, kakaoGeocode, kakaoGeocodeQuerySchema, kakaoReverseGeocode, kakaoReverseGeocodeQuerySchema } from '../lib/server/kakao-map';

test('Kakao map validates queries, separates keys and handles address results and provider failures', async () => {
  for (const input of [{ address: '' }, { address: ' ' }, { address: 'Seoul', key: 'secret' }]) {
    assert.equal(kakaoGeocodeQuerySchema.safeParse(input).success, false);
  }
  for (const lat of ['', ' ', 'NaN', 'Infinity', '91']) {
    assert.equal(kakaoReverseGeocodeQuerySchema.safeParse({ lat, lng: '127' }).success, false);
  }
  assert.equal(kakaoReverseGeocodeQuerySchema.safeParse({ lat: '37', lng: '181' }).success, false);
  const originalFetch = globalThis.fetch, oldRest = process.env.KAKAO_REST_API_KEY, oldJs = process.env.KAKAO_JAVASCRIPT_KEY;
  const forward = () => kakaoGeocode({ address: '서울 중구 세종대로 110' });
  const reverse = () => kakaoReverseGeocode({ lat: 37.5665, lng: 126.978 });
  const document = { x: '126.978', y: '37.5665', address: { address_name: '서울 중구 태평로1가 31' }, road_address: null };
  let raw: unknown = { documents: [document] }, status = 200;
  const requests: { url: URL; authorization: string | null }[] = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ url: new URL(String(input)), authorization: new Headers(init?.headers).get('Authorization') });
    return Response.json(raw, { status });
  };
  try {
    delete process.env.KAKAO_REST_API_KEY;
    delete process.env.KAKAO_JAVASCRIPT_KEY;
    await assert.rejects(forward(), { status: 503, code: 'KAKAO_MAP_NOT_CONFIGURED' });
    assert.throws(getKakaoMapConfig, { status: 503 });
    assert.equal(requests.length, 0);
    process.env.KAKAO_JAVASCRIPT_KEY = 'public-js-key';
    assert.equal(new URL(getKakaoMapConfig().sdkUrl).searchParams.get('appkey'), 'public-js-key');
    await assert.rejects(forward(), { status: 503 });
    process.env.KAKAO_REST_API_KEY = 'private-rest-key';
    assert(!JSON.stringify(getKakaoMapConfig()).includes('private-rest-key'));
    const expected = { result: { lat: 37.5665, lng: 126.978, legalAddress: document.address.address_name,
      administrativeAddress: null, roadAddress: null } };
    assert.deepEqual(await forward(), expected);
    raw = { documents: [{ address: document.address, road_address: null }] };
    assert.deepEqual(await reverse(), expected);
    assert.equal(requests[0].url.origin, 'https://dapi.kakao.com');
    assert.equal(requests[0].url.pathname, '/v2/local/search/address.json');
    assert.equal(requests[0].url.searchParams.get('query'), '서울 중구 세종대로 110');
    assert.equal(requests[0].url.searchParams.get('size'), '1');
    assert.equal(requests[1].url.pathname, '/v2/local/geo/coord2address.json');
    assert.equal(requests[1].url.searchParams.get('x'), '126.978');
    assert.equal(requests[1].url.searchParams.get('y'), '37.5665');
    assert.equal(requests[1].url.searchParams.get('input_coord'), 'WGS84');
    assert(requests.every(r => r.authorization === 'KakaoAK private-rest-key' && !r.url.href.includes('private-rest-key')));
    raw = { documents: [] };
    assert.deepEqual(await forward(), { result: null });
    assert.deepEqual(await reverse(), { result: null });
    for (const y of ['', '91', 'NaN']) {
      raw = { documents: [{ ...document, y }] };
      await assert.rejects(forward(), { status: 502, code: 'KAKAO_MAP_LOOKUP_FAILED' });
    }
    raw = { error: 'provider failure' };
    for (status of [200, 401, 429, 500]) await assert.rejects(reverse(), { status: 502 });
    globalThis.fetch = async () => { throw new Error('private-rest-key'); };
    await assert.rejects(reverse(), { status: 502, message: '카카오맵 주소 조회 실패' });
  } finally {
    globalThis.fetch = originalFetch;
    if (oldRest === undefined) delete process.env.KAKAO_REST_API_KEY; else process.env.KAKAO_REST_API_KEY = oldRest;
    if (oldJs === undefined) delete process.env.KAKAO_JAVASCRIPT_KEY; else process.env.KAKAO_JAVASCRIPT_KEY = oldJs;
  }
});
