import { mkdir, writeFile, rename } from 'node:fs/promises';
import classification from '../config/classification.json';
import { collectSource, normalizeRows, sources } from '../lib/server/collect';
import { replaceCatalog } from '../lib/server/db';

async function main() {
  const sample = process.argv.includes('--sample');
  await mkdir('data/raw', { recursive: true });
  const rows = (await Promise.all(sources.map(source => collectSource(source, sample)))).flat();
  await writeFile('data/raw/visit-seoul.json.tmp', JSON.stringify(rows, null, 2));
  await rename('data/raw/visit-seoul.json.tmp', 'data/raw/visit-seoul.json');
  if (sample) { console.log(`샘플 ${rows.length}건 수집: data/raw/visit-seoul.json (DB 미변경)`); return; }
  const result = await normalizeRows(rows, classification.overrides);
  await writeFile('data/raw/rejected.json', JSON.stringify(result.rejected, null, 2));
  if (!result.places.length) throw new Error('검수된 서비스 지역 장소가 없습니다. 기존 DB를 유지합니다');
  const count = replaceCatalog(result.places);
  console.log(`장소 캐시 ${count}건 갱신, 제외 ${result.rejected.length}건. 사용자 데이터는 저장하지 않습니다.`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : '수집 실패'); process.exitCode = 1; });
