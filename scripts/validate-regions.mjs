// data/regions.ts 의 동네·행정동 배정을 검증한다. 겹치거나 비어 있으면 실패한다.
// 행정동 코드는 아직 붙이지 않았으므로 지금은 '자치구 내 행정동명 중복'과 '빈 동네'만 검사한다.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../data/regions.ts", import.meta.url), "utf8");
const districts = [...src.matchAll(/\{ name: "([^"]+)", towns: \[\n([\s\S]*?)\n  \] \}/g)].map((m) => ({
  name: m[1],
  towns: [...m[2].matchAll(/\{ id: "([^"]+)", name: "([^"]+)", dongs: (\[[^\]]*\]) \}/g)].map((t) => ({
    id: t[1], name: t[2], dongs: JSON.parse(t[3]),
  })),
}));

let errors = 0;
const ids = new Set();
for (const d of districts) {
  const seen = new Map();
  for (const t of d.towns) {
    if (ids.has(t.id)) { console.error(`중복 동네 id: ${t.id}`); errors++; }
    ids.add(t.id);
    if (t.dongs.length === 0) { console.error(`행정동이 없는 동네: ${t.id}`); errors++; }
    for (const dong of t.dongs) {
      if (seen.has(dong)) { console.error(`${d.name} ${dong} 이(가) ${seen.get(dong)}·${t.name} 두 동네에 배정됨`); errors++; }
      seen.set(dong, t.name);
    }
  }
}
const towns = districts.reduce((n, d) => n + d.towns.length, 0);
const dongs = districts.reduce((n, d) => n + d.towns.reduce((m, t) => m + t.dongs.length, 0), 0);
if (districts.length !== 25) { console.error(`자치구 수 ${districts.length} ≠ 25`); errors++; }
if (towns !== 147) { console.error(`동네 수 ${towns} ≠ 147`); errors++; }
if (dongs !== 426) { console.error(`행정동 수 ${dongs} ≠ 426`); errors++; }
console.log(`자치구 ${districts.length} · 동네 ${towns} · 행정동 ${dongs}${errors ? ` · 오류 ${errors}` : " · OK"}`);
process.exit(errors ? 1 : 0);
