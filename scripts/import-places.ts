import { readFile } from 'node:fs/promises';
import { replaceCatalog } from '../lib/server/db';

const path = process.argv[2];
if (!path) { console.error('사용법: npm run import:places -- <전체 ID 인덱스 JSON 경로>'); process.exitCode = 1; }
else {
  try { console.log(`전체 ID 인덱스 ${replaceCatalog(JSON.parse(await readFile(path, 'utf8')))}건 갱신`); }
  catch { console.error('가져오기 실패: 파일·장소 형식을 확인하세요. 기존 데이터는 유지됩니다.'); process.exitCode = 1; }
}
