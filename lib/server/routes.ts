import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { z } from 'zod';
import type { Constraints, Leg, Place } from '../contracts';
import { fetchText } from './http';
import { emptyLeg, walkingLeg } from '../routing';
import { distanceMeters } from '../geo';

const scalar = z.union([z.string(), z.number()]).transform(String);
const coordinate = scalar.refine(v => v.trim() !== '').transform(Number).refine(Number.isFinite);
const pathSchema = z.object({
  routeId: scalar.optional(), routeNm: scalar,
  fid: scalar, fname: scalar, fx: coordinate, fy: coordinate,
  tid: scalar, tname: scalar, tx: coordinate, ty: coordinate,
  railLinkList: z.unknown().optional(),
});
const asArray = (value: unknown) => value === undefined || value === null || value === '' ? [] : Array.isArray(value) ? value : [value];
const itemSchema = z.object({ distance: coordinate.refine(v => v >= 0), time: coordinate.refine(v => v >= 0).optional(),
  pathList: z.preprocess(asArray, z.array(pathSchema).min(1)) });

export function parseTransit(xml: string, from: Place, to: Place, at: string, constraints: Constraints, requested: 'bus' | 'subway' | 'mixed'): Leg {
  return parseTransitOptions(xml, from, to, at, constraints, requested)[0];
}

function parseTransitOptions(xml: string, from: Place, to: Place, at: string, constraints: Constraints, requested: 'bus' | 'subway' | 'mixed'): Leg[] {
  if (xml.includes('<!DOCTYPE') || XMLValidator.validate(xml) !== true) throw new Error('잘못된 경로 응답');
  const raw = new XMLParser({ parseTagValue: false, processEntities: false }).parse(xml);
  const envelope = z.object({ ServiceResult: z.object({
    msgHeader: z.object({ headerCd: scalar }), msgBody: z.unknown().optional(),
  }) }).parse(raw).ServiceResult;
  const code = envelope.msgHeader.headerCd;
  if (code === '7' || code === '8') return [emptyLeg(from, to, at)];
  if (code !== '0') throw new Error('경로 조회 실패');
  const body = z.strictObject({ itemList: z.unknown().optional() }).parse(envelope.msgBody || {});
  const items = asArray(body.itemList).map(i => itemSchema.parse(i));
  if (!items.length) return [emptyLeg(from, to, at)];
  const options: Leg[] = [];
  for (const item of items) {
    const routes: Leg['routes'] = item.pathList.map(p => {
      const mode = p.railLinkList !== undefined ? 'subway' : p.routeId && /^\d{9}$/.test(p.routeId) ? 'bus'
        : requested === 'subway' ? 'subway' : null;
      if (!mode) throw new Error('승차 수단 미확인');
      return { mode, name: p.routeNm, from: p.fname, to: p.tname,
        fromLocation: {lat: p.fy, lng: p.fx}, toLocation: {lat: p.ty, lng: p.tx} };
    });
    if (routes.some(r => !constraints.modes.includes(r.mode))) continue;
    const access = distanceMeters(from, routes[0].fromLocation!) * 1.3;
    const egress = distanceMeters(routes.at(-1)!.toLocation!, to) * 1.3;
    const transfers = routes.slice(1).map((r, i) => distanceMeters(routes[i].toLocation!, r.fromLocation!) * 1.3);
    // Use the provider duration once; walking details are display-only.
    options.push({ ...emptyLeg(from, to, at), status: 'ok', mode: requested === 'mixed' ? 'transit' : requested,
      distanceMeters: item.distance, providerMinutes: item.time ?? null, minutes: item.time ?? null, accuracy: 'provider', routes,
      accessWalkMeters: access + egress, accessWalkMinutes: Math.ceil(access / (4000 / 60)) + Math.ceil(egress / (4000 / 60)),
      accessWalkAccuracy: 'estimated',
      transferWalkMeters: transfers.reduce((sum, v) => sum + v, 0),
      transferWalkMinutes: transfers.reduce((sum, v) => sum + Math.ceil(v / (4000 / 60)), 0),
      timingNote: null, reason: null });
  }
  return options.length ? options.sort((a, b) => (a.providerMinutes ?? Infinity) - (b.providerMinutes ?? Infinity)) : [emptyLeg(from, to, at)];
}

export async function getRoute(from: Place, to: Place, at: string, constraints: Constraints): Promise<Leg> {
  let exceeded: Leg | null = null;
  if (constraints.modes.includes('walk')) {
    const leg = walkingLeg(from, to, at, constraints.maxWalkMeters);
    if (leg.status === 'ok') return leg;
    exceeded = { ...leg, minutes: null };
  }
  const bus = constraints.modes.includes('bus'), subway = constraints.modes.includes('subway');
  if (!bus && !subway) return exceeded ?? emptyLeg(from, to, at);
  const failed = (reason: string): Leg => ({ ...emptyLeg(from, to, at), status: 'route_failed', reason });
  if (!process.env.DATA_GO_KR_KEY) return failed('대중교통 API 미설정 · 경로 조회 실패');
  const kind = bus && subway ? 'mixed' : bus ? 'bus' : 'subway';
  const operation = { mixed: 'getPathInfoByBusNSub', bus: 'getPathInfoByBus', subway: 'getPathInfoBySubway' }[kind];
  const url = new URL(`http://ws.bus.go.kr/api/rest/pathinfo/${operation}`);
  url.search = new URLSearchParams({ ServiceKey: process.env.DATA_GO_KR_KEY,
    startX: String(from.lng), startY: String(from.lat), endX: String(to.lng), endY: String(to.lat) }).toString();
  try {
    const options = parseTransitOptions(await fetchText(url), from, to, at, constraints, kind);
    const timed = options.filter(l => l.status === 'ok' && l.minutes !== null).sort((a,b) => a.minutes! - b.minutes!);
    return timed.find(l => l.minutes! <= constraints.maxTravelMinutes)
      ?? options.find(l => l.status === 'ok' && l.minutes === null)
      ?? timed[0] ?? options.find(l => l.status === 'route_failed') ?? options[0];
  } catch { return failed('경로 조회 실패'); }
}
