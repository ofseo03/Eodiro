import { z } from 'zod';
import type { Weather } from '../contracts';
import { forecastGrid } from '../geo';
import { fetchJson } from './http';

export function forecastIssue(now: Date) {
  // Use an issue only after its 10-minute publication delay; all calendar operations are KST.
  const available = new Date(now.getTime() + 9 * 3600000 - 10 * 60000);
  const hour = available.getUTCHours();
  const issueHour = [23, 20, 17, 14, 11, 8, 5, 2].find(h => h <= hour);
  if (issueHour === undefined) available.setUTCDate(available.getUTCDate() - 1);
  available.setUTCHours(issueHour ?? 23, 0, 0, 0);
  return { baseDate: available.toISOString().slice(0, 10).replaceAll('-', ''),
    baseTime: String(issueHour ?? 23).padStart(2, '0') + '00',
    issuedAt: new Date(available.getTime() - 9 * 3600000).toISOString() };
}

const forecastSchema = z.object({ response: z.object({
  header: z.object({ resultCode: z.string() }),
  body: z.object({ items: z.object({ item: z.array(z.object({
    category: z.string(), fcstDate: z.string(), fcstTime: z.string(), fcstValue: z.union([z.string(), z.number()]),
  })) }) }).optional(),
}) });

export function parseWeather(raw: unknown, startAt: string, issuedAt: string, now = new Date()): Weather {
  const data = forecastSchema.parse(raw).response;
  if (data.header.resultCode !== '00' || !data.body) throw new Error('예보 조회 실패');
  const local = new Date(Date.parse(startAt) + 9 * 3600000).toISOString();
  const date = local.slice(0, 10).replaceAll('-', ''), time = local.slice(11, 13) + '00';
  const rows = data.body.items.item.filter(i => i.fcstDate === date && i.fcstTime === time);
  const value = (key: string) => {
    const found = rows.find(i => i.category === key)?.fcstValue;
    return found === undefined || found === '' ? NaN : Number(found);
  };
  const temperature = value('TMP'), precipitationProbability = value('POP');
  if (!Number.isFinite(temperature) || temperature < -60 || temperature > 60 || !Number.isFinite(precipitationProbability)
    || precipitationProbability < 0 || precipitationProbability > 100) throw new Error('방문 시각 예보 없음');
  const reasons = [temperature >= 30 ? '고온' : null, temperature <= 0 ? '저온' : null, precipitationProbability >= 60 ? '비 예보' : null].filter(Boolean);
  return { status: 'applied', reason: reasons.length ? `${reasons.join('·')}로 실내 우선` : null, indoorPriority: reasons.length > 0,
    temperature, precipitationProbability, forecastAt: local.slice(0, 13) + ':00:00+09:00',
    issuedAt, fetchedAt: now.toISOString() };
}

export async function getWeather(region: {lat: number; lng: number}, startAt: string, now = new Date()): Promise<Weather> {
  const issue = forecastIssue(now);
  const fallback = (reason: string): Weather => ({ status: 'unavailable', reason, indoorPriority: false,
    temperature: null, precipitationProbability: null, forecastAt: startAt, issuedAt: issue.issuedAt, fetchedAt: now.toISOString() });
  // The product contract deliberately limits weather to 72 hours after publication.
  if (Date.parse(startAt) - Date.parse(issue.issuedAt) > 72 * 3600000) return fallback('예보 범위 밖 · 날씨 미반영');
  if (!process.env.DATA_GO_KR_KEY) return fallback('기상청 API 미설정 · 날씨 미반영');
  const url = new URL('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst');
  const { nx, ny } = forecastGrid(region.lat, region.lng);
  url.search = new URLSearchParams({ serviceKey: process.env.DATA_GO_KR_KEY, dataType: 'JSON', numOfRows: '2000', pageNo: '1',
    base_date: issue.baseDate, base_time: issue.baseTime, nx: String(nx), ny: String(ny) }).toString();
  try { return parseWeather(await fetchJson(url), startAt, issue.issuedAt, now); }
  catch { return fallback('날씨 조회 실패 또는 해당 시간 예보 없음 · 날씨 미반영'); }
}
