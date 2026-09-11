import { mkdir, writeFile, rename } from 'node:fs/promises';
import classification from '../config/classification.json';
import { collectSource, normalizeRows, sources } from '../lib/server/collect';
import { collectVisitSeoul } from '../lib/server/visit-seoul';
import { replaceCatalog } from '../lib/server/db';
import { regions } from '../lib/contracts';

async function main() {
  const sample = process.argv.includes('--sample');
  const source = process.argv.find(arg => arg.startsWith('--source='))?.slice('--source='.length) ?? 'visit-seoul';
  if (!['visit-seoul', 'seoul-open-data'].includes(source)) throw new Error('--source는 visit-seoul 또는 seoul-open-data여야 합니다');
  await mkdir('data/raw', { recursive: true });
  const rows = source === 'visit-seoul' ? await collectVisitSeoul(sample)
    : (await Promise.all(sources.map(service => collectSource(service, sample)))).flat();
  const path = `data/raw/${source}.json`;
  await writeFile(`${path}.tmp`, JSON.stringify(rows, null, 2));
  await rename(`${path}.tmp`, path);
  if (sample) { console.log(`샘플 ${rows.length}건 수집: ${path} (DB 미변경)`); return; }
  const result = await normalizeRows(rows, classification.overrides);
  await writeFile('data/raw/rejected.json', JSON.stringify(result.rejected, null, 2));
  if (!result.places.length) throw new Error('검수된 서비스 지역 장소가 없습니다. 기존 DB를 유지합니다');
  for (const region of regions) for (const category of ['cafe', 'restaurant', 'activity']) {
    if (!result.places.some(p => p.regionId === region.id && p.category === category)) {
      throw new Error(`${region.name} ${category} 후보가 없습니다. 기존 DB를 유지합니다`);
    }
  }
  const count = replaceCatalog(result.places);
  console.log(`장소 캐시 ${count}건 갱신, 제외 ${result.rejected.length}건. 사용자 데이터는 저장하지 않습니다.`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : '수집 실패'); process.exitCode = 1; });
