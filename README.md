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
npm run test               # 백엔드 단위 테스트
npm run seed:sample        # 개발용 샘플 장소(성수·홍대)를 로컬 DB(data/places.sqlite)에 넣기
npm run gen:regions        # spec.md 부록 A → config/regions.json (147개 동네)
npm run validate:regions   # 동네·행정동 배정과 좌표 검증
npm run collect:regions    # 공식 행정동 경계를 받아 지역 중심 좌표·경계(config/region-boundaries.json) 갱신
```

공공 API 키는 `.env.example` 을 `.env.local` 로 복사해 채운다. 키가 없으면 날씨는 '미반영', 대중교통은 '경로 조회 실패'로 표시되고 도보 코스만 계산된다.

## 구조

| 경로 | 역할 |
| --- | --- |
| `app/page.tsx` | 홈 `/` — 랜딩(히어로·피처·지역·FAQ·프로모) + 코스 요청 폼 + 온보딩 모달 |
| `app/result/page.tsx` | 결과 `/result` — 지도·타임라인·요약 레일·장소 시트(교체 흐름)·단계별 로딩·오류 |
| `app/settings/page.tsx` | 설정 `/settings` — 취향 수정·초기화 |
| `app/globals.css` | `design/tokens.css`를 불러오고 화면 조립용 레이아웃만 추가 |
| `config/regions.json` | 25개 구 · 147개 동네 · 426개 행정동. `scripts/gen-regions.mjs`가 `spec.md` 부록 A에서 생성. 프론트(`data/regions.ts`)와 백엔드(`lib/contracts.ts`)가 같은 파일을 쓴다 |
| `config/region-boundaries.json` | 공식 행정동 경계. 장소의 동네 판정에 쓴다. 지금은 우선 검수 지역 5곳(성수·서촌·익선·홍대·연남)만 있고 `npm run collect:regions`로 전체를 받는다 |
| `lib/api.ts` | 프론트 화면 ↔ 백엔드 계약(`lib/client.ts`) 어댑터. 요청·응답 형태만 바꾸고 계산은 하지 않는다 |
| `lib/client.ts` · `lib/course.ts` | 브라우저에서 돌아가는 코스 계산. 장소·날씨·경로는 `app/api/*`를 호출한다 |
| `app/api/[...path]/route.ts` | 공공 API 호출과 장소 캐시 조회를 맡는 Route Handler. `regions`는 동네별 카테고리 후보 수를 함께 준다 |
| `lib/storage.ts` | 취향·마지막 입력값·제외 목록의 기기 저장(localStorage) |
| `components/Photo.tsx` · `public/images/` | 랜딩 사진 슬롯. 파일이 없으면 플레이스홀더로 폴백. 출처 규칙은 `public/images/README.md` |

동네 대표 좌표는 공식 경계로 계산한 5곳만 `centerSource: "official"` 이고, 나머지 142곳은 기상청 예보 격자를 고르기 위한 근사값(`approximate`)이다. `npm run collect:regions` 를 한 번 돌리면 전부 공식 값으로 바뀐다. 근사 좌표는 장소의 동네 판정에는 쓰지 않는다.

취향과 입력값은 브라우저에만 저장하며 서버로 보내지 않는다. 공공 API 호출은 `app/api/*` Route Handler에서만 수행한다(spec 6장). 장소 데이터가 없는 동네는 홈에서 회색으로 표시되고 선택할 수 없다.

## 사용 공공 API

날씨 API(기상청) / 서울시 교통수단 API / Visit Seoul API
