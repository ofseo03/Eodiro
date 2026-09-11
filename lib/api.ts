// 프론트 화면 ↔ 백엔드 계약 어댑터.
// 실제 계산은 lib/client.ts(브라우저)와 app/api/*(서버 Route Handler)가 한다. 이 파일은 요청·응답 형태만 바꾼다.
// 취향과 제외 목록은 lib/client.ts 규칙대로 HTTP 요청에 실리지 않는다.
import { findTown } from "@/data/regions";
import { applyReplacement, createCourse, getReplacementCandidates, retryCourseLeg, BackendError } from "./client";
import type {
  Course as BackendCourse, Leg as BackendLeg, Place as BackendPlace, Preferences as BackendPreferences, Visit, Weather as BackendWeather,
} from "./contracts";
import { distanceMeters } from "./geo";
import type { Recommendation } from "./course";
import { loadLastRequest, loadPreferences } from "./storage";
import type {
  Candidate, Category, Course, CourseRequest, IndoorPref, Leg, Mood, Place, Preferences, Replacements, Weather,
} from "./types";

export type Stage = "장소 찾는 중" | "날씨 확인 중" | "경로 계산 중";
export const STAGES: Stage[] = ["장소 찾는 중", "날씨 확인 중", "경로 계산 중"];
const STAGE_OF = { places: "장소 찾는 중", weather: "날씨 확인 중", routes: "경로 계산 중" } as const;

/** 코스를 만들 수 없을 때. exhausted 는 '다시 추천'으로 후보가 소진된 경우(spec 5.4-6). */
export class CourseError extends Error {
  constructor(message: string, public kind: "no_course" | "exhausted" | "search_limit" | "catalog" | "request" | "network") {
    super(message);
    this.name = "CourseError";
  }
}

// ---------- 요청 변환 ----------

const CATEGORY_FROM: Record<BackendPlace["category"], Category> = { cafe: "카페", restaurant: "식당", activity: "놀거리" };
const ENVIRONMENT_TO: Record<IndoorPref, BackendPreferences["environment"]> = { 실내: "indoor", 실외: "outdoor", 상관없음: "any" };

/** 기기에 저장된 취향을 백엔드 형태로. 이번 요청의 실내·실외 선호가 있으면 그것을 우선한다. */
export function toBackendPreferences(prefs: Preferences, indoorOverride?: IndoorPref): BackendPreferences {
  return {
    foods: prefs.foods,
    activities: prefs.plays,
    atmospheres: prefs.moods,
    environment: ENVIRONMENT_TO[indoorOverride ?? prefs.indoor],
  };
}

function toBackendRequest(req: CourseRequest) {
  const modes = (["walk", "bus", "subway", "taxi"] as const).filter((m) => req.transport[m]);
  return {
    regionId: req.townId,
    startAt: new Date(req.visitAt).toISOString(),
    counts: { cafe: req.composition.카페, restaurant: req.composition.식당, activity: req.composition.놀거리 },
    constraints: { modes, maxWalkMeters: req.maxWalkMeters, maxTravelMinutes: req.maxTravelMinutes },
  };
}

// ---------- 응답 변환 ----------

const hhmm = (iso: string | null) => {
  if (!iso) return "미정";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function toIndoor(env: BackendPlace["environment"]): Place["indoor"] {
  return env === "indoor" ? "실내" : env === "outdoor" ? "실외" : env === "mixed" ? "실내·실외" : "미확인";
}

function toPlace(v: Visit, pin: { x: number; y: number }): Place {
  const p = v.place;
  const flags: Place["flags"] = [];
  if (v.outsidePreference) flags.push("취향 외");
  if (v.openingStatus === "hours_unknown" || (v.openingStatus === "arrival_unknown" && !p.hours)) flags.push("운영시간 미확인");
  if (!p.atmospheres.length) flags.push("분위기 미확인");
  if (v.notIndoor) flags.push("실외 포함");
  return {
    id: p.id,
    name: p.name,
    category: CATEGORY_FROM[p.category],
    subcategory: p.food ?? p.activity ?? undefined,
    indoor: toIndoor(p.environment),
    moods: p.atmospheres as Mood[],
    address: p.address,
    hours: p.hoursText || null,
    description: p.description,
    arriveAt: hhmm(v.arrivalAt),
    open: v.openingStatus === "open" ? true : v.openingStatus === "closed" ? false : null,
    flags,
    lat: p.lat,
    lng: p.lng,
    pin,
  };
}

/** 장소 좌표를 경계 상자 기준 상대 좌표(%)로. 지도 제공자를 붙이기 전 임시 표시용. */
function pins(places: BackendPlace[]): { x: number; y: number }[] {
  const lats = places.map((p) => p.lat), lngs = places.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = Math.max(maxLat - minLat, 0.002), spanLng = Math.max(maxLng - minLng, 0.003);
  const cLat = (minLat + maxLat) / 2, cLng = (minLng + maxLng) / 2;
  return places.map((p) => ({
    x: Math.round(50 + ((p.lng - cLng) / spanLng) * 64),
    y: Math.round(50 - ((p.lat - cLat) / spanLat) * 60),
  }));
}

const MODE_LABEL: Record<NonNullable<BackendLeg["mode"]>, Leg["mode"]> = { walk: "도보", bus: "버스", subway: "지하철", transit: "대중교통", taxi: "택시" };
const m = (n: number | null) => (n === null ? "" : `${Math.round(n)}m`);

function toLeg(l: BackendLeg): Leg {
  const mode: Leg["mode"] = l.mode ? MODE_LABEL[l.mode] : "미확인";
  const status: Leg["status"] =
    l.status === "no_route" ? "경로 없음"
      : l.status === "route_failed" ? "경로 조회 실패"
        : l.status === "taxi_review" ? "택시 이용 검토"
          : l.accuracy === "provider" ? "실측" : "추정";
  const parts: string[] = [];
  if (l.status === "ok" || l.status === "taxi_review") {
    if (l.routes.length) parts.push(l.routes.map((r) => `${r.mode === "bus" ? "버스" : "지하철"} ${r.name} (${r.from} → ${r.to})`).join(" · "));
    else parts.push(mode);
    if (l.distanceMeters !== null && !l.routes.length) parts.push(m(l.distanceMeters));
    if (l.minutes !== null) parts.push(`${l.minutes}분`);
    if (l.status === "taxi_review" && l.reason) parts.push(l.reason);
  } else {
    // 실패 구간은 상태 배지가 따로 붙으므로 요약에는 사유만 남긴다.
    parts.push((l.reason ?? "").replace(/\s*·\s*경로 (없음|조회 실패)$/, "") || "경로를 찾지 못했어요");
  }
  return {
    mode,
    summary: parts.join(" · "),
    minutes: l.minutes,
    status,
    accessWalkMeters: l.accessWalkMeters ? Math.round(l.accessWalkMeters) : undefined,
  };
}

function toWeather(w: BackendWeather, environment: BackendPreferences["environment"]): Weather {
  const reflected = w.status === "applied";
  const overrideReason = !w.indoorPriority ? null
    : environment === "outdoor" ? `실외 선호보다 날씨(${w.reason ?? "실내 우선 조건"})를 우선해 실내 장소로 구성했어요.`
      : `${w.reason ?? "날씨"} 기준으로 실내 장소를 우선 골랐어요.`;
  return {
    reflected,
    baseTime: hhmm(w.forecastAt),
    tempC: w.temperature,
    rainPct: w.precipitationProbability,
    indoorPriority: w.indoorPriority,
    overrideReason: reflected ? overrideReason : w.reason,
  };
}

export function toCourse(backend: BackendCourse, environment: BackendPreferences["environment"]): Course {
  const town = findTown(backend.request.regionId);
  const townName = town?.name ?? backend.request.regionId;
  const pinList = pins(backend.visits.map((v) => v.place));
  const places = backend.visits.map((v, i) => toPlace(v, pinList[i]));
  const legs = backend.legs.map(toLeg);
  const hour = new Date(backend.request.startAt).getHours();
  const walkLegs = backend.legs.filter((l) => l.mode === "walk");
  const walkCondition = !walkLegs.length ? "도보 구간 없음"
    : walkLegs.some((l) => l.walkLimit === "estimated_exceeded") ? "초과 구간 있음"
      : `${walkLegs.length}개 구간 추정 충족`;
  return {
    title: `${townName.split("·")[0].replace(/\(.*\)/, "")}에서 ${hour < 12 ? "오전" : hour < 17 ? "오후" : "저녁"} 반나절`,
    townName,
    visitAt: backend.request.startAt,
    places,
    legs,
    weather: toWeather(backend.weather, environment),
    totalMinutes: backend.knownTravelMinutes,
    confirmedLegs: backend.legs.filter((l) => l.status === "ok").length,
    maxTravelMinutes: backend.request.constraints.maxTravelMinutes,
    walkCondition,
    allConditionsMet: backend.valid,
    includesEstimates: backend.includesEstimates,
    backend,
  };
}

// ---------- 호출 ----------

function fail(err: unknown): never {
  if (err instanceof CourseError) throw err;
  if (err instanceof BackendError) {
    if (err.code === "CATALOG_NOT_READY" || err.code === "PLACE_LOOKUP_FAILED") throw new CourseError("이 동네의 장소 데이터가 아직 준비되지 않았어요.", "catalog");
    if (err.status === 400) throw new CourseError(err.message, "request");
    throw new CourseError(err.message, "network");
  }
  if (err instanceof Error) throw new CourseError(err.message, "request");
  throw new CourseError("장소를 불러오지 못했어요.", "network");
}

function unwrap(result: Recommendation, environment: BackendPreferences["environment"]): Course {
  if (result.status === "ok") return toCourse(result.course, environment);
  throw new CourseError(result.message, result.status);
}

/** 요청 조건으로 코스 1개를 계산한다. onStage 로 단계별 진행 상태를 알린다. */
export async function recommendCourse(
  req: CourseRequest,
  opts: { exclude?: string[]; onStage?: (s: Stage) => void } = {},
): Promise<Course> {
  if (!req.townId || !findTown(req.townId)) throw new CourseError("지역을 찾을 수 없어요.", "request");
  const prefs = toBackendPreferences(loadPreferences(), req.indoor);
  try {
    const result = await createCourse(toBackendRequest(req), prefs, opts.exclude ?? [], (stage) => opts.onStage?.(STAGE_OF[stage]));
    return unwrap(result, prefs.environment);
  } catch (err) {
    fail(err);
  }
}

/** 특정 구간만 다시 조회한다(spec 5.6). */
export async function retryLeg(course: Course, index: number): Promise<Course> {
  const prefs = toBackendPreferences(loadPreferences(), currentIndoor());
  try {
    return toCourse(await retryCourseLeg(course.backend, index, prefs), prefs.environment);
  } catch (err) {
    fail(err);
  }
}

/** 반경 내 같은 카테고리 교체 후보 (spec 3장 '장소 하나 교체하기'). */
export async function fetchReplacements(course: Course, index: number, radius: 100 | 300 | 500): Promise<Replacements> {
  const prefs = toBackendPreferences(loadPreferences(), currentIndoor());
  const origin = course.backend.visits[index].place;
  const arrival = course.backend.visits[index].arrivalAt;
  try {
    const r = await getReplacementCandidates(course.backend, index, prefs, radius);
    const candidates: Candidate[] = r.candidates.map((p) => ({
      id: p.id,
      name: p.name,
      distanceM: Math.round(distanceMeters(origin, p)),
      open: arrival === null || !p.hours ? null : true, // 후보는 이미 '영업 종료'가 걸러진 상태다
      moods: p.atmospheres as Mood[],
      indoor: toIndoor(p.environment),
      hours: p.hoursText || null,
      subcategory: p.food ?? p.activity ?? undefined,
    }));
    return { radius: r.radius, candidates, nextRadius: r.nextRadius as Replacements["nextRadius"], message: r.message };
  } catch (err) {
    fail(err);
  }
}

/** 후보로 교체하고 앞뒤 구간을 다시 계산한다. */
export async function replacePlace(course: Course, index: number, candidateId: string, radius: 100 | 300 | 500): Promise<Course> {
  const prefs = toBackendPreferences(loadPreferences(), currentIndoor());
  try {
    return toCourse(await applyReplacement(course.backend, index, candidateId, prefs, radius), prefs.environment);
  } catch (err) {
    fail(err);
  }
}

/** 이 코스를 만들 때 쓴 실내·실외 선호는 저장된 마지막 요청에 있다. 없으면 취향 설정을 따른다. */
function currentIndoor(): IndoorPref | undefined {
  return loadLastRequest()?.indoor;
}

/** 동네별 카테고리 후보 수. 실패하면 null (안내 없이 모두 선택 가능으로 둔다). */
export type Availability = Record<string, { cafe: number; restaurant: number; activity: number }>;
export async function fetchAvailability(): Promise<Availability | null> {
  try {
    const res = await fetch("/api/regions");
    if (!res.ok) return null;
    const data = (await res.json()) as { regions: { id: string; availability: Availability[string] }[] };
    return Object.fromEntries(data.regions.map((r) => [r.id, r.availability]));
  } catch {
    return null;
  }
}
