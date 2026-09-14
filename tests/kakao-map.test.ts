import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getKakaoMapConfig, kakaoGeocode, kakaoGeocodeQuerySchema, kakaoReverseGeocode, kakaoReverseGeocodeQuerySchema } from '../lib/server/kakao-map';
import { classifyKakao, collectKakaoPlaces, passesKakaoRules, regionRects, searchKakaoCategory, toManualPlace } from '../lib/server/kakao-places';

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

test('Kakao category search fills missing categories only with places inside the neighbourhood boundary', async () => {
  assert.deepEqual(classifyKakao('음식점 > 카페 > 커피전문점', 'cafe'), { category: 'cafe', food: '카페 디저트', activity: null });
  assert.equal(classifyKakao('음식점 > 한식', 'cafe'), null);
  assert.deepEqual(classifyKakao('음식점 > 아시아음식 > 베트남음식', 'restaurant'), { category: 'restaurant', food: '아시안', activity: null });
  assert.equal(classifyKakao('음식점 > 술집 > 호프,요리주점', 'restaurant'), null);
  assert.equal(classifyKakao('음식점 > 카페 > 커피전문점', 'restaurant'), null);
  assert.equal(classifyKakao('가정,생활 > 유아 > 놀이시설 > 키즈카페 > 서울형키즈카페', 'cafe'), null);
  assert.equal(classifyKakao('가정,생활 > 여가시설 > 만화방 > 만화카페 > 놀숲', 'cafe'), null);
  assert.equal(classifyKakao('가정,생활 > 여가시설 > 보드카페', 'cafe'), null);
  assert.equal(classifyKakao('음식점 > 카페', 'cafe', '우리끼리 키즈 카페 마곡점'), null);
  assert.equal(classifyKakao('음식점 > 구내식당 > 밥플러스', 'restaurant'), null);
  assert.equal(classifyKakao('음식점 > 패스트푸드 > 롯데리아', 'restaurant'), null);
  assert.equal(classifyKakao('음식점 > 간식 > 제과,베이커리', 'restaurant'), null);
  assert.deepEqual(classifyKakao('음식점 > 간식 > 제과,베이커리', 'cafe'), { category: 'cafe', food: '카페 디저트', activity: null });
  assert.equal(passesKakaoRules({ id: 'manual:kakao-1', name: '서울형키즈카페 홍제점', category: 'cafe', sourceCategory: '가정,생활 > 유아 > 놀이시설 > 키즈카페' }), false);
  assert.equal(passesKakaoRules({ id: 'manual:kakao-2', name: '동네 카페', category: 'cafe', sourceCategory: '음식점 > 카페' }), true);
  assert.equal(passesKakaoRules({ id: 'VisitSeoul:KO1', name: '키즈카페', category: 'cafe', sourceCategory: '' }), true, 'only Kakao-sourced rows are pruned');
  assert.deepEqual(classifyKakao('문화,예술 > 문화시설 > 미술관', 'activity'), { category: 'activity', food: null, activity: '전시' });
  assert.deepEqual(classifyKakao('여행 > 관광,명소 > 공원', 'activity'), { category: 'activity', food: null, activity: '공원' });
  assert.equal(classifyKakao('음식점 > 한식', 'activity'), null);
  const rects = regionRects('seongsu');
  assert.equal(rects.length, 4);
  for (const { rect } of rects) assert.match(rect, /^127\.\d+,37\.\d+,127\.\d+,37\.\d+$/);

  const doc = (id: string, x: number, y: number, category_name: string) => ({ id, place_name: `장소 ${id}`, category_name,
    address_name: '서울 성동구 성수동2가 1', road_address_name: '서울 성동구 성수이로 1', place_url: `http://place.map.kakao.com/${id}`, x: String(x), y: String(y) });
  const inside = { x: 127.054, y: 37.544 }, outside = { x: 127.1, y: 37.55 };
  const place = toManualPlace({ ...doc('1', inside.x, inside.y, '음식점 > 카페 > 커피전문점'), x: inside.x, y: inside.y }, 'seongsu', 'cafe', '2030-01-01T00:00:00Z');
  assert.equal(place?.id, 'manual:kakao-1');
  assert.equal(place?.dong, '성수2가3동');
  assert.equal(place?.address, '서울 성동구 성수이로 1');
  assert.equal(place?.description, '카페 · 커피전문점');
  assert.equal(place?.environmentSource, 'inferred');
  assert.equal(toManualPlace({ ...doc('2', outside.x, outside.y, '음식점 > 카페'), x: outside.x, y: outside.y }, 'seongsu', 'cafe', '2030-01-01T00:00:00Z'), null);

  const calls: { group: string; page: number }[] = [];
  const pages: Record<string, ReturnType<typeof doc>[][]> = {
    CE7: [[doc('10', outside.x, outside.y, '음식점 > 카페'), doc('11', inside.x, inside.y, '음식점 > 카페 > 커피전문점')],
      [doc('12', inside.x, inside.y, '음식점 > 카페 > 디저트카페'), doc('13', inside.x, inside.y, '음식점 > 카페')]],
    FD6: [[doc('20', inside.x, inside.y, '음식점 > 술집'), doc('21', inside.x, inside.y, '음식점 > 일식 > 초밥,롤')]],
    CT1: [[]], AT4: [[doc('30', inside.x, inside.y, '여행 > 관광,명소 > 공원')]],
  };
  const search: typeof searchKakaoCategory = async (group, _rect, page) => {
    calls.push({ group, page });
    const list = pages[group][page - 1] ?? [];
    return { documents: list.map(d => ({ ...d, x: Number(d.x), y: Number(d.y) })), meta: { is_end: page >= pages[group].length } };
  };
  const found = await collectKakaoPlaces('seongsu', ['cafe', 'restaurant', 'activity'], 2, new Set(['manual:kakao-12']), search, '2030-01-01T00:00:00Z');
  assert.deepEqual(found.map(p => [p.id, p.category, p.food ?? p.activity]),
    [['manual:kakao-11', 'cafe', '카페 디저트'], ['manual:kakao-13', 'cafe', '카페 디저트'], ['manual:kakao-21', 'restaurant', '일식'], ['manual:kakao-30', 'activity', '공원']]);
  assert(calls.some(c => c.group === 'CE7' && c.page === 2), 'continues to the next page until enough places are found');
  assert(calls.some(c => c.group === 'AT4'), 'falls back to the second activity group when the first is empty');
  await assert.rejects(collectKakaoPlaces('nowhere', ['cafe'], 1, new Set(), search));

  const originalFetch = globalThis.fetch, oldKey = process.env.KAKAO_REST_API_KEY;
  let request: { url: URL; authorization: string | null } | null = null;
  globalThis.fetch = async (input, init) => {
    request = { url: new URL(String(input)), authorization: new Headers(init?.headers).get('Authorization') };
    return Response.json({ documents: [], meta: { is_end: true } });
  };
  try {
    delete process.env.KAKAO_REST_API_KEY;
    await assert.rejects(searchKakaoCategory('CE7', '127,37,128,38', 1), /KAKAO_REST_API_KEY/);
    assert.equal(request, null);
    process.env.KAKAO_REST_API_KEY = 'rest-key';
    await searchKakaoCategory('CE7', '127,37,128,38', 2);
    assert.equal(request!.url.origin + request!.url.pathname, 'https://dapi.kakao.com/v2/local/search/category.json');
    assert.equal(request!.url.searchParams.get('category_group_code'), 'CE7');
    assert.equal(request!.url.searchParams.get('rect'), '127,37,128,38');
    assert.equal(request!.url.searchParams.get('page'), '2');
    assert.equal(request!.authorization, 'KakaoAK rest-key');
    globalThis.fetch = async () => Response.json({ errorType: 'AccessDeniedError', message: 'wrong appKey(xxx) format' }, { status: 401 });
    await assert.rejects(searchKakaoCategory('CE7', '127,37,128,38', 1), (error: unknown) =>
      error instanceof Error && /HTTP 401 — AccessDeniedError: wrong appKey\(xxx\) format → .*REST API 키/.test(error.message)
      && (error as { fatal?: boolean }).fatal === true);
    globalThis.fetch = async () => new Response('<html>Service Unavailable</html>', { status: 503 });
    await assert.rejects(searchKakaoCategory('CE7', '127,37,128,38', 1), (error: unknown) =>
      error instanceof Error && error.message.includes('HTTP 503') && error.message.includes('Service Unavailable') && (error as { fatal?: boolean }).fatal === false);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.KAKAO_REST_API_KEY; else process.env.KAKAO_REST_API_KEY = oldKey;
  }
});
