import { mkdir, writeFile, rename } from 'node:fs/promises';
import { collectSource, normalizeRows, sources } from '../lib/server/collect';
import { collectVisitSeoul } from '../lib/server/visit-seoul';
import { replaceCatalog } from '../lib/server/db';

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
  const result = await normalizeRows(rows);
  await writeFile('data/raw/failed.json', JSON.stringify(result.failures, null, 2));
  const count = replaceCatalog(result.places);
  console.log(`전체 ID 인덱스 ${count}건 저장, 상세 조회 실패 ${result.failures.length}건. 사용자 데이터는 저장하지 않습니다.`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : '수집 실패'); process.exitCode = 1; });
