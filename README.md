# 어디로 (Eodiro)

서울 전역의 동네(25개 자치구, 147개 동네)에서 날씨와 이동시간에 맞춘 카페·식당·놀거리 코스를 추천하는 웹 서비스.

- 서비스 스펙: [`spec.md`](spec.md)
- 디자인 시스템: [`DESIGN.md`](DESIGN.md) · CSS 토큰 [`design/tokens.css`](design/tokens.css) · 미리보기 [`design/preview.html`](design/preview.html)

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run lint && npm run typecheck
npm run validate:regions   # data/regions.ts 동네·행정동 배정 검증
```

## 구조

| 경로 | 역할 |
| --- | --- |
| `app/page.tsx` | 홈 `/` — 랜딩(히어로·피처·지역·FAQ·프로모) + 코스 요청 폼 + 온보딩 모달 |
| `app/result/page.tsx` | 결과 `/result` — 지도·타임라인·요약 레일·장소 시트(교체 흐름)·단계별 로딩·오류 |
| `app/settings/page.tsx` | 설정 `/settings` — 취향 수정·초기화 |
| `app/globals.css` | `design/tokens.css`를 불러오고 화면 조립용 레이아웃만 추가 |
| `data/regions.ts` | 부록 A 동네 데이터. `scripts/gen-regions.mjs`가 `spec.md`에서 생성 |
| `lib/api.ts` | 추천·교체·구간 재조회 API 자리. 백엔드 연결 전까지 예시 데이터 반환 |
| `lib/storage.ts` | 취향·마지막 입력값·제외 목록의 기기 저장(localStorage) |

취향과 입력값은 브라우저에만 저장하며 서버로 보내지 않는다. 공공 API 호출은 이후 `app/api/*` Route Handler에서만 수행한다(spec 6장).

## 사용 공공 API

날씨 API(기상청) / 서울시 교통수단 API / Visit Seoul API
