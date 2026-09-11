// spec.md 부록 A를 읽어 data/regions.ts 를 생성한다. (node scripts/gen-regions.mjs)
import { readFileSync, writeFileSync } from "node:fs";

const spec = readFileSync(new URL("../spec.md", import.meta.url), "utf8");
const start = spec.indexOf("## 부록 A.");
const body = spec.slice(start);

const districts = [];
let cur = null;
for (const line of body.split("\n")) {
  const h = line.match(/^### (.+?)\s*$/);
  if (h) { cur = { name: h[1].trim(), towns: [] }; districts.push(cur); continue; }
  const row = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/);
  if (row && cur && row[1] !== "동네" && !/^-+$/.test(row[1])) {
    // '종로1·2·3·4가동'처럼 행정동 이름에 ·가 있을 수 있다. 실제 행정동명은 한글로 시작하므로 숫자 앞의 ·는 나누지 않는다.
    const dongs = row[2].split(/·(?=\D)/).map(s => s.trim()).filter(Boolean);
    cur.towns.push({ name: row[1], dongs });
  }
}

const slug = (s) => s.normalize("NFC").replace(/[\s·()]+/g, "-").replace(/^-|-$/g, "");
let out = `// 이 파일은 scripts/gen-regions.mjs 가 spec.md 부록 A에서 생성한다. 직접 수정하지 말 것.\n`;
out += `export type Town = { id: string; name: string; dongs: string[] };\n`;
out += `export type District = { name: string; towns: Town[] };\n\n`;
out += `export const DISTRICTS: District[] = [\n`;
for (const d of districts) {
  out += `  { name: ${JSON.stringify(d.name)}, towns: [\n`;
  for (const t of d.towns) {
    out += `    { id: ${JSON.stringify(slug(d.name) + "/" + slug(t.name))}, name: ${JSON.stringify(t.name)}, dongs: ${JSON.stringify(t.dongs)} },\n`;
  }
  out += `  ] },\n`;
}
out += `];\n\nexport const TOWNS: Town[] = DISTRICTS.flatMap((d) => d.towns);\n`;
out += `export const TOWN_COUNT = ${districts.reduce((n, d) => n + d.towns.length, 0)};\n`;
out += `export const DONG_COUNT = ${districts.reduce((n, d) => n + d.towns.reduce((m, t) => m + t.dongs.length, 0), 0)};\n`;
writeFileSync(new URL("../data/regions.ts", import.meta.url), out);
console.log(`districts=${districts.length} towns=${districts.reduce((n, d) => n + d.towns.length, 0)} dongs=${districts.reduce((n, d) => n + d.towns.reduce((m, t) => m + t.dongs.length, 0), 0)}`);
