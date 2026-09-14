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
npm run add:places -- 파일.json   # 기존 DB를 유지한 채 수동 검수 장소 추가(형식: data/manual-places.example.json)
npm run gen:missing        # 장소가 부족한 동네 목록(data/missing-places.md)과 채워 넣기 템플릿(data/manual-places.todo.json) 생성
npm run fill:missing -- --apply   # 카카오 로컬 API(KAKAO_REST_API_KEY)로 부족한 동네를 자동으로 채워 DB에 추가. --apply 없이면 JSON만 생성
npm run prune:kakao        # 카카오로 채운 장소 중 제외 규칙(키즈카페·만화카페·구내식당 등)에 걸리는 것을 DB에서 제거
npm run gen:regions        # spec.md 부록 A → config/regions.json (147개 동네)
npm run validate:regions   # 동네·행정동 배정과 좌표 검증
npm run collect:regions    # 공식 행정동 경계를 받아 지역 중심 좌표·경계(config/region-boundaries.json) 갱신
```

공공 API 키는 `.env.example` 을 `.env.local` 로 복사해 채운다. 키가 없으면 날씨는 '미반영', 대중교통은 '경로 조회 실패'로 표시되고 도보 코스만 계산된다.

## Vercel 배포

- 프레임워크 프리셋은 **Next.js** 여야 한다. `vercel.json`의 `"framework": "nextjs"` 가 이를 고정하므로 프로젝트 설정에서 Node.js/Other 로 잡혀 있어도 Next.js 빌더가 쓰인다.
- Node 버전은 `package.json`의 `engines.node = "24.x"` 로 고정한다(`node:sqlite` 사용).
- Vercel은 `vercel-build` 스크립트를 실행한다. 이 스크립트는 `data/places.sqlite` 가 없으면 샘플 장소(성수·홍대)로 만든 뒤 `next build` 를 돌리고, `next.config.ts` 의 `outputFileTracingIncludes` 가 그 파일을 `/api/*` 함수 번들에 넣는다. 서버리스 파일시스템은 읽기 전용이라 런타임에서는 DB를 읽기 전용으로만 연다.
- 실제 검수 장소를 배포하려면 빌드 전에 DB를 채우면 된다. 예: `vercel-build` 를 `npm run import:places -- data/places.json && npm run build` 처럼 바꾸고 검수 JSON 을 커밋한다.
- 장소가 부족한 동네를 채우려면 `npm run add:places -- 파일.json` 으로 로컬 `data/places.sqlite` 에 추가한 뒤 그 파일을 커밋한다. 이 DB 파일이 그대로 배포되므로 별도 빌드 설정은 필요 없다. 자세한 형식은 [`data/README.md`](data/README.md) 를 본다.
- 환경변수: `KAKAO_JAVASCRIPT_KEY`(지도), `KAKAO_REST_API_KEY`(주소 검색), `DATA_GO_KR_KEY`(날씨·대중교통). Kakao 개발자 콘솔의 플랫폼 도메인에 Vercel 도메인을 등록해야 지도가 뜬다.

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
