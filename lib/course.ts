import { preferencesSchema, requestSchema, type Course, type CourseRequest, type Place, type Preferences, type RouteResolver, type Visit, type Weather } from './contracts';
import { distanceMeters } from './geo';
import { taxiAlternative } from './routing';

const dwell = { cafe: 60, restaurant: 60, activity: 90 };
const categories = ['cafe', 'restaurant', 'activity'] as const;
export const addMinutes = (at: string, minutes: number) => new Date(Date.parse(at) + minutes * 60000).toISOString();

export function matchesPreference(p: Place, prefs: Preferences) {
  return p.category === 'restaurant' ? !prefs.foods.length || (p.food !== null && prefs.foods.includes(p.food))
    : p.category === 'activity' ? !prefs.activities.length || (p.activity !== null && prefs.activities.includes(p.activity)) : true;
}

export function openingStatus(p: Place, at: string | null): Visit['openingStatus'] {
  if (at === null) return 'arrival_unknown';
  if (!p.hours) return 'hours_unknown';
  const local = new Date(Date.parse(at) + 9 * 3600000);
  const day = local.toISOString().slice(0, 10), weekday = local.getUTCDay();
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  const previous = new Date(local.getTime() - 86400000).toISOString().slice(0, 10);
  const today = p.hours.exceptions[day] ?? p.hours.weekly[String(weekday)];
  const yesterday = p.hours.exceptions[previous] ?? p.hours.weekly[String((weekday + 6) % 7)];
  if (today?.some(([a, b]) => minutes >= a && minutes < b)) return 'open';
  // Explicit date exceptions replace the entire date, including an overnight opening.
  if (!(day in p.hours.exceptions) && yesterday?.some(([a, b]) => minutes + 1440 >= a && minutes + 1440 < b)) return 'open';
  return today === undefined || (!(day in p.hours.exceptions) && yesterday === undefined) ? 'hours_unknown' : 'closed';
}

export function summarizeCourse(places: Place[], legs: Course['legs'], request: CourseRequest, weather: Weather, prefs: Preferences): Course {
  let arrival: string | null = request.startAt;
  const visits: Visit[] = places.map((place, i) => {
    if (i) arrival = arrival !== null && legs[i - 1].minutes !== null && legs[i - 1].status === 'ok'
      ? addMinutes(arrival, dwell[places[i - 1].category] + legs[i - 1].minutes!) : null;
    return { place, arrivalAt: arrival, openingStatus: openingStatus(place, arrival),
      outsidePreference: !matchesPreference(place, prefs), notIndoor: weather.indoorPriority && place.environment !== 'indoor' };
  });
  const knownTravelMinutes = legs.reduce((sum, leg) => sum + (leg.minutes ?? 0), 0);
  const unknown = legs.some(l => l.minutes === null || l.status !== 'ok');
  const travelLimit = knownTravelMinutes > request.constraints.maxTravelMinutes ? 'exceeded' : unknown ? 'unknown' : 'met';
  const violations = visits.flatMap((v, i) => v.openingStatus === 'closed' ? [`closed:${i}`] : []);
  legs.forEach((leg, i) => {
    if (leg.status !== 'ok') violations.push(`${leg.status}:${i}`);
    if (leg.walkLimit === 'estimated_exceeded') violations.push(`walk_limit:${i}`);
    if (leg.distanceMeters === null && leg.status === 'ok') violations.push(`distance_unknown:${i}`);
  });
  if (travelLimit !== 'met') violations.push(`travel_limit:${travelLimit}`);
  return { visits, legs, weather, request, knownTravelMinutes, totalTravelMinutes: unknown ? null : knownTravelMinutes,
    travelLimit, includesEstimates: legs.some(l => l.accuracy === 'estimated' || l.accessWalkAccuracy === 'estimated'), valid: violations.length === 0, violations };
}

// Each tier reserves only the required shortage, so relaxation never displaces a matching place.
function candidatePool(places: Place[], request: CourseRequest, prefs: Preferences, weather: Weather) {
  const pool: Place[] = [], quotas = new Map<string, number>();
  const tier = (p: Place) => `${p.category}:${matchesPreference(p, prefs) ? 0 : 1}:${weather.indoorPriority && p.environment !== 'indoor' ? 1 : 0}`;
  for (const category of categories) {
    let remaining = request.counts[category];
    const group = places.filter(p => p.category === category);
    for (const key of [...new Set(group.map(tier))].sort()) {
      const candidates = group.filter(p => tier(p) === key);
      const count = Math.min(remaining, candidates.length);
      if (count) { quotas.set(key, count); pool.push(...candidates); remaining -= count; }
    }
    if (remaining) return null;
  }
  const score = (p: Place) => prefs.atmospheres.filter(a => p.atmospheres.includes(a)).length
    + (!weather.indoorPriority && prefs.environment !== 'any' && p.environment === prefs.environment ? 1 : 0);
  pool.sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  return { pool, quotas, tier };
}

export type Recommendation = { status: 'ok'; course: Course } | { status: 'no_course' | 'exhausted' | 'search_limit'; message: string };

export async function recommend(
  input: unknown, places: Place[], weather: Weather, resolve: RouteResolver,
  preferences: unknown = {}, excludedIds: string[] = [], now = new Date(),
): Promise<Recommendation> {
  const request = requestSchema.parse(input), prefs = preferencesSchema.parse(preferences);
  if (Date.parse(request.startAt) < now.getTime()) throw new Error('방문 시각은 현재 이후여야 합니다');
  const regional = places.filter(p => p.regionId === request.regionId);
  const excluded = new Set(excludedIds);
  const candidates = candidatePool(regional.filter(p => !excluded.has(p.id)), request, prefs, weather);
  if (!candidates) {
    const exhausted = excluded.size > 0 && candidatePool(regional, request, prefs, weather) !== null;
    return { status: exhausted ? 'exhausted' : 'no_course', message: exhausted ? '더 이상 새로운 장소가 없습니다' : '조건에 맞는 코스가 없습니다' };
  }
  const memo = new Map<string, ReturnType<RouteResolver>>();
  const route: RouteResolver = (a, b, at, constraints) => {
    const key = JSON.stringify([a.id, b.id, at]);
    if (!memo.has(key)) memo.set(key, resolve(a, b, at, constraints));
    return memo.get(key)!;
  };
  let steps = 0, hitLimit = false;
  const target = Object.values(request.counts).reduce((a, b) => a + b, 0);
  async function search(allowFailed: boolean, allowTaxi: boolean): Promise<Course | null> {
    const used = new Set<string>(), taken = new Map<string, number>();
    async function visit(selected: Place[], legs: Course['legs'], arrival: string | null, known: number): Promise<Course | null> {
      // ponytail: bounded DFS; return search_limit, never a false no_course. Add a spatial solver if catalogs outgrow this budget.
      if (hitLimit) return null;
      if (selected.length === target) return summarizeCourse(selected, legs, request, weather, prefs);
      for (const p of candidates!.pool) {
        const tier = candidates!.tier(p);
        if (used.has(p.id) || (taken.get(tier) ?? 0) >= candidates!.quotas.get(tier)!) continue;
        if (++steps > 30000) { hitLimit = true; return null; }
        let nextArrival = arrival, nextKnown = known;
        const nextLegs = [...legs];
        if (selected.length) {
          const prev = selected[selected.length - 1];
          const departure = arrival === null ? request.startAt : addMinutes(arrival, dwell[prev.category]);
          let leg = await route(prev, p, departure, request.constraints);
          if (allowTaxi) leg = taxiAlternative(leg, request.constraints);
          if (leg.status === 'no_route' || (leg.status === 'route_failed' && !allowFailed) || (leg.status === 'taxi_review' && !allowTaxi)) continue;
          if (leg.walkLimit === 'estimated_exceeded') continue;
          nextKnown += leg.minutes ?? 0;
          if (nextKnown > request.constraints.maxTravelMinutes) continue;
          nextArrival = arrival !== null && leg.minutes !== null && leg.status === 'ok' ? addMinutes(departure, leg.minutes) : null;
          nextLegs.push(leg);
        }
        if (openingStatus(p, nextArrival) === 'closed') continue;
        used.add(p.id); taken.set(tier, (taken.get(tier) ?? 0) + 1);
        const result = await visit([...selected, p], nextLegs, nextArrival, nextKnown);
        used.delete(p.id); taken.set(tier, taken.get(tier)! - 1);
        if (result || hitLimit) return result;
      }
      return null;
    }
    return visit([], [], request.startAt, 0);
  }
  // Exhaust taxi-free orders before permitting a taxi; errors themselves never trigger a taxi.
  for (const [failed, taxi] of [[false, false], [true, false], [true, true]]) {
    if (taxi && !request.constraints.modes.includes('taxi')) continue;
    const course = await search(failed, taxi);
    if (course) return { status: 'ok', course };
    if (hitLimit) return { status: 'search_limit', message: '계산 범위를 초과했습니다. 장소 수를 줄여 다시 시도하세요' };
  }
  return { status: 'no_course', message: '조건에 맞는 코스가 없습니다' };
}

export function replacementCandidates(course: Course, index: number, places: Place[], preferences: unknown = {}, radius: 100 | 300 | 500 = 100) {
  if (![100, 300, 500].includes(radius) || !Number.isInteger(index) || !course.visits[index]) throw new Error('잘못된 교체 요청입니다');
  const prefs = preferencesSchema.parse(preferences), original = course.visits[index].place;
  const current = new Set(course.visits.map(v => v.place.id));
  const nearby = places.filter(p => p.regionId === course.request.regionId && p.category === original.category && !current.has(p.id)
    && distanceMeters(original, p) <= radius && openingStatus(p, course.visits[index].arrivalAt) !== 'closed');
  const request = { ...course.request, counts: { cafe: 0, restaurant: 0, activity: 0, [original.category]: 1 } };
  const pool = candidatePool(nearby, request, prefs, course.weather)?.pool ?? [];
  return { radius, candidates: pool, nextRadius: pool.length || radius === 500 ? null : radius === 100 ? 300 : 500,
    message: pool.length ? null : radius === 500 ? '교체 후보 없음' : `반경 ${radius}m 내 교체 후보 없음` };
}

export async function replacePlace(course: Course, index: number, replacement: Place, places: Place[], resolve: RouteResolver, preferences: unknown = {}, radius: 100 | 300 | 500 = 100) {
  if (!replacementCandidates(course, index, places, preferences, radius).candidates.some(p => p.id === replacement.id)) throw new Error('허용되지 않은 교체 후보입니다');
  const selected = course.visits.map((v, i) => i === index ? replacement : v.place), legs = [...course.legs];
  // The two adjacent legs only; recompute every downstream arrival/opening status afterwards.
  for (const i of [index - 1, index].filter(i => i >= 0 && i < legs.length)) {
    const partial = summarizeCourse(selected, legs, course.request, course.weather, preferencesSchema.parse(preferences));
    const at = partial.visits[i].arrivalAt;
    legs[i] = await resolve(selected[i], selected[i + 1], at ? addMinutes(at, dwell[selected[i].category]) : course.request.startAt, course.request.constraints);
    legs[i] = taxiAlternative(legs[i], course.request.constraints);
  }
  return summarizeCourse(selected, legs, course.request, course.weather, preferencesSchema.parse(preferences));
}

export async function retryLeg(course: Course, index: number, resolve: RouteResolver, preferences: unknown = {}) {
  if (!Number.isInteger(index) || !course.legs[index]) throw new Error('잘못된 구간입니다');
  const places = course.visits.map(v => v.place), legs = [...course.legs];
  const at = course.visits[index].arrivalAt;
  legs[index] = await resolve(places[index], places[index + 1], at ? addMinutes(at, dwell[places[index].category]) : course.request.startAt, course.request.constraints);
  legs[index] = taxiAlternative(legs[index], course.request.constraints);
  return summarizeCourse(places, legs, course.request, course.weather, preferencesSchema.parse(preferences));
}
