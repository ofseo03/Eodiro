// 기기 저장(localStorage) 헬퍼. 서버로는 아무것도 보내지 않는다 (spec 2.2, 5.2).
// 읽기 결과는 원본 문자열 기준으로 캐시해 같은 값이면 같은 객체를 돌려준다(useSyncExternalStore 스냅숏 안정성).
import { DEFAULT_PREFERENCES, type CourseRequest, type Preferences } from "./types";

const KEY_PREFS = "eodiro:preferences";
const KEY_ONBOARDED = "eodiro:onboarded";
const KEY_LAST_REQUEST = "eodiro:lastRequest";
const KEY_SEEN_PLACES = "eodiro:seenPlaces";

const cache = new Map<string, { raw: string | null; value: unknown }>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

/** 저장소 변경 구독. 같은 탭의 쓰기와 다른 탭의 storage 이벤트를 모두 받는다. */
export function subscribeStorage(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read<T>(key: string, normalize: (v: unknown) => T, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T = fallback;
  if (raw !== null) {
    try {
      value = normalize(JSON.parse(raw));
    } catch {
      value = fallback;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 불가(사생활 보호 모드 등)는 조용히 무시한다 */
  }
  notify();
}

function remove(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
  notify();
}

export function loadPreferences(): Preferences {
  return read(KEY_PREFS, (v) => ({ ...DEFAULT_PREFERENCES, ...(v as Partial<Preferences>) }), DEFAULT_PREFERENCES);
}
export function savePreferences(p: Preferences) {
  write(KEY_PREFS, p);
}
export function isOnboarded(): boolean {
  return read(KEY_ONBOARDED, (v) => v === true, false);
}
export function markOnboarded() {
  write(KEY_ONBOARDED, true);
}
/** 취향 초기화: 취향과 온보딩 완료 표시를 함께 지운다 (spec 5.7). */
export function resetPreferences() {
  remove(KEY_PREFS);
  remove(KEY_ONBOARDED);
}

export function loadLastRequest(): CourseRequest | null {
  return read<CourseRequest | null>(KEY_LAST_REQUEST, (v) => v as CourseRequest, null);
}
export function saveLastRequest(r: CourseRequest) {
  write(KEY_LAST_REQUEST, r);
}

const NO_PLACES: string[] = [];
/** '다시 추천' 세션에서 이미 보여준 장소 (spec 5.4-6). 조건이 바뀌면 초기화한다. */
export function loadSeenPlaces(): string[] {
  return read(KEY_SEEN_PLACES, (v) => (Array.isArray(v) ? (v as string[]) : NO_PLACES), NO_PLACES);
}
export function saveSeenPlaces(ids: string[]) {
  write(KEY_SEEN_PLACES, ids);
}
export function clearSeenPlaces() {
  remove(KEY_SEEN_PLACES);
}
