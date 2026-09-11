// Run against a running app: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/test-map.mjs http://127.0.0.1:3000
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const places = JSON.parse(await readFile(new URL('../data/sample-places.json', import.meta.url), 'utf8')).filter(p => p.regionId === 'seongsu');
  await page.addInitScript(() => {
    localStorage.setItem('eodiro:onboarded', 'true');
    localStorage.setItem('eodiro:lastRequest', JSON.stringify({ townId: 'seongsu', visitAt: new Date(Date.now() + 86400000).toISOString().slice(0,16), composition: { '카페': 1, '식당': 1, '놀거리': 1 }, maxTravelMinutes: 60, maxWalkMeters: 1000, transport: { walk: true, bus: false, subway: false, taxi: false }, indoor: '상관없음' }));
  });
  await page.route('**/api/places?*', route => route.fulfill({ json: { places } }));
  await page.route('**/api/weather?*', route => route.fulfill({ status: 503, json: {} }));
  let configured = false;
  await page.route('**/api/map/config', route => route.fulfill(configured ? { json: { provider: 'kakao', sdkUrl: 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=test&autoload=false' } } : { status: 503, json: {} }));
  await page.route('https://dapi.kakao.com/v2/maps/sdk.js?*', route => route.fulfill({ contentType: 'text/javascript', body: `
    window.mapChecks = { points: [], fits: 0, pans: 0 };
    window.kakao = { maps: {
      load: callback => callback(),
      LatLng: class { constructor(lat, lng) { this.lat = lat; this.lng = lng; } },
      LatLngBounds: class { extend() {} },
      Map: class { constructor(element) { this.element = element; } setBounds() { window.mapChecks.fits++; } panTo() { window.mapChecks.pans++; } relayout() {} },
      CustomOverlay: class { constructor({map, position, content}) { this.content = content; window.mapChecks.points.push(position); map.element.append(content); } setMap(map) { if (!map) this.content.remove(); } }
    }};
  ` }));
  await page.goto(`${process.argv[2] || 'http://127.0.0.1:3000'}/result`);
  const map = page.getByRole('group', { name: '코스 지도' });
  await map.getByText('지도를 불러오지 못했어요.', { exact: false }).waitFor();
  configured = true;
  await map.getByRole('button', { name: '다시 시도' }).click();
  await map.getByRole('button', { name: '전체 코스 보기' }).waitFor();
  assert.equal(await map.locator('.marker').count(), 3);
  const points = await page.evaluate(() => window.mapChecks.points);
  assert(points.every(point => places.some(p => p.lat === point.lat && p.lng === point.lng)));
  await map.locator('.marker').nth(1).click();
  await page.waitForFunction(() => document.querySelectorAll('.marker.is-active').length === 1);
  assert.equal(await map.locator('.marker').nth(1).getAttribute('aria-pressed'), 'true');
  await page.locator('.place-card').first().click();
  await page.waitForFunction(() => document.querySelector('.marker')?.getAttribute('aria-pressed') === 'true');
  const fits = await page.evaluate(() => window.mapChecks.fits);
  await map.getByRole('button', { name: '전체 코스 보기' }).click();
  assert((await page.evaluate(() => window.mapChecks.fits)) > fits);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  assert.equal(await map.locator('.marker').count(), 3);
  assert.deepEqual(errors, []);
  console.log('Map browser check passed: config failure/retry, coordinate markers, selection, bounds and mobile resize (mock Kakao SDK).');
} finally { await browser.close(); }
