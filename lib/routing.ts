import type { Constraints, Leg, Place, RouteResolver } from './contracts';
import { distanceMeters } from './geo';

export function emptyLeg(from: Place, to: Place, at: string): Leg {
  return { fromId: from.id, toId: to.id, status: 'no_route', mode: null, distanceMeters: null, minutes: null,
    accuracy: 'unknown', walkLimit: 'not_applicable', accessWalkMeters: null, accessWalkMinutes: null,
    routes: [], providerMinutes: null, timingNote: null, referenceAt: at, fetchedAt: new Date().toISOString(), reason: '경로 없음' };
}

export function walkingLeg(from: Place, to: Place, at: string, maxMeters: number): Leg {
  const distance = distanceMeters(from, to) * 1.3;
  return { ...emptyLeg(from, to, at), status: distance <= maxMeters ? 'ok' : 'no_route', mode: 'walk',
    distanceMeters: distance, minutes: Math.ceil(distance / (4000 / 60)), accuracy: 'estimated',
    walkLimit: distance <= maxMeters ? 'estimated_met' : 'estimated_exceeded',
    accessWalkMeters: 0, accessWalkMinutes: 0, reason: distance <= maxMeters ? null : '추정 보행거리 초과' };
}

// 탐색 전용 대중교통 추정: 직선거리 × 1.3 을 평균 15km/h 로 나누고 대기·환승 10분을 더한다.
// 실제 경로 API는 확정된 코스의 구간에만 호출한다(lib/course.ts recommend).
const TRANSIT_METERS_PER_MINUTE = 15000 / 60;
const TRANSIT_OVERHEAD_MINUTES = 10;

/** 경로 API 없이 계산하는 추정 구간. 도보 판정은 walkingLeg 와 같고, 대중교통은 거리 기반 어림값이다. */
export function estimatedLeg(from: Place, to: Place, at: string, constraints: Constraints): Leg {
  let exceeded: Leg | null = null;
  if (constraints.modes.includes('walk')) {
    const leg = walkingLeg(from, to, at, constraints.maxWalkMeters);
    if (leg.status === 'ok') return leg;
    exceeded = { ...leg, minutes: null };
  }
  const bus = constraints.modes.includes('bus'), subway = constraints.modes.includes('subway');
  if (!bus && !subway) return exceeded ?? emptyLeg(from, to, at);
  const distance = distanceMeters(from, to) * 1.3;
  return { ...emptyLeg(from, to, at), status: 'ok', mode: bus && subway ? 'transit' : bus ? 'bus' : 'subway',
    distanceMeters: distance, minutes: TRANSIT_OVERHEAD_MINUTES + Math.ceil(distance / TRANSIT_METERS_PER_MINUTE),
    accuracy: 'estimated', reason: null };
}

/** 같은 장소 쌍·조건의 경로 조회를 한 번만 하도록 감싼다. 출발 시각은 키에 넣지 않는다(분 단위 차이로 재조회하지 않기 위해). */
export function memoizeRoutes(resolve: RouteResolver): RouteResolver {
  const memo = new Map<string, Promise<Leg>>();
  return (from, to, at, constraints) => {
    const key = JSON.stringify([from.id, to.id, constraints]);
    let pending = memo.get(key);
    if (!pending) {
      pending = resolve(from, to, at, constraints);
      memo.set(key, pending);
      pending.catch(() => memo.delete(key));
    }
    return pending;
  };
}

export function taxiAlternative(leg: Leg, constraints: Constraints): Leg {
  return leg.status === 'no_route' && constraints.modes.includes('taxi') ? {
    ...leg, status: 'taxi_review', mode: 'taxi', minutes: null, distanceMeters: null,
    accuracy: 'unknown', walkLimit: 'not_applicable', reason: '택시 이용 검토 · 소요시간 미확인',
  } : leg;
}
