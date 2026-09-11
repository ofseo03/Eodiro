import { requestSchema, type Course, type RouteResolver, type Weather, type Place } from './contracts';
import { recommend, replacementCandidates, replacePlace, retryLeg } from './course';
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
export async function createCourse(input: unknown, preferences: unknown = {}, excludedIds: string[] = [], onProgress?: (stage: 'places' | 'weather' | 'routes') => void) {
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
  onProgress?.('routes');
  return recommend(request, places, weather, routeResolver, preferences, excludedIds, now);
}

export async function getReplacementCandidates(course: Course, index: number, preferences: unknown = {}, radius: 100 | 300 | 500 = 100) {
  const { places } = await api<{places: Place[]}>(`places?regionId=${encodeURIComponent(course.request.regionId)}`);
  return replacementCandidates(course, index, places, preferences, radius);
}

export async function applyReplacement(course: Course, index: number, id: string, preferences: unknown = {}, radius: 100 | 300 | 500 = 100) {
  const { places } = await api<{places: Place[]}>(`places?regionId=${encodeURIComponent(course.request.regionId)}`);
  const place = places.find(p => p.id === id);
  if (!place) throw new Error('교체 장소를 찾을 수 없습니다');
  return replacePlace(course, index, place, places, routeResolver, preferences, radius);
}
export const retryCourseLeg = (course: Course, index: number, preferences: unknown = {}) => retryLeg(course, index, routeResolver, preferences);
