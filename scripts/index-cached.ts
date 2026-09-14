import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { indexRow } from '../lib/server/collect';
import { parseVisitSeoulDetail, visitSeoulDetail } from '../lib/server/visit-seoul';
import { replaceCatalog } from '../lib/server/db';

// Offline only: every list ID survives missing, failed or unclassified details.
const [listPath = 'data/raw/snapshot-list.json', detailDirectory = 'data/raw/snapshot-details'] = process.argv.slice(2);
const rows = z.array(z.object({ cid: z.string().regex(/^[A-Za-z0-9]+$/), post_sj: z.string().min(1),
  lang_code_id: z.literal('ko'), cate_depth: z.string().nullish() })).min(1).parse(JSON.parse(await readFile(listPath, 'utf8')));
const entries = [];
for (const row of rows) {
  const source = { service: 'VisitSeoul' as const, POST_SN: row.cid, POST_SJ: row.post_sj, LANG_CODE_ID: row.lang_code_id,
    CATEGORY_PATH: row.cate_depth || '', ADDRESS: '', NEW_ADDRESS: '',
    POST_URL: `https://api.visitseoul.net/contents/standard/view/${row.cid}?lang=ko` };
  try {
    const raw = parseVisitSeoulDetail(JSON.parse(await readFile(join(detailDirectory, `${row.cid}.json`), 'utf8')));
    if (raw.cid !== row.cid) throw new Error('CID mismatch');
    entries.push(indexRow(source, visitSeoulDetail(raw)));
  } catch (error) {
    entries.push(indexRow(source, undefined, (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'pending' : 'failed'));
  }
}
console.log(`전체 ID ${replaceCatalog(entries)}건 저장`);
for (const status of ['ok', 'pending', 'failed']) console.log(`${status}: ${entries.filter(p => p.detailStatus === status).length}`);
console.log(`지역·카테고리·좌표 확인: ${entries.filter(p => p.regionId && p.category && p.lat !== null && p.lng !== null).length}`);
