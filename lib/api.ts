// 추천 API 클라이언트 자리. 실제 구현은 Route Handler(app/api/*)가 공공 API를 호출해야 한다(spec 6장).
// 백엔드가 준비되기 전까지는 예시 코스를 단계별 지연과 함께 돌려준다.
import { TOWNS } from "@/data/regions";
import { addMinutes } from "./format";
import type { Course, CourseRequest, Place, Leg, Category } from "./types";

export type Stage = "장소 찾는 중" | "날씨 확인 중" | "경로 계산 중";
export const STAGES: Stage[] = ["장소 찾는 중", "날씨 확인 중", "경로 계산 중"];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Sample = Omit<Place, "arriveAt" | "open" | "flags" | "pin"> & { open?: boolean | null; flags?: Place["flags"] };

const SAMPLE_PLACES: Record<Category, Sample[]> = {
  카페: [
    { id: "c1", name: "카페 온더코너", category: "카페", indoor: "실내", moods: ["감성", "조용함"], address: "서울 성동구 성수이로 12", hours: "매일 10:00–21:00", description: "붉은 벽돌 창고를 개조한 로스터리. 넓은 좌석과 조용한 2층." },
    { id: "c2", name: "블루보틀 성수", category: "카페", indoor: "실내", moods: ["힙플"], address: "서울 성동구 아차산로 7", hours: "매일 08:00–20:00", description: "미니멀한 공간과 드립 커피. 대기 줄이 길 수 있어요." },
    { id: "c3", name: "어니언 성수", category: "카페", indoor: "실내", moods: ["힙플", "감성"], address: "서울 성동구 아차산로9길 8", hours: "매일 08:00–22:00", description: "공장 건물을 그대로 살린 베이커리 카페." },
    { id: "c4", name: "센터커피 서울숲", category: "카페", indoor: "실내", moods: ["조용함"], address: "서울 성동구 서울숲2길 28-11", hours: null, description: "서울숲 옆 조용한 스페셜티 로스터리." },
  ],
  식당: [
    { id: "r1", name: "성수 파스타 공방", category: "식당", subcategory: "양식", indoor: "실내", moods: [], address: "서울 성동구 연무장길 24", hours: null, description: "생면 파스타와 자연 와인.", flags: ["취향 외", "운영시간 미확인", "분위기 미확인"] },
    { id: "r2", name: "소문난 성수 감자탕", category: "식당", subcategory: "한식", indoor: "실내", moods: ["활기참"], address: "서울 성동구 연무장길 45", hours: "매일 24시간", description: "40년 전통의 감자탕. 늦은 시간에도 붐벼요." },
    { id: "r3", name: "밀도 성수", category: "식당", subcategory: "카페 디저트", indoor: "실내", moods: ["감성"], address: "서울 성동구 왕십리로 96", hours: "매일 09:00–21:00", description: "식빵으로 유명한 베이커리와 브런치." },
  ],
  놀거리: [
    { id: "p1", name: "디뮤지엄 성수", category: "놀거리", subcategory: "전시", indoor: "실내", moods: [], address: "서울 성동구 왕십리로 83-21", hours: "화–일 11:00–20:00", description: "성수동 대표 사립 미술관. 기획전 위주.", flags: ["분위기 미확인"] },
    { id: "p2", name: "서울숲", category: "놀거리", subcategory: "공원", indoor: "실외", moods: ["조용함"], address: "서울 성동구 뚝섬로 273", hours: "상시 개방", description: "가족마당·생태숲·사슴 방사장이 있는 큰 공원." },
    { id: "p3", name: "성수 연무장길 편집숍", category: "놀거리", subcategory: "쇼핑", indoor: "실내", moods: ["힙플"], address: "서울 성동구 연무장5길 9", hours: "매일 11:00–20:00", description: "골목 안 편집숍과 팝업 스토어." },
  ],
};

const PINS = [
  { x: 22, y: 30 }, { x: 48, y: 52 }, { x: 70, y: 36 }, { x: 36, y: 72 }, { x: 78, y: 66 },
];

function pickPlaces(req: CourseRequest, exclude: string[]): Place[] | null {
  const chosen: Sample[] = [];
  const cats: Category[] = ["카페", "식당", "놀거리"];
  for (const cat of cats) {
    const need = req.composition[cat];
    const pool = SAMPLE_PLACES[cat].filter((p) => !exclude.includes(p.id));
    if (pool.length < need) return null;
    chosen.push(...pool.slice(0, need));
  }
  // 예시: 카페 → 놀거리 → 식당 순으로 배치해 흐름을 만든다.
  const order: Category[] = ["카페", "식당", "놀거리"];
  chosen.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
  return chosen.map((s, i) => ({
    ...s,
    flags: s.flags ?? [],
    open: s.hours ? true : null,
    arriveAt: "00:00",
    pin: PINS[i % PINS.length],
  }));
}

function buildLegs(places: Place[], req: CourseRequest): Leg[] {
  const legs: Leg[] = [];
  for (let i = 0; i < places.length - 1; i++) {
    if (i === 0) {
      legs.push({ mode: "도보", summary: "도보 420m · 6분", minutes: 6, status: "추정" });
    } else if (i === 1) {
      legs.push(
        req.transport.bus
          ? { mode: "버스", summary: "버스 2224 · 2정거장 · 9분", minutes: 9, status: "경로 조회 실패", accessWalkMeters: 180 }
          : { mode: "지하철", summary: "2호선 뚝섬 → 성수 · 1정거장 · 7분", minutes: 7, status: "실측", accessWalkMeters: 260 },
      );
    } else {
      legs.push({ mode: "도보", summary: "도보 610m · 9분", minutes: 9, status: "실측" });
    }
  }
  return legs;
}

/** 요청 조건으로 코스 1개를 계산한다. onStage 로 단계별 진행 상태를 알린다. */
export async function recommendCourse(
  req: CourseRequest,
  opts: { exclude?: string[]; onStage?: (s: Stage) => void } = {},
): Promise<Course> {
  const town = TOWNS.find((t) => t.id === req.townId);
  if (!town) throw new Error("지역을 찾을 수 없어요.");

  opts.onStage?.("장소 찾는 중");
  await wait(700);
  const places = pickPlaces(req, opts.exclude ?? []);
  if (!places) throw new NoMorePlacesError();

  opts.onStage?.("날씨 확인 중");
  await wait(600);
  const hour = Number(req.visitAt.slice(11, 13));
  const rainPct = 70;
  const tempC = 26;
  const indoorPriority = rainPct >= 60 || tempC >= 30 || tempC <= 0;
  const weather = {
    reflected: true,
    baseTime: `${req.visitAt.slice(11, 16)}`,
    tempC,
    rainPct,
    indoorPriority,
    overrideReason:
      indoorPriority && req.indoor === "실외"
        ? "실외 선호보다 날씨(강수확률 60% 이상)를 우선해 실내 장소로 구성했어요."
        : indoorPriority
          ? "강수확률 60% 이상이라 실내 장소를 우선 골랐어요."
          : null,
  };

  opts.onStage?.("경로 계산 중");
  await wait(800);
  const legs = buildLegs(places, req);

  // 예상 도착 시각: 체류 60분 + 구간 이동시간 (추정)
  let clock = req.visitAt.slice(11, 16);
  places[0].arriveAt = clock;
  for (let i = 1; i < places.length; i++) {
    clock = addMinutes(clock, 60 + (legs[i - 1].minutes ?? 0));
    places[i].arriveAt = clock;
  }

  const confirmed = legs.filter((l) => l.status === "실측" || l.status === "확정 충족");
  const totalMinutes = legs.reduce((n, l) => n + (l.minutes ?? 0), 0);
  const failed = legs.some((l) => l.status === "경로 없음" || l.status === "경로 조회 실패");

  return {
    title: `${town.name.split("·")[0]}에서 ${hour < 12 ? "오전" : hour < 17 ? "오후" : "저녁"} 반나절`,
    townName: town.name,
    visitAt: req.visitAt,
    places,
    legs,
    weather,
    totalMinutes,
    confirmedLegs: confirmed.length,
    maxTravelMinutes: req.maxTravelMinutes,
    walkCondition: "구간 1 추정 충족",
    allConditionsMet: !failed && confirmed.length === legs.length,
  };
}

export class NoMorePlacesError extends Error {
  constructor() {
    super("더 이상 새로운 장소가 없습니다");
    this.name = "NoMorePlacesError";
  }
}

/** 특정 구간만 다시 조회한다(spec 5.6). */
export async function retryLeg(leg: Leg): Promise<Leg> {
  await wait(700);
  return { ...leg, status: "실측" };
}

export type Candidate = { id: string; name: string; distanceM: number; open: boolean | null; moods: Place["moods"]; indoor: Place["indoor"]; hours: string | null; address: string; description: string; subcategory?: string };

/** 반경 내 같은 카테고리 교체 후보 (spec 3장 '장소 하나 교체하기'). */
export async function fetchReplacements(place: Place, radiusM: 100 | 300 | 500, exclude: string[]): Promise<Candidate[]> {
  await wait(500);
  const pool = SAMPLE_PLACES[place.category].filter((p) => p.id !== place.id && !exclude.includes(p.id));
  const byRadius: Record<number, number> = { 100: 0, 300: 1, 500: pool.length };
  return pool.slice(0, byRadius[radiusM]).map((p, i) => ({
    id: p.id, name: p.name, distanceM: radiusM === 300 ? 210 + i * 40 : 320 + i * 60, open: p.hours ? true : null,
    moods: p.moods, indoor: p.indoor, hours: p.hours, address: p.address, description: p.description, subcategory: p.subcategory,
  }));
}

/** 교체 후 앞뒤 구간 재조회. */
export async function recomputeLegsAround(course: Course, index: number): Promise<Leg[]> {
  await wait(800);
  return course.legs.map((l, i) =>
    i === index - 1 || i === index ? { mode: "도보", summary: "도보 280m · 4분", minutes: 4, status: "실측" } : l,
  );
}
