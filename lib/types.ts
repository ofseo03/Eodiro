// 서비스 전반에서 쓰는 타입. spec.md 2장(입력)·4장(결과) 기준.

export const FOOD_TYPES = ["한식", "양식", "일식", "중식", "아시안", "카페 디저트", "기타"] as const;
export const PLAY_TYPES = ["전시", "체험", "쇼핑", "공원", "공연", "기타"] as const;
export const MOODS = ["조용함", "활기참", "감성", "힙플"] as const;
export const INDOOR_PREFS = ["실내", "실외", "상관없음"] as const;

export type FoodType = (typeof FOOD_TYPES)[number];
export type PlayType = (typeof PLAY_TYPES)[number];
export type Mood = (typeof MOODS)[number];
export type IndoorPref = (typeof INDOOR_PREFS)[number];

/** 초기 취향(spec 2.1). 기기(localStorage)에만 저장한다. */
export type Preferences = {
  foods: FoodType[];
  plays: PlayType[];
  moods: Mood[];
  indoor: IndoorPref;
};

export const DEFAULT_PREFERENCES: Preferences = { foods: [], plays: [], moods: [], indoor: "상관없음" };

export type Category = "카페" | "식당" | "놀거리";
export const CATEGORIES: Category[] = ["카페", "식당", "놀거리"];

/** 코스 요청 입력(spec 2.3). */
export type CourseRequest = {
  townId: string | null;
  /** datetime-local 문자열 (YYYY-MM-DDTHH:mm) */
  visitAt: string;
  composition: Record<Category, number>;
  maxTravelMinutes: number;
  transport: { bus: boolean; subway: boolean; walk: boolean; taxi: boolean };
  maxWalkMeters: number;
  indoor: IndoorPref;
};

export const MIN_PLACES = 2;
export const MAX_PLACES = 5;
export const MAX_WALK_METERS = 1000;

export type LegStatus = "확정 충족" | "실측" | "추정" | "택시 이용 검토" | "경로 없음" | "경로 조회 실패";
export type PlaceFlag = "취향 외" | "운영시간 미확인" | "분위기 미확인";

export type Place = {
  id: string;
  name: string;
  category: Category;
  subcategory?: string;
  indoor: "실내" | "실외" | "미확인";
  moods: Mood[];
  address: string;
  hours: string | null;
  description: string;
  arriveAt: string; // HH:mm
  open: boolean | null; // null = 운영시간 미확인
  flags: PlaceFlag[];
  /** 지도 위 상대 좌표(%) — 지도 제공자 연결 전 임시 */
  pin: { x: number; y: number };
};

export type Leg = {
  mode: "도보" | "버스" | "지하철" | "택시";
  summary: string; // "도보 420m · 6분"
  minutes: number | null;
  status: LegStatus;
  accessWalkMeters?: number;
};

export type Weather = {
  reflected: boolean;
  baseTime: string;
  tempC: number | null;
  rainPct: number | null;
  indoorPriority: boolean;
  overrideReason: string | null;
};

export type Course = {
  title: string;
  townName: string;
  visitAt: string;
  places: Place[];
  legs: Leg[]; // places.length - 1
  weather: Weather;
  totalMinutes: number;
  confirmedLegs: number;
  maxTravelMinutes: number;
  walkCondition: string;
  allConditionsMet: boolean;
};
