// 기기 저장(localStorage) 헬퍼. 서버로는 아무것도 보내지 않는다 (spec 2.2, 5.2).
import { DEFAULT_PREFERENCES, type CourseRequest, type Preferences } from "./types";

const KEY_PREFS = "eodiro:preferences";
const KEY_ONBOARDED = "eodiro:onboarded";
const KEY_LAST_REQUEST = "eodiro:lastRequest";
const KEY_SEEN_PLACES = "eodiro:seenPlaces";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 불가(사생활 보호 모드 등)는 조용히 무시한다 */
  }
}

function remove(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

export function loadPreferences(): Preferences {
  return { ...DEFAULT_PREFERENCES, ...(read<Partial<Preferences>>(KEY_PREFS) ?? {}) };
}
export function savePreferences(p: Preferences) {
  write(KEY_PREFS, p);
}
export function isOnboarded(): boolean {
  return read<boolean>(KEY_ONBOARDED) === true;
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
  return read<CourseRequest>(KEY_LAST_REQUEST);
}
export function saveLastRequest(r: CourseRequest) {
  write(KEY_LAST_REQUEST, r);
}

/** '다시 추천' 세션에서 이미 보여준 장소 (spec 5.4-6). 조건이 바뀌면 초기화한다. */
export function loadSeenPlaces(): string[] {
  return read<string[]>(KEY_SEEN_PLACES) ?? [];
}
export function saveSeenPlaces(ids: string[]) {
  write(KEY_SEEN_PLACES, ids);
}
export function clearSeenPlaces() {
  remove(KEY_SEEN_PLACES);
}
