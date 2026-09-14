import { z } from 'zod';
import regionData from '../config/regions.json';
import { locateRegion } from './regions';
import { MAX_PER_CATEGORY, compositionProblem } from './composition';

export const regions = regionData;
export const categorySchema = z.enum(['cafe', 'restaurant', 'activity']);
export const modeSchema = z.enum(['walk', 'bus', 'subway', 'taxi']);
export const foodSchema = z.enum(['한식', '양식', '일식', '중식', '아시안', '카페 디저트', '기타']);
export const activitySchema = z.enum(['전시', '체험', '쇼핑', '공원', '공연', '기타']);
export const atmosphereSchema = z.enum(['조용함', '활기참', '감성', '힙플']);
export const environmentSchema = z.enum(['indoor', 'outdoor', 'mixed', 'unknown']);
export const preferencesSchema = z.strictObject({
  foods: z.array(foodSchema).default([]),
  activities: z.array(activitySchema).default([]),
  atmospheres: z.array(atmosphereSchema).default([]),
  environment: z.enum(['indoor', 'outdoor', 'any']).default('any'),
});
export const regionIdSchema = z.string().refine(id => regions.some(r => r.id === id), '지원하지 않는 지역입니다');
export const dateTimeSchema = z.iso.datetime({ offset: true });
export const constraintsSchema = z.strictObject({
  modes: z.array(modeSchema).min(1).max(4).default(['walk', 'bus', 'subway'])
    .refine(m => new Set(m).size === m.length && m.some(v => v !== 'taxi'), '택시 외 교통수단을 선택하세요'),
  maxWalkMeters: z.number().positive().max(1000).default(500),
  maxTravelMinutes: z.number().positive().default(60),
});
export const requestSchema = z.strictObject({
  regionId: regionIdSchema,
  startAt: dateTimeSchema.default(() => new Date().toISOString()),
  counts: z.strictObject({
    cafe: z.number().int().min(0).max(MAX_PER_CATEGORY.cafe).default(1),
    restaurant: z.number().int().min(0).max(MAX_PER_CATEGORY.restaurant).default(1),
    activity: z.number().int().min(0).max(MAX_PER_CATEGORY.activity).default(1),
  }).default({ cafe: 1, restaurant: 1, activity: 1 }).superRefine((c, ctx) => {
    const problem = compositionProblem(c);
    if (problem) ctx.addIssue({ code: 'custom', message: problem });
  }),
  constraints: constraintsSchema.default({ modes: ['walk', 'bus', 'subway'], maxWalkMeters: 500, maxTravelMinutes: 60 }),
});
const intervalSchema = z.tuple([z.number().int().min(0).max(1439), z.number().int().min(1).max(2880)])
  .refine(([a, b]) => b > a && b - a <= 1440, '운영시간 구간이 잘못되었습니다');
export const hoursSchema = z.strictObject({
  weekly: z.record(z.string().regex(/^[0-6]$/), z.array(intervalSchema)),
  exceptions: z.record(z.iso.date(), z.array(intervalSchema)).default({}),
});
export const placeSchema = z.strictObject({
  id: z.string().min(1).max(180), name: z.string().min(1).max(500),
  regionId: regionIdSchema, district: z.string(), dong: z.string(),
  category: categorySchema, lat: z.number().min(37.4).max(37.72), lng: z.number().min(126.75).max(127.2),
  address: z.string().default(''), description: z.string().default(''),
  detailFailed: z.boolean().optional(),
  food: foodSchema.nullable().default(null), activity: activitySchema.nullable().default(null),
  environment: environmentSchema.default('unknown'),
  environmentSource: z.enum(['source', 'inferred', 'reviewed']).default('inferred'),
  atmospheres: z.array(atmosphereSchema).default([]),
  hours: hoursSchema.nullable().default(null), hoursText: z.string().default(''),
  availableFrom: z.iso.date().nullable().default(null), availableUntil: z.iso.date().nullable().default(null),
  sourceUrl: z.url().refine(u => ['https:', 'http:'].includes(new URL(u).protocol)),
  source: z.string().min(1), collectedAt: dateTimeSchema,
}).refine(p => regions.some(r => r.id === p.regionId && r.district === p.district && r.dongs.includes(p.dong))
  && locateRegion(p)?.regionId === p.regionId,
  '장소의 행정동이 선택 지역에 속하지 않습니다');

/** 비짓서울 콘텐츠 ID. 주소·설명은 상세 API로 조회하므로 인덱스에 저장하지 않는다. */
export const isVisitSeoulId = (id: string) => /^VisitSeoul:[A-Za-z0-9]+$/.test(id);

// Every source ID is retained; unresolved fields cannot satisfy an explicit search filter.
// 수동 추가 장소(`manual:` 등 비짓서울 외 ID)는 인덱스가 유일한 출처이므로 주소·설명을 그대로 보존한다.
export const placeIndexSchema = z.object(placeSchema.shape).omit({ detailFailed: true }).extend({
  regionId: regionIdSchema.nullable().default(null), district: z.string().default(''), dong: z.string().default(''),
  category: categorySchema.nullable().default(null),
  lat: z.number().min(-90).max(90).nullable().default(null), lng: z.number().min(-180).max(180).nullable().default(null),
  sourceCategory: z.string().default(''),
  businessDaysText: z.string().default(''), closedDaysText: z.string().default(''),
  detailStatus: z.enum(['pending', 'ok', 'failed']).default('ok'),
}).refine(p => p.regionId === null || (p.lat !== null && p.lng !== null
  && locateRegion({ lat: p.lat, lng: p.lng })?.regionId === p.regionId
  && regions.some(r => r.id === p.regionId && r.district === p.district && r.dongs.includes(p.dong))),
  '장소의 좌표·행정동이 선택 지역에 속하지 않습니다')
  .transform(p => isVisitSeoulId(p.id) ? { ...p, address: '', description: '' } : p);
export type PlaceIndex = z.infer<typeof placeIndexSchema>;

export type Category = z.infer<typeof categorySchema>;
export type Mode = z.infer<typeof modeSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type CourseRequest = z.infer<typeof requestSchema>;
export type Constraints = z.infer<typeof constraintsSchema>;
export type Place = z.infer<typeof placeSchema>;
export type Weather = {
  status: 'applied' | 'unavailable'; reason: string | null; indoorPriority: boolean;
  temperature: number | null; precipitationProbability: number | null;
  forecastAt: string; issuedAt: string | null; fetchedAt: string;
};
export type Leg = {
  fromId: string; toId: string;
  status: 'ok' | 'no_route' | 'route_failed' | 'taxi_review';
  mode: Mode | 'transit' | null; distanceMeters: number | null; minutes: number | null;
  accuracy: 'estimated' | 'provider' | 'unknown';
  walkLimit: 'estimated_met' | 'estimated_exceeded' | 'not_applicable';
  accessWalkMeters: number | null; accessWalkMinutes: number | null;
  accessWalkAccuracy?: 'estimated' | 'provider' | 'unknown';
  routes: { mode: 'bus' | 'subway'; name: string; from: string; to: string;
    fromLocation?: {lat: number; lng: number}; toLocation?: {lat: number; lng: number} }[];
  transferWalkMeters?: number | null;
  transferWalkMinutes?: number | null;
  providerMinutes: number | null; timingNote: string | null;
  referenceAt: string; fetchedAt: string; reason: string | null;
};
export type RouteResolver = (from: Place, to: Place, at: string, constraints: Constraints) => Promise<Leg>;
export type Visit = {
  place: Place; arrivalAt: string | null;
  openingStatus: 'open' | 'closed' | 'hours_unknown' | 'arrival_unknown';
  outsidePreference: boolean; notIndoor: boolean;
};
export type Course = {
  visits: Visit[]; legs: Leg[]; weather: Weather; request: CourseRequest;
  knownTravelMinutes: number; totalTravelMinutes: number | null;
  travelLimit: 'met' | 'exceeded' | 'unknown'; includesEstimates: boolean;
  valid: boolean; violations: string[];
};
