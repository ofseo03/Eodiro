import { z } from 'zod';
import regionData from '../config/regions.json';

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
    cafe: z.number().int().min(0).max(5).default(1),
    restaurant: z.number().int().min(0).max(5).default(1),
    activity: z.number().int().min(0).max(5).default(1),
  }).default({ cafe: 1, restaurant: 1, activity: 1 }).refine(
    c => Object.values(c).reduce((a, b) => a + b, 0) >= 2 && Object.values(c).reduce((a, b) => a + b, 0) <= 5,
    '장소 수는 2~5곳이어야 합니다',
  ),
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
  address: z.string().min(1), description: z.string().default(''),
  food: foodSchema.nullable().default(null), activity: activitySchema.nullable().default(null),
  environment: environmentSchema.default('unknown'),
  environmentSource: z.enum(['source', 'inferred', 'reviewed']).default('inferred'),
  atmospheres: z.array(atmosphereSchema).default([]),
  hours: hoursSchema.nullable().default(null), hoursText: z.string().default(''),
  sourceUrl: z.url().refine(u => ['https:', 'http:'].includes(new URL(u).protocol)),
  source: z.string().min(1), collectedAt: dateTimeSchema,
}).refine(p => regions.some(r => r.id === p.regionId && r.district === p.district && r.dongs.includes(p.dong)),
  '장소의 행정동이 선택 지역에 속하지 않습니다');

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
  routes: { mode: 'bus' | 'subway'; name: string; from: string; to: string }[];
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
