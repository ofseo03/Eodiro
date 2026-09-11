// 동네 목록. 원본은 config/regions.json (scripts/gen-regions.mjs 가 spec.md 부록 A에서 생성).
// 백엔드 계약(lib/contracts.ts)과 같은 파일을 쓰므로 프론트·백엔드의 지역 id가 항상 일치한다.
import regions from "@/config/regions.json";

export type Town = {
  id: string;
  name: string;
  district: string;
  dongs: string[];
  lat: number;
  lng: number;
  /** official = 공식 행정동 경계 중심, approximate = 근사값(예보 격자 선택 용도) */
  centerSource: "official" | "approximate";
  /** 사람이 장소 데이터를 검수하는 우선 검수 지역 */
  priority: boolean;
};
export type District = { name: string; towns: Town[] };

export const TOWNS: Town[] = regions as Town[];

/** 자치구별 묶음. 순서는 spec 부록 A(종로구 → 강동구)를 따른다. */
export const DISTRICTS: District[] = TOWNS.reduce<District[]>((acc, town) => {
  const last = acc[acc.length - 1];
  if (last && last.name === town.district) last.towns.push(town);
  else acc.push({ name: town.district, towns: [town] });
  return acc;
}, []);

export const TOWN_COUNT = TOWNS.length;
export const DONG_COUNT = TOWNS.reduce((n, t) => n + t.dongs.length, 0);

export function findTown(id: string | null | undefined): Town | null {
  return TOWNS.find((t) => t.id === id) ?? null;
}
