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
