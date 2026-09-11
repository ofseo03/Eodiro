// config/regions.json 의 동네·행정동 배정을 검증한다. 겹치거나 비어 있으면 실패한다.
// 행정동 코드는 아직 붙이지 않았으므로 '자치구 내 행정동명 중복', '빈 동네', '서울 밖 좌표'를 검사한다.
import { readFileSync } from "node:fs";

const regions = JSON.parse(readFileSync(new URL("../config/regions.json", import.meta.url), "utf8"));
let errors = 0;
const fail = (msg) => { console.error(msg); errors++; };

const ids = new Set();
const seen = new Map(); // `${district}/${dong}` → town
for (const r of regions) {
  if (ids.has(r.id)) fail(`중복 동네 id: ${r.id}`);
  ids.add(r.id);
  if (!/^[a-z0-9-]+$/.test(r.id)) fail(`id 형식 오류: ${r.id}`);
  if (!Array.isArray(r.dongs) || r.dongs.length === 0) fail(`행정동이 없는 동네: ${r.id}`);
  for (const dong of r.dongs) {
    const key = `${r.district}/${dong}`;
    if (seen.has(key)) fail(`${key} 이(가) ${seen.get(key)}·${r.name} 두 동네에 배정됨`);
    seen.set(key, r.name);
  }
  if (!(r.lat > 37.4 && r.lat < 37.72 && r.lng > 126.75 && r.lng < 127.2)) fail(`서울 밖 좌표: ${r.id} (${r.lat}, ${r.lng})`);
  if (!["official", "approximate"].includes(r.centerSource)) fail(`centerSource 오류: ${r.id}`);
}
const districts = new Set(regions.map((r) => r.district)).size;
const dongs = regions.reduce((n, r) => n + r.dongs.length, 0);
if (districts !== 25) fail(`자치구 수 ${districts} ≠ 25`);
if (regions.length !== 147) fail(`동네 수 ${regions.length} ≠ 147`);
if (dongs !== 426) fail(`행정동 수 ${dongs} ≠ 426`);
const approx = regions.filter((r) => r.centerSource === "approximate").length;
console.log(`자치구 ${districts} · 동네 ${regions.length} · 행정동 ${dongs} · 근사 좌표 ${approx}${errors ? ` · 오류 ${errors}` : " · OK"}`);
process.exit(errors ? 1 : 0);
