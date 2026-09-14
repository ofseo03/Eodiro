import { placeSchema, preferencesSchema, requestSchema, type Course, type RouteResolver, type Weather, type Place } from './contracts';
import { recommend, replacementCandidates, replacePlace, retryLeg, summarizeCourse } from './course';
import { walkingLeg, emptyLeg } from './routing';

export class BackendError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}
async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, body === undefined ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new BackendError(data.error?.code ?? 'REQUEST_FAILED', data.error?.message ?? '요청 실패', response.status);
  return data as T;
}
export const routeResolver: RouteResolver = async (from, to, referenceAt, constraints) => {
  let exceeded = null;
  if (constraints.modes.includes('walk')) {
    const leg = walkingLeg(from, to, referenceAt, constraints.maxWalkMeters);
    if (leg.status === 'ok') return leg;
    exceeded = { ...leg, minutes: null };
  }
  if (!constraints.modes.some(m => m === 'bus' || m === 'subway')) return exceeded ?? emptyLeg(from, to, referenceAt);
  try { return await api('routes', { regionId: from.regionId, fromId: from.id, toId: to.id, referenceAt, constraints }); }
  catch { return { ...emptyLeg(from, to, referenceAt), status: 'route_failed', reason: '경로 조회 실패' }; }
};

/** Call from the browser. Preferences and excluded IDs never enter an HTTP request. */
export async function createCourse(input: unknown, preferences: unknown = {}, excludedIds: string[] = [], onProgress?: (stage: 'places' | 'weather' | 'routes' | 'details') => void) {
  const now = new Date(), request = requestSchema.parse(input);
  if (Date.parse(request.startAt) < now.getTime()) throw new Error('방문 시각은 현재 이후여야 합니다');
  onProgress?.('places');
  const { places } = await api<{places: Place[]}>(`places?regionId=${encodeURIComponent(request.regionId)}`);
  onProgress?.('weather');
  let weather: Weather;
  try { weather = await api<Weather>(`weather?${new URLSearchParams({ regionId: request.regionId, startAt: request.startAt })}`); }
  catch {
    weather = { status: 'unavailable', reason: '날씨 조회 실패 · 날씨 미반영', indoorPriority: false,
      temperature: null, precipitationProbability: null, forecastAt: request.startAt, issuedAt: null, fetchedAt: new Date().toISOString() };
  }
  const details = new Map<string, Place>(), excluded = new Set(excludedIds);
  // ponytail: cap at three detail rounds; raise only if real usage justifies the extra wait.
  for (let attempt = 0; attempt < 3; attempt++) {
    onProgress?.('routes');
    const result = await recommend(request, places.map(p => details.get(p.id) ?? p), weather, routeResolver, preferences, [...excluded], now);
    if (result.status !== 'ok') return result;
    onProgress?.('details');
    result.course = await hydrateCourse(result.course, preferences, result.course.visits.map(v => v.place.id), details);
    const closed = result.course.visits.filter(v => v.openingStatus === 'closed');
    if (!closed.length) return result;
    for (const visit of closed) excluded.add(visit.place.id);
  }
  return { status: 'search_limit' as const, message: '행사 일정이 변경된 장소가 많습니다. 다시 시도하거나 조건을 변경하세요' };
}

async function hydrateCourse(course: Course, preferences: unknown, ids: string[], details = new Map<string, Place>()): Promise<Course> {
  const missing = ids.filter(id => !details.has(id));
  if (missing.length) {
    const data = await api<{ places: Place[] }>('places/details', { regionId: course.request.regionId, placeIds: missing });
    const places = placeSchema.array().parse(data.places);
    if (places.length !== missing.length || missing.some(id => places.filter(p => p.id === id).length !== 1)) {
      throw new BackendError('PLACE_DETAIL_FAILED', '장소 상세 응답이 불완전합니다', 503);
    }
    for (const place of places) details.set(place.id, place);
  }
  return summarizeCourse(course.visits.map(v => details.get(v.place.id) ?? v.place), course.legs,
    course.request, course.weather, preferencesSchema.parse(preferences));
}

export async function getReplacementCandidates(course: Course, index: number, preferences: unknown = {}, radius: 100 | 300 | 500 = 100) {
  const { places } = await api<{places: Place[]}>(`places?regionId=${encodeURIComponent(course.request.regionId)}`);
  return replacementCandidates(course, index, places, preferences, radius);
}

export async function applyReplacement(course: Course, index: number, id: string, preferences: unknown = {}, radius: 100 | 300 | 500 = 100) {
  const { places } = await api<{places: Place[]}>(`places?regionId=${encodeURIComponent(course.request.regionId)}`);
  const place = places.find(p => p.id === id);
  if (!place) throw new Error('교체 장소를 찾을 수 없습니다');
  const replaced = await replacePlace(course, index, place, places, routeResolver, preferences, radius);
  const hydrated = await hydrateCourse(replaced, preferences, [id]);
  if (hydrated.visits.some(v => v.openingStatus === 'closed')) {
    throw new BackendError('PLACE_UNAVAILABLE', '방문 시각에 운영하지 않는 장소가 있습니다. 다른 교체 후보를 선택하세요', 409);
  }
  return hydrated;
}
export const retryCourseLeg = (course: Course, index: number, preferences: unknown = {}) => retryLeg(course, index, routeResolver, preferences);
