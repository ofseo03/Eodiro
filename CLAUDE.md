# CLAUDE.md

어디로(Eodiro): 서울 25개 구에서 날씨·이동시간에 맞춘 카페·식당·놀거리 코스를 추천하는 Next.js 웹 서비스.
개요와 명령어는 [`README.md`](README.md), 동작 기준은 [`spec.md`](spec.md), 화면 디자인은 [`DESIGN.md`](DESIGN.md)와 [`design/tokens.css`](design/tokens.css)를 따른다.

## 작업 방식

- 사용자에게는 한국어로 답한다.
- 클라우드 세션의 컨테이너는 임시라서 사라질 수 있다. 의미 있는 단계를 마칠 때마다 커밋하고 작업 브랜치에 푸시해, 다른 기기나 새 세션에서 이어갈 수 있게 한다.
- 커밋·푸시 전에 `npm run lint && npm run typecheck && npm run test`를 돌린다. 기존부터 실패하던 테스트가 있으면 그 사실을 알리고, 내 변경 때문에 새로 깨진 것이 없는지 확인한다.

## 지켜야 할 규칙

- 브라우저 코드는 공공 API(기상청·서울시·비짓서울·카카오 REST)를 직접 부르지 않고 `/api/*`만 호출한다. 실제 호출은 `app/api/[...path]/route.ts` → `lib/server/*`가 하고, 데이터 수집 스크립트는 `scripts/`에 둔다. REST 키는 서버 전용이며, 브라우저에 노출되는 키는 `KAKAO_JAVASCRIPT_KEY` 하나뿐이다.
- 취향·입력값은 브라우저(localStorage, `lib/storage.ts`)에만 저장한다. 서버로 보내거나 서버에 저장하지 않는다. 로그인 기능은 없다.
- `config/regions.json`은 손으로 고치지 않는다. `spec.md` 부록 A를 고친 뒤 `npm run gen:regions` → `npm run validate:regions`로 만든다.
- `lib/api.ts`는 화면 ↔ 백엔드 계약 어댑터다. 형태 변환만 하고 계산 로직은 `lib/client.ts`·`lib/course.ts`에 둔다.
- `data/places.sqlite`는 배포에 그대로 들어가고 런타임에는 읽기 전용이다. 장소 추가·수정은 `scripts/`의 명령(`add:places`, `import:places` 등)으로만 한다. 형식은 [`data/README.md`](data/README.md)를 본다.
- 스타일은 `design/tokens.css`의 토큰을 쓰고, 이미지는 `next/image`에 `sizes`를 명시한다. `DESIGN.md`를 고치면 `npx @google/design.md lint DESIGN.md`로 확인한다.
- `.env*` 파일은 커밋하지 않는다(`.env.example`만 예외). 키가 없으면 날씨는 '미반영', 대중교통은 '경로 조회 실패'로 표시되는 것이 정상 동작이다.

## 환경

- Node는 `package.json`의 `engines`에 따라 24.x를 쓴다(`node:sqlite` 사용). 클라우드 세션에서는 `.claude/hooks/session-start.sh`가 Node 24 설치와 `npm install`을 자동으로 한다.
- 배포는 Vercel이다. `vercel-build` 스크립트가 DB를 준비한 뒤 `next build`를 돌린다.
