import test from 'node:test';
import assert from 'node:assert/strict';
import { placeSchema } from '../lib/contracts';
import { collectSource, normalizeRows } from '../lib/server/collect';
import { collectVisitSeoul, getVisitSeoulDetail, getPlaceDetails, VisitSeoulError } from '../lib/server/visit-seoul';

test('Visit Seoul and Seoul Open Data use separate keys, endpoints and content identities', async () => {
  const originalFetch = globalThis.fetch;
  const oldVisit = process.env.VISITSEOUL_API_KEY, oldSeoul = process.env.SEOUL_API_KEY;
  process.env.VISITSEOUL_API_KEY = 'visit-only';
  process.env.SEOUL_API_KEY = 'seoul-only';
  const calls: string[] = [];
  let fail = false, missingCoordinates = false, duplicateIds = false;
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
        data: duplicateIds ? Array(2).fill({ cid: 'KO1', lang_code_id: 'ko', post_sj: '카페' })
          : [{ cid: `KO${params.page_no}`, lang_code_id: 'ko', post_sj: '카페' }],
        paging: { page_no: params.page_no, page_size: duplicateIds ? 2 : 1, total_count: 2 } });
    }
    assert.equal(url.pathname, '/api/v1/contents/info');
    assert(['KO1', 'KO2'].includes(params.cid));
    return Response.json({ result_code: 200, data: { cid: params.cid, lang_code_id: 'ko', post_sj: '카페', cate_depth: '음식 > 카페/찻집',
      post_desc: '<p>조용한 카페</p>', extra: { cmmn_use_time: '10:00~20:00' },
      traffic: { new_adres: '서울 성동구', map_position_x: missingCoordinates ? '' : '127.054', map_position_y: '37.544' } } });
  };
  try {
    const rows = await collectVisitSeoul();
    assert.deepEqual(rows.map(row => `${row.service}:${row.POST_SN}`), ['VisitSeoul:KO1', 'VisitSeoul:KO2']);
    const normalized = await normalizeRows(rows);
    assert.equal(normalized.places.length, 2);
    assert.equal(normalized.failures.length, 0);
    assert(normalized.places.every(p => p.category === 'cafe'));
    const selected = placeSchema.parse(Object.fromEntries(Object.keys(placeSchema.shape)
      .filter(key => key in normalized.places[0]).map(key => [key, normalized.places[0][key as keyof typeof normalized.places[0]]])));
    const details = await getPlaceDetails([selected]);
    assert.equal(details[0].description, '조용한 카페');
    assert.equal(details[0].hoursText, '10:00~20:00');
    assert.equal(details[0].address, '서울 성동구');
    await assert.rejects(getPlaceDetails([{ ...selected, id: 'VisitSeoul:../../bad' }]));
    missingCoordinates = true;
    assert.equal((await getVisitSeoulDetail('KO1')).location, null);
    await collectSource('TbVwRestaurants');
    assert.equal(calls.filter(host => host === 'openapi.seoul.go.kr').length, 1);
    duplicateIds = true;
    await assert.rejects(collectVisitSeoul(), { code: 'VISITSEOUL_INCOMPLETE_PAGE' });
    fail = true;
    await assert.rejects(collectVisitSeoul());
    assert.equal(calls.filter(host => host === 'openapi.seoul.go.kr').length, 1);
    globalThis.fetch = async () => {
      calls.push('blocked');
      return new Response('<html>Web firewall denied secret-body</html>', { headers: { 'content-type': 'text/html' } });
    };
    await assert.rejects(getVisitSeoulDetail('KO1'), (error: unknown) => error instanceof VisitSeoulError
      && error.status === 503 && error.code === 'VISITSEOUL_BLOCKED' && !error.message.includes('secret-body'));
    assert.equal(calls.filter(call => call === 'blocked').length, 1);
    globalThis.fetch = async () => {
      calls.push('limited');
      return new Response('', { status: 429, headers: { 'retry-after': '7' } });
    };
    await assert.rejects(getVisitSeoulDetail('KO1'), { status: 429, code: 'VISITSEOUL_RATE_LIMITED', retryAfterSeconds: 7 });
    assert.equal(calls.filter(call => call === 'limited').length, 1);
    globalThis.fetch = async () => { calls.push('oversized'); return new Response('x'.repeat(8 * 1024 * 1024 + 1)); };
    await assert.rejects(getVisitSeoulDetail('KO1'), { status: 502, code: 'VISITSEOUL_UNAVAILABLE' });
    delete process.env.VISITSEOUL_API_KEY;
    const count = calls.length;
    await assert.rejects(collectVisitSeoul(), (error: unknown) => error instanceof VisitSeoulError && error.code === 'VISITSEOUL_NOT_CONFIGURED');
    assert.equal(calls.length, count);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldVisit === undefined) delete process.env.VISITSEOUL_API_KEY; else process.env.VISITSEOUL_API_KEY = oldVisit;
    if (oldSeoul === undefined) delete process.env.SEOUL_API_KEY; else process.env.SEOUL_API_KEY = oldSeoul;
  }
});
