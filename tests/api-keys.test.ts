import test from 'node:test';
import assert from 'node:assert/strict';
import { collectSource, normalizeRows } from '../lib/server/collect';
import { collectVisitSeoul, getVisitSeoulDetail } from '../lib/server/visit-seoul';

test('Visit Seoul and Seoul Open Data use separate keys, endpoints and content identities', async () => {
  const originalFetch = globalThis.fetch;
  const oldVisit = process.env.VISITSEOUL_API_KEY, oldSeoul = process.env.SEOUL_API_KEY;
  process.env.VISITSEOUL_API_KEY = 'visit-only';
  process.env.SEOUL_API_KEY = 'seoul-only';
  const calls: string[] = [];
  let fail = false, missingCoordinates = false;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input)), headers = new Headers(init?.headers);
    calls.push(url.hostname);
    if (url.hostname === 'openapi.seoul.go.kr') {
      assert(url.pathname.includes('/seoul-only/'));
      assert.equal(headers.get('VISITSEOUL-API-KEY'), null);
      return Response.json({ TbVwRestaurants: { list_total_count: 0, RESULT: { CODE: 'INFO-000' }, row: [] } });
    }
    assert.equal(url.hostname, 'api-call.visitseoul.net');
    assert.equal(headers.get('VISITSEOUL-API-KEY'), 'visit-only');
    assert.equal(headers.get('Content-Type'), 'application/json;charset=UTF-8');
    assert.equal(init?.method, 'POST');
    assert(!String(input).includes('visit-only'));
    assert(!String(init?.body).includes('seoul-only'));
    if (fail) return Response.json({ result_code: 401 });
    const params = JSON.parse(String(init?.body));
    if (url.pathname.endsWith('/list')) {
      assert.equal(params.lang_code_id, 'ko');
      assert([1, 2].includes(params.page_no));
      return Response.json({ result_code: 200,
        data: [{ cid: `KO${params.page_no}`, lang_code_id: 'ko', post_sj: '카페' }],
        paging: { page_no: params.page_no, page_size: 1, total_count: 2 } });
    }
    assert.equal(url.pathname, '/api/v1/contents/info');
    assert.equal(params.cid, 'KO1');
    return Response.json({ result_code: 200, data: { cid: 'KO1', lang_code_id: 'ko', post_sj: '카페',
      post_desc: '<p>조용한 카페</p>', extra: { cmmn_use_time: '10:00~20:00' },
      traffic: { new_adres: '서울 성동구', map_position_x: missingCoordinates ? '' : '127.054', map_position_y: '37.544' } } });
  };
  try {
    const rows = await collectVisitSeoul();
    assert.deepEqual(rows.map(row => `${row.service}:${row.POST_SN}`), ['VisitSeoul:KO1', 'VisitSeoul:KO2']);
    const normalized = await normalizeRows(rows, { 'VisitSeoul:KO1': { category: 'cafe' } });
    assert.equal(normalized.places.length, 1);
    assert.equal(normalized.places[0].address, '서울 성동구');
    assert.equal(normalized.places[0].description, '조용한 카페');
    assert.equal(normalized.places[0].hoursText, '10:00~20:00');
    assert.equal(normalized.places[0].source, '서울관광재단 · 비짓서울 API');
    assert.equal(normalized.rejected[0].id, 'VisitSeoul:KO2');
    missingCoordinates = true;
    assert.equal((await getVisitSeoulDetail('KO1')).location, null);
    await collectSource('TbVwRestaurants');
    assert.equal(calls.filter(host => host === 'openapi.seoul.go.kr').length, 1);
    fail = true;
    await assert.rejects(collectVisitSeoul());
    assert.equal(calls.filter(host => host === 'openapi.seoul.go.kr').length, 1);
    delete process.env.VISITSEOUL_API_KEY;
    const count = calls.length;
    await assert.rejects(collectVisitSeoul(), /VISITSEOUL_API_KEY/);
    assert.equal(calls.length, count);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldVisit === undefined) delete process.env.VISITSEOUL_API_KEY; else process.env.VISITSEOUL_API_KEY = oldVisit;
    if (oldSeoul === undefined) delete process.env.SEOUL_API_KEY; else process.env.SEOUL_API_KEY = oldSeoul;
  }
});
