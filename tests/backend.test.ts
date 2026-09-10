import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { constraintsSchema, placeSchema, preferencesSchema, requestSchema, type CourseRequest, type Place, type RouteResolver, type Weather } from '../lib/contracts';
import { recommend, openingStatus, replacePlace, replacementCandidates, retryLeg, summarizeCourse } from '../lib/course';
import { distanceMeters, forecastGrid } from '../lib/geo';
import { getRoute, parseTransit } from '../lib/server/routes';
import { emptyLeg, walkingLeg } from '../lib/routing';
import { forecastIssue, getWeather, parseWeather } from '../lib/server/weather';
import { atmosphereTags, collectSource, inferEnvironment, parseSource } from '../lib/server/collect';
import { readPlaces, replaceCatalog } from '../lib/server/db';
import { createCourse } from '../lib/client';
import { locateRegion } from '../lib/regions';
import { polygonCenter, polygonContains } from '../lib/geo';
import { normalizeRows, parseDownload, parsePlacePage } from '../lib/server/collect';

const now = new Date('2030-01-01T00:00:00Z');
const startAt = '2030-01-02T01:00:00Z'; // Wednesday 10:00 KST
const weather: Weather = { status: 'unavailable', reason: 'test', indoorPriority: false, temperature: null,
  precipitationProbability: null, forecastAt: startAt, issuedAt: null, fetchedAt: now.toISOString() };
const prefs = preferencesSchema.parse({});
function place(id: string, category: Place['category'], extra: Partial<Place> = {}): Place {
  return placeSchema.parse({ id, name: id, category, lat: 37.544, lng: 127.054, address: '서울 성동구 성수동',
    regionId: 'seongsu', district: '성동구', dong: '성수2가1동', source: 'synthetic test only',
    sourceUrl: 'https://example.com/test', collectedAt: now.toISOString(), environment: 'indoor', ...extra });
}
const places = [place('c', 'cafe'), place('r', 'restaurant', { lng: 127.0543 }), place('a', 'activity', { lng: 127.0546 })];
function request(extra: Partial<CourseRequest> = {}) { return requestSchema.parse({ regionId: 'seongsu', startAt, ...extra }); }
const walk: RouteResolver = async (a, b, at, c) => walkingLeg(a, b, at, c.maxWalkMeters);
const normal = request();

test('input trust boundaries: counts, distance, modes, privacy and administrative membership', () => {
  for (const extra of [
    { counts: { cafe: 1, restaurant: 0, activity: 0 } }, { counts: { cafe: 5, restaurant: 1, activity: 0 } },
    { constraints: { modes: ['taxi'] } }, { constraints: { modes: ['bus', 'bus'] } },
    { constraints: { maxWalkMeters: 1001 } }, { constraints: { maxTravelMinutes: 0 } },
    { preferences: { foods: ['한식'] } }, { userId: 'secret' }, { regionId: 'unknown' },
    { startAt: '2030-01-02T10:00:00' },
  ]) assert.equal(requestSchema.safeParse({ regionId: 'seongsu', ...extra }).success, false);
  assert.equal(placeSchema.safeParse({ ...places[0], dong: '서교동' }).success, false);
  assert.deepEqual(normal.counts, { cafe: 1, restaurant: 1, activity: 1 });
});

test('walking uses exact inclusive estimated boundary and 4km/h rounded up', () => {
  const [a, b] = places, distance = distanceMeters(a, b) * 1.3;
  assert.equal(walkingLeg(a, b, startAt, distance).status, 'ok');
  assert.equal(walkingLeg(a, b, startAt, distance - 0.001).walkLimit, 'estimated_exceeded');
  assert.equal(walkingLeg(a, b, startAt, distance).minutes, Math.ceil(distance / (4000 / 60)));
});

test('forecast issue KST rollover, grid conversion, exact TMP/POP boundaries and missing values', () => {
  assert.deepEqual(forecastGrid(37.5665, 126.978), { nx: 60, ny: 127 });
  assert.equal(forecastIssue(new Date('2030-01-01T17:09:00Z')).baseTime, '2300');
  assert.equal(forecastIssue(new Date('2030-01-01T17:10:00Z')).baseTime, '0200');
  const raw = (tmp: string, pop: string) => ({ response: { header: { resultCode: '00' }, body: { items: { item: [
    { category: 'TMP', fcstDate: '20300102', fcstTime: '1000', fcstValue: tmp },
    { category: 'POP', fcstDate: '20300102', fcstTime: '1000', fcstValue: pop },
  ] } } } });
  for (const [tmp, pop, indoor] of [['30', '0', true], ['0', '0', true], ['20', '60', true], ['29', '59', false]] as const) {
    assert.equal(parseWeather(raw(tmp, pop), startAt, now.toISOString(), now).indoorPriority, indoor);
  }
  assert.throws(() => parseWeather(raw('', '0'), startAt, now.toISOString()));
  assert.throws(() => parseWeather(raw('20', '101'), startAt, now.toISOString()));
});

test('weather outside product horizon degrades without API access', async () => {
  const result = await getWeather({ lat: 37.54, lng: 127.05 }, '2030-02-01T00:00:00Z', now);
  assert.equal(result.status, 'unavailable');
  assert.equal(result.indoorPriority, false);
  assert.match(result.reason!, /범위 밖/);
});

test('operating hours: arrival, overnight, exceptions, unknowns and break times', () => {
  const p = place('hours', 'cafe', { hours: { weekly: { '2': [[1320, 1560]], '3': [[600, 720], [780, 1080]] }, exceptions: {} } });
  assert.equal(openingStatus(p, '2030-01-01T16:00:00Z'), 'open'); // Wednesday 01:00 from Tuesday
  assert.equal(openingStatus(p, startAt), 'open');
  assert.equal(openingStatus(p, '2030-01-02T03:30:00Z'), 'closed');
  assert.equal(openingStatus(p, null), 'arrival_unknown');
  assert.equal(openingStatus(places[0], startAt), 'hours_unknown');
  p.hours!.exceptions['2030-01-02'] = [];
  assert.equal(openingStatus(p, '2030-01-01T16:00:00Z'), 'closed');
});

test('course composition and estimates; no user preference required', async () => {
  const result = await recommend(normal, places, weather, walk, {}, [], now);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.course.visits.length, 3);
  assert.equal(result.course.valid, true);
  assert.equal(result.course.includesEstimates, true);
  assert.equal(result.course.travelLimit, 'met');
  assert.equal(result.course.visits[1].arrivalAt, new Date(Date.parse(startAt)
    + ((result.course.visits[0].place.category === 'activity' ? 90 : 60) + result.course.legs[0].minutes!) * 60000).toISOString());
  await assert.rejects(recommend({ ...normal, startAt: now.toISOString() }, places, weather, walk, {}, [], new Date(now.getTime() + 1)));
});

test('shortage fills only missing preference slots, preserves category counts and weather overrides outdoor', async () => {
  const catalog = [place('r-match', 'restaurant', { food: '한식', environment: 'outdoor' }),
    place('r-extra', 'restaurant', { food: '양식' }), place('r-other', 'restaurant', { food: '일식' }), places[0]];
  const result = await recommend(request({ counts: { cafe: 1, restaurant: 2, activity: 0 } }), catalog,
    { ...weather, status: 'applied', indoorPriority: true, reason: '비 예보로 실내 우선' }, walk, { foods: ['한식'], environment: 'outdoor' }, [], now);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert(result.course.visits.some(v => v.place.id === 'r-match'));
  assert.equal(result.course.visits.filter(v => v.outsidePreference).length, 1);
  assert.equal(result.course.visits.filter(v => v.notIndoor).length, 1);
  const indoor = await recommend(request({ counts: { cafe: 2, restaurant: 0, activity: 0 } }), [places[0], place('ci', 'cafe'), place('co', 'cafe', { environment: 'outdoor' })],
    { ...weather, indoorPriority: true }, walk, { environment: 'outdoor' }, [], now);
  assert.equal(indoor.status, 'ok');
  if (indoor.status === 'ok') assert(indoor.course.visits.every(v => v.place.environment === 'indoor'));
});

test('reroll exclusions are honored and exhaustion is distinguished from impossible conditions', async () => {
  assert.equal((await recommend(normal, places, weather, walk, {}, ['c'], now)).status, 'exhausted');
  assert.equal((await recommend(normal, places.slice(0, 1), weather, walk, {}, [], now)).status, 'no_course');
  const tooLong = async (a: Place, b: Place, at: string) => ({ ...emptyLeg(a, b, at), status: 'ok' as const, minutes: 100 });
  assert.equal((await recommend(normal, places, weather, tooLong, {}, [], now)).status, 'no_course');
});

test('taxi-free alternative order wins; genuine no-route permits only an unknown-time taxi fallback', async () => {
  const input = request({ counts: { cafe: 1, restaurant: 1, activity: 0 }, constraints: constraintsSchema.parse({ modes: ['walk', 'taxi'] }) });
  const resolver: RouteResolver = async (a, b, at, c) => a.id === 'c' ? emptyLeg(a, b, at) : walkingLeg(a, b, at, c.maxWalkMeters);
  const result = await recommend(input, places, weather, resolver, {}, [], now);
  assert.equal(result.status, 'ok');
  if (result.status === 'ok') assert.equal(result.course.visits[0].place.id, 'r');
  const noRoute: RouteResolver = async (a, b, at) => emptyLeg(a, b, at);
  const taxi = await recommend(input, places, weather, noRoute, {}, [], now);
  assert.equal(taxi.status, 'ok');
  if (taxi.status === 'ok') {
    assert.equal(taxi.course.legs[0].status, 'taxi_review');
    assert.equal(taxi.course.totalTravelMinutes, null);
    assert.equal(taxi.course.travelLimit, 'unknown');
    assert.equal(taxi.course.visits[1].arrivalAt, null);
    assert.equal(taxi.course.valid, false);
  }
  assert.equal((await recommend(request({ counts: input.counts }), places, weather, noRoute, {}, [], now)).status, 'no_course');
});

test('partial routing failure never becomes taxi and retry fetches only selected segment', async () => {
  const failed: RouteResolver = async (a, b, at) => ({ ...emptyLeg(a, b, at), status: 'route_failed' });
  const result = await recommend(request({ constraints: constraintsSchema.parse({ modes: ['bus', 'taxi'] }) }), places, weather, failed, {}, [], now);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert(result.course.legs.every(l => l.status === 'route_failed'));
  let calls = 0;
  const retried = await retryLeg(result.course, 0, async (...args) => { calls++; return walk(...args); });
  assert.equal(calls, 1);
  assert.equal(retried.legs[1], result.course.legs[1]);
  assert.equal(retried.totalTravelMinutes, null);
});

test('replacement radius, same category, exclusion, two neighboring legs and downstream closing recheck', async () => {
  const original = await recommend(normal, places, weather, walk, {}, [], now);
  assert.equal(original.status, 'ok');
  if (original.status !== 'ok') return;
  const course = original.course, index = 1, p = course.visits[index].place;
  course.visits[2].place = { ...course.visits[2].place, hours: {
    weekly: Object.fromEntries(Array.from({length: 7}, (_, i) => [String(i), [[0, 840]]])), exceptions: {},
  } };
  const nearby = place('near', p.category, { lng: p.lng + 0.0001 });
  const far = place('far', p.category, { lng: p.lng + 0.002 });
  const other = place('wrong-category', p.category === 'cafe' ? 'restaurant' : 'cafe');
  const catalog = [...places, nearby, far, other];
  assert.deepEqual(replacementCandidates(course, index, catalog).candidates.map(p => p.id), ['near']);
  assert(replacementCandidates(course, index, catalog, {}, 300).candidates.some(p => p.id === 'far'));
  assert.equal(replacementCandidates(course, index, places).nextRadius, 300);
  let calls = 0;
  const replaced = await replacePlace(course, index, nearby, catalog, async (a, b, at) => {
    calls++; return { ...walkingLeg(a, b, at, 1000), minutes: 61 };
  });
  assert.equal(calls, 2);
  assert.equal(replaced.visits[0].place.id, course.visits[0].place.id);
  assert.equal(replaced.visits[index].place.id, 'near');
  assert.equal(replaced.travelLimit, 'exceeded');
  assert.equal(replaced.valid, false);
  assert(replaced.violations.includes('closed:2'));
  await assert.rejects(replacePlace(course, index, far, catalog, walk));
});

test('provider XML preserves returned duration, missing time, mode restrictions and errors', () => {
  const wrap = (body: string, code = '0') => `<ServiceResult><msgHeader><headerCd>${code}</headerCd></msgHeader><msgBody>${body}</msgBody></ServiceResult>`;
  assert.equal(parseTransit(wrap('', '7'), places[0], places[1], startAt, normal.constraints, 'bus').status, 'no_route');
  assert.throws(() => parseTransit(wrap('', '1'), places[0], places[1], startAt, normal.constraints, 'bus'));
  assert.throws(() => parseTransit('not xml', places[0], places[1], startAt, normal.constraints, 'bus'));
  const item = '<itemList><distance>500</distance><time>27</time><pathList><routeId>100100047</routeId><routeNm>271</routeNm><fid>1</fid><fname>A</fname><fx>127.05</fx><fy>37.54</fy><tid>2</tid><tname>B</tname><tx>127.06</tx><ty>37.55</ty></pathList></itemList>';
  const leg = parseTransit(wrap(item), places[0], places[1], startAt, constraintsSchema.parse({ modes: ['bus'] }), 'mixed');
  assert.equal(leg.status, 'ok'); assert.equal(leg.providerMinutes, 27); assert.equal(leg.minutes, 27);
  assert.equal(leg.timingNote, null);
  assert.equal(parseTransit(wrap(item.replace('<time>27</time>', '')), places[0], places[1], startAt, normal.constraints, 'bus').minutes, null);
  assert(leg.accessWalkMeters! > 0);
  assert.equal(leg.accessWalkAccuracy, 'estimated');
  assert.equal(parseTransit(wrap(item), places[0], places[1], startAt, constraintsSchema.parse({ modes: ['subway'] }), 'mixed').status, 'no_route');
});

test('missing transit configuration fails explicitly but valid estimated walking still works', async () => {
  const old = process.env.DATA_GO_KR_KEY;
  delete process.env.DATA_GO_KR_KEY;
  try {
    assert.equal((await getRoute(places[0], places[1], startAt, normal.constraints)).status, 'ok');
    assert.equal((await getRoute(places[0], places[1], startAt, constraintsSchema.parse({ modes: ['bus'] }))).status, 'route_failed');
  } finally { if (old !== undefined) process.env.DATA_GO_KR_KEY = old; }
});

test('unknown time propagates through all arrivals and known sum cannot pass an exceeded cap', () => {
  const legs = [emptyLeg(places[0], places[1], startAt), { ...walkingLeg(places[1], places[2], startAt, 1000), minutes: 61 }];
  const course = summarizeCourse(places, legs, normal, weather, prefs);
  assert.equal(course.totalTravelMinutes, null);
  assert.equal(course.knownTravelMinutes, 61);
  assert.equal(course.travelLimit, 'exceeded');
  assert.equal(course.visits[2].arrivalAt, null);
});

test('collector rejects provider errors, preserves missing fields and classifies only documented categories', () => {
  assert.throws(() => parseSource({ RESULT: { CODE: 'ERROR-300' } }, 'TbVwRestaurants'));
  assert.equal(inferEnvironment('activity', '체험'), 'unknown');
  assert.equal(inferEnvironment('activity', '공원'), 'outdoor');
  assert.deepEqual(atmosphereTags('조용하고 아늑한 공간'), ['조용함', '감성']);
  assert.deepEqual(atmosphereTags(''), []);
});

test('SQLite refresh is atomic and never replaces the cache with invalid/empty/duplicate data', () => {
  const directory = mkdtempSync(resolve('.test-db-')), old = process.env.PLACE_DB_PATH;
  process.env.PLACE_DB_PATH = resolve(directory, 'places.sqlite');
  try {
    assert.equal(replaceCatalog(places), 3);
    for (const bad of [[], [{ ...places[0], regionId: 'unknown' }], [places[0], places[0]]]) assert.throws(() => replaceCatalog(bad));
    assert.equal(readPlaces('seongsu').length, 3);
    assert.equal(readPlaces('hongdae').length, 0);
  } finally {
    if (old === undefined) delete process.env.PLACE_DB_PATH; else process.env.PLACE_DB_PATH = old;
    rmSync(directory, { recursive: true, force: true });
  }
});

test('browser workflow emits stages while preferences and exclusions remain absent from HTTP payloads', async () => {
  const originalFetch = globalThis.fetch, calls: {path: string; body: unknown}[] = [], stages: string[] = [];
  globalThis.fetch = async (url, init) => {
    const path = String(url), body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ path, body });
    if (path.startsWith('/api/places?')) return Response.json({ places });
    if (path.startsWith('/api/weather?')) return Response.json(weather);
    assert.equal(path, '/api/routes');
    assert.deepEqual(Object.keys(body).sort(), ['constraints', 'fromId', 'referenceAt', 'regionId', 'toId']);
    return Response.json({ ...emptyLeg(places.find(p => p.id === body.fromId)!, places.find(p => p.id === body.toId)!, body.referenceAt),
      status: 'ok', mode: 'bus', minutes: 2, accuracy: 'provider' });
  };
  try {
    const result = await createCourse({ regionId: 'seongsu', startAt: new Date(Date.now() + 86400000).toISOString(), constraints: { modes: ['bus'] } },
      { foods: ['한식'], atmospheres: ['조용함'] }, ['seen-private-id'], stage => stages.push(stage));
    assert.equal(result.status, 'ok');
    assert.deepEqual(stages, ['places', 'weather', 'routes']);
    const serialized = JSON.stringify(calls);
    for (const privateValue of ['한식', '조용함', 'seen-private-id', 'preferences', 'excludedIds']) assert(!serialized.includes(privateValue));
  } finally { globalThis.fetch = originalFetch; }
});

test('weather HTTP failure does not prevent a walking course in the browser workflow', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    if (String(url).startsWith('/api/places?')) return Response.json({ places });
    throw new Error('network failure');
  };
  try {
    const result = await createCourse({ regionId: 'seongsu', constraints: { modes: ['walk'] } });
    assert.equal(result.status, 'ok');
    if (result.status === 'ok') assert.equal(result.course.weather.status, 'unavailable');
  } finally { globalThis.fetch = originalFetch; }
});

test('collector paginates source rows even when an entire page is not Korean', async () => {
  const originalFetch = globalThis.fetch, key = process.env.SEOUL_API_KEY;
  process.env.SEOUL_API_KEY = 'test-only';
  let calls = 0;
  globalThis.fetch = async url => {
    calls++;
    assert(!String(url).endsWith('/ko'));
    const row = { POST_SN: '1', LANG_CODE_ID: calls === 1 ? 'en' : 'ko', POST_SJ: 'test',
      POST_URL: 'https://example.com/test', ADDRESS: 'test', NEW_ADDRESS: 'test' };
    return Response.json({ TbVwRestaurants: { list_total_count: 1001, RESULT: { CODE: 'INFO-000' },
      row: Array.from({ length: calls === 1 ? 1000 : 1 }, () => row) } });
  };
  try { assert.equal((await collectSource('TbVwRestaurants')).length, 1); assert.equal(calls, 2); }
  finally { globalThis.fetch = originalFetch; if (key === undefined) delete process.env.SEOUL_API_KEY; else process.env.SEOUL_API_KEY = key; }
});

test('administrative boundaries reject a real coordinate outside the claimed region and handle holes', () => {
  assert.equal(locateRegion({lat:37.574, lng:126.990})?.regionId, 'ikseon');
  assert.equal(placeSchema.safeParse({...places[0], lat:37.574, lng:126.990}).success, false);
  const square = [[0,0],[4,0],[4,4],[0,4],[0,0]], hole = [[1,1],[3,1],[3,3],[1,3],[1,1]];
  assert.equal(polygonContains({lat:2,lng:2}, [square,hole]), false);
  assert.equal(polygonContains({lat:0,lng:2}, [square,hole]), true);
  assert.deepEqual(polygonCenter([[square]]), {lat:2,lng:2});
});

test('public dataset download and official place HTML preserve unknowns without inventing coordinates', () => {
  const row = {post_sn:42,lang_code_id:'ko',post_sj:'카페',post_url:'https://korean.visitseoul.net/test',address:'주소',new_address:null,cmmn_use_time:null};
  assert.equal(parseDownload({DATA:[row]}, 'TbVwRestaurants')[0].POST_SN, '42');
  const page = parsePlacePage('<meta name="description" content="조용한 카페 &amp; 전시"><div class="text-type">카페&amp;디저트</div><div data-map-x="127.054" data-map-y="37.544">');
  assert.deepEqual(page.location, {lat:37.544,lng:127.054});
  assert.equal(page.category, '카페&디저트');
  assert.equal(parsePlacePage('<html>삭제된 페이지</html>').location, null);
});

test('collection uses Visit Seoul coordinates only and rejects missing coordinates without another API', async () => {
  const originalFetch = globalThis.fetch, urls: string[] = [];
  globalThis.fetch = async input => {
    urls.push(String(input));
    return new Response('<html>좌표 미제공</html>');
  };
  try {
    const rows = parseDownload({DATA:[{post_sn:42,lang_code_id:'ko',post_sj:'카페',
      post_url:'https://korean.visitseoul.net/test',address:'주소',new_address:''}]}, 'TbVwRestaurants');
    const result = await normalizeRows(rows, {'TbVwRestaurants:42':{category:'cafe'}});
    assert.equal(result.places.length, 0);
    assert.equal(result.rejected.length, 1);
    assert.deepEqual(urls, ['https://korean.visitseoul.net/test']);
  } finally { globalThis.fetch = originalFetch; }
});

test('one public routing API supplies bus, subway and mixed durations for limits and arrivals', async () => {
  const originalFetch = globalThis.fetch, oldKey = process.env.DATA_GO_KR_KEY;
  process.env.DATA_GO_KR_KEY = 'test-only';
  let calls = 0;
  const path = (subway: boolean) => `<pathList><routeNm>${subway ? '2호선' : '2016'}</routeNm>${subway ? '<railLinkList><railLinkId>1</railLinkId></railLinkList>' : '<routeId>100100522</routeId>'}<fid>1</fid><fname>A</fname><fx>127.05</fx><fy>37.54</fy><tid>2</tid><tname>B</tname><tx>127.06</tx><ty>37.55</ty></pathList>`;
  globalThis.fetch = async input => {
    calls++;
    const url = new URL(String(input));
    assert.equal(url.hostname, 'ws.bus.go.kr');
    const kind = url.pathname.split('/').at(-1);
    const paths = kind === 'getPathInfoBySubway' ? path(true)
      : kind === 'getPathInfoByBusNSub' ? path(false) + path(true) : path(false);
    return new Response(`<ServiceResult><msgHeader><headerCd>0</headerCd></msgHeader><msgBody><itemList><distance>1500</distance><time>11</time>${paths}</itemList><itemList><distance>1700</distance><time>15</time>${paths}</itemList></msgBody></ServiceResult>`);
  };
  try {
    for (const modes of [['bus'], ['subway'], ['bus', 'subway']]) {
      const constraints = constraintsSchema.parse({modes, maxWalkMeters:1, maxTravelMinutes:11});
      const leg = await getRoute(places[0], places[1], startAt, constraints);
      assert.equal(leg.minutes, 11);
      assert.equal(leg.timingNote, null);
      assert.equal(leg.walkLimit, 'not_applicable');
      const input = request({counts:{cafe:1,restaurant:1,activity:0}, constraints});
      const course = summarizeCourse(places.slice(0,2), [leg], input, weather, prefs);
      assert.equal(course.valid, true);
      assert.equal(course.totalTravelMinutes, 11);
      assert.equal(course.visits[1].arrivalAt, new Date(Date.parse(startAt) + 71 * 60000).toISOString());
      assert.equal(summarizeCourse(places.slice(0,2), [leg], {...input, constraints:{...constraints,maxTravelMinutes:10}}, weather, prefs).travelLimit, 'exceeded');
    }
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.DATA_GO_KR_KEY; else process.env.DATA_GO_KR_KEY = oldKey;
  }
});
