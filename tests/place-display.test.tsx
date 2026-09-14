import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Timeline } from '../components/result/parts';
import { PlaceSheet } from '../components/result/PlaceSheet';
import type { Course, Place } from '../lib/types';

const place: Place = {
  id: 'test', name: '테스트 카페', category: '카페', indoor: '미확인', moods: [],
  address: '', hours: null, description: '', arriveAt: '미정', open: null,
  flags: ['취향 외', '운영시간 미확인', '분위기 미확인', '실외 포함', '상세 조회 실패'],
  lat: 37.54, lng: 127.05, pin: { x: 50, y: 50 },
};
const noop = () => {};
const timeline = (p: Place) => renderToStaticMarkup(<Timeline places={[p]} legs={[]} activeIndex={null} retrying={null} onSelect={noop} onRetry={noop} />);
const sheet = (p: Place) => renderToStaticMarkup(<PlaceSheet course={{} as Course} place={p} index={0} replacing={false} onClose={noop} onReplace={noop} />);

test('place cards and details omit failed and empty metadata while retaining known information', () => {
  for (const render of [timeline, sheet]) {
    const empty = render(place);
    assert(empty.includes(place.name));
    for (const warning of [...place.flags, '미확인', '설명이 없어요', '불러오지 못했어요']) assert(!empty.includes(warning));
    const known = render({ ...place, indoor: '실내', moods: ['조용함'], open: true,
      address: '서울 성동구 테스트로 1', description: '직접 볶은 커피', hours: '10:00–20:00' });
    assert(known.includes('실내'));
    assert(known.includes('조용함'));
  }
  const emptySheet = sheet({ ...place, address: ' ', description: ' ', hours: ' ' });
  for (const label of ['주소', '운영시간', '실내·실외', '분위기']) assert(!emptySheet.includes(label));
  const knownSheet = sheet({ ...place, address: '서울 성동구 테스트로 1', description: '직접 볶은 커피', hours: '10:00–20:00' });
  for (const info of ['서울 성동구 테스트로 1', '직접 볶은 커피', '10:00–20:00']) assert(knownSheet.includes(info));
  assert(timeline({ ...place, open: true }).includes('영업 중'));
});

test('route failures and their retry action remain visible', () => {
  const html = renderToStaticMarkup(<Timeline places={[place, { ...place, id: 'second' }]}
    legs={[{ mode: '미확인', summary: '경로 조회 실패', minutes: null, status: '경로 조회 실패' }]}
    activeIndex={null} retrying={null} onSelect={noop} onRetry={noop} />);
  assert(html.includes('경로 조회 실패'));
  assert(html.includes('재시도'));
});
