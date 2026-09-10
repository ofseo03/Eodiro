---
name: Eodiro Design System
description: 서울 코스 추천 서비스 '어디로'의 랜딩페이지·MVP(홈/결과/설정) 공통 디자인 시스템. Meta 커머스 표면의 시각 언어(사진 우선, 흰 캔버스, 필 버튼, 이중 CTA)를 기준으로 삼는다.
version: 1.0.0

colors:
  # Brand & Accent
  primary: "#0064E0"          # Cobalt Primary — 커머스(요청·결과 흐름) CTA 전용
  primary-deep: "#0143B5"     # Deep Cobalt — pressed, 활성 링크, 선택된 radio-option 테두리
  primary-soft: "rgba(0, 100, 224, 0.15)"  # Soft Cobalt — 정보성 콜아웃 배경
  on-primary: "#FFFFFF"
  fb-blue: "#0866FF"          # 폼 컨트롤 활성(포커스·체크) 색
  meta-link: "#1877F2"        # 푸터·레거시 링크
  oculus-purple: "#5B3FD5"    # 카테고리 강조 보조 액센트(놀거리 등)
  # Surface
  canvas: "#FFFFFF"
  surface-soft: "#F1F4F7"
  hairline: "#C9CFD6"
  hairline-soft: "#E4E6EB"
  # Text
  ink-deep: "#0A1317"
  ink: "#1C2B33"
  charcoal: "#344854"
  slate: "#465A69"
  steel: "#586C7A"
  stone: "#8A9BA8"
  disabled-text: "#A9B7C2"
  # Buttons
  ink-button: "#0A1317"       # 마케팅(랜딩) 표면 기본 CTA
  on-ink-button: "#FFFFFF"
  button-secondary: "#0A1317" # 고스트 버튼 테두리·텍스트
  # Semantic
  success: "#26843C"
  attention: "#F7B928"
  warning: "#FFD400"
  critical: "#E41E3F"
  critical-strong: "#C8102E"

typography:
  hero-display:  { fontFamily: "Optimistic VF, Pretendard Variable, Montserrat, Helvetica, Arial, Noto Sans KR, sans-serif", fontSize: 64px, fontWeight: 500, lineHeight: 1.16, letterSpacing: 0px, fontFeature: "'ss01', 'ss02'" }
  display-lg:    { fontFamily: "Optimistic VF, Pretendard Variable, Montserrat, Helvetica, Arial, Noto Sans KR, sans-serif", fontSize: 48px, fontWeight: 500, lineHeight: 1.17, letterSpacing: 0px, fontFeature: "'ss01', 'ss02'" }
  heading-lg:    { fontFamily: "Optimistic VF, Pretendard Variable, Montserrat, Helvetica, Arial, Noto Sans KR, sans-serif", fontSize: 36px, fontWeight: 500, lineHeight: 1.28, letterSpacing: 0px, fontFeature: "'ss01', 'ss02'" }
  heading-md:    { fontFamily: "Optimistic VF, Pretendard Variable, Montserrat, Helvetica, Arial, Noto Sans KR, sans-serif", fontSize: 28px, fontWeight: 300, lineHeight: 1.21, letterSpacing: 0px, fontFeature: "'ss01', 'ss02'" }
  heading-sm:    { fontFamily: "Optimistic VF, Pretendard Variable, Montserrat, Helvetica, Arial, Noto Sans KR, sans-serif", fontSize: 24px, fontWeight: 500, lineHeight: 1.25, letterSpacing: 0px, fontFeature: "'ss01', 'ss02'" }
  subtitle-lg:   { fontFamily: "Optimistic VF, Pretendard Variable, Montserrat, Helvetica, Arial, Noto Sans KR, sans-serif", fontSize: 18px, fontWeight: 700, lineHeight: 1.44, letterSpacing: 0px }
  subtitle-md:   { fontFamily: "Optimistic VF, Pretendard Variable, Montserrat, Helvetica, Arial, Noto Sans KR, sans-serif", fontSize: 18px, fontWeight: 400, lineHeight: 1.44, letterSpacing: 0px }
  body-md:       { fontFamily: "Optimistic VF, Pretendard Variable, Montserrat, Helvetica, Arial, Noto Sans KR, sans-serif", fontSize: 16px, fontWeight: 400, lineHeight: 1.50, letterSpacing: -0.16px }
  body-md-bold:  { fontFamily: "Optimistic VF, Pretendard Variable, Montserrat, Helvetica, Arial, Noto Sans KR, sans-serif", fontSize: 16px, fontWeight: 700, lineHeight: 1.50, letterSpacing: -0.16px }
  body-sm:       { fontFamily: "Optimistic VF, Pretendard Variable, Montserrat, Helvetica, Arial, Noto Sans KR, sans-serif", fontSize: 14px, fontWeight: 400, lineHeight: 1.43, letterSpacing: -0.14px }
  body-sm-bold:  { fontFamily: "Optimistic VF, Pretendard Variable, Montserrat, Helvetica, Arial, Noto Sans KR, sans-serif", fontSize: 14px, fontWeight: 700, lineHeight: 1.43, letterSpacing: -0.14px }
  caption-bold:  { fontFamily: "Optimistic VF, Pretendard Variable, Montserrat, Helvetica, Arial, Noto Sans KR, sans-serif", fontSize: 12px, fontWeight: 700, lineHeight: 1.33, letterSpacing: 0px }
  caption:       { fontFamily: "Helvetica, Arial, Pretendard Variable, Noto Sans KR, sans-serif", fontSize: 12px, fontWeight: 400, lineHeight: 1.33, letterSpacing: 0px }
  button-md:     { fontFamily: "Optimistic VF, Pretendard Variable, Montserrat, Helvetica, Arial, Noto Sans KR, sans-serif", fontSize: 14px, fontWeight: 700, lineHeight: 1.43, letterSpacing: -0.14px }
  link-md:       { fontFamily: "Optimistic VF, Pretendard Variable, Montserrat, Helvetica, Arial, Noto Sans KR, sans-serif", fontSize: 16px, fontWeight: 700, lineHeight: 1.50, letterSpacing: -0.16px }

rounded:
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 16px
  xxl: 24px
  xxxl: 32px
  feature: 40px
  full: 100px
  circle: 999px   # CSS 구현은 border-radius: 50%. 린트 규칙상 px로 기록한다.

spacing:
  xxs: 4px
  xs: 8px
  sm: 10px
  md: 12px
  base: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px
  section-sm: 48px
  section: 64px
  section-lg: 80px
  hero: 120px

components:
  button-primary:            { backgroundColor: "{colors.ink-button}", textColor: "{colors.on-ink-button}", typography: "{typography.button-md}", padding: "14px 30px", rounded: "{rounded.full}" }
  button-primary-pressed:    { backgroundColor: "{colors.charcoal}", textColor: "{colors.on-ink-button}", typography: "{typography.button-md}", padding: "14px 30px", rounded: "{rounded.full}" }
  button-primary-disabled:   { backgroundColor: "{colors.disabled-text}", textColor: "{colors.on-ink-button}", typography: "{typography.button-md}", padding: "14px 30px", rounded: "{rounded.full}" }
  button-buy-cta:            { backgroundColor: "{colors.primary}", textColor: "{colors.on-primary}", typography: "{typography.button-md}", padding: "14px 30px", rounded: "{rounded.full}" }
  button-buy-cta-pressed:    { backgroundColor: "{colors.primary-deep}", textColor: "{colors.on-primary}", typography: "{typography.button-md}", padding: "14px 30px", rounded: "{rounded.full}" }
  button-buy-cta-disabled:   { backgroundColor: "{colors.disabled-text}", textColor: "{colors.on-primary}", typography: "{typography.button-md}", padding: "14px 30px", rounded: "{rounded.full}" }
  button-secondary:          { backgroundColor: "transparent", textColor: "{colors.ink-deep}", typography: "{typography.button-md}", padding: "12px 28px", rounded: "{rounded.full}" }
  button-ghost:              { backgroundColor: "transparent", textColor: "{colors.ink-deep}", typography: "{typography.button-md}", padding: "10px 22px", rounded: "{rounded.full}" }
  button-pill-tab:           { backgroundColor: "{colors.canvas}", textColor: "{colors.ink}", typography: "{typography.body-sm-bold}", padding: "8px 16px", rounded: "{rounded.full}" }
  button-pill-tab-active:    { backgroundColor: "{colors.ink-deep}", textColor: "{colors.canvas}", typography: "{typography.body-sm-bold}", padding: "8px 16px", rounded: "{rounded.full}" }
  button-icon-circular:      { backgroundColor: "{colors.canvas}", textColor: "{colors.ink}", rounded: "{rounded.circle}", width: 40px, height: 40px }
  card-product-feature:      { backgroundColor: "{colors.canvas}", rounded: "{rounded.xxxl}", padding: "{spacing.xxl}" }
  card-feature-photo:        { backgroundColor: "{colors.canvas}", rounded: "{rounded.xxxl}", padding: "0" }
  card-promo-strip:          { backgroundColor: "{colors.ink-deep}", textColor: "{colors.canvas}", rounded: "{rounded.xxxl}", padding: "{spacing.section}" }
  card-icon-feature:         { backgroundColor: "{colors.canvas}", rounded: "{rounded.xl}", padding: "{spacing.xl}" }
  card-checkout-summary:     { backgroundColor: "{colors.canvas}", rounded: "{rounded.xl}", padding: "{spacing.xl}" }
  product-thumbnail:         { backgroundColor: "{colors.surface-soft}", rounded: "{rounded.xl}", padding: "{spacing.base}" }
  warranty-card:             { backgroundColor: "{colors.surface-soft}", rounded: "{rounded.xxl}", padding: "{spacing.xxl}" }
  why-buy-tile:              { backgroundColor: "{colors.canvas}", rounded: "{rounded.xl}", padding: "{spacing.xxl} {spacing.xl}" }
  text-input:                { backgroundColor: "{colors.canvas}", textColor: "{colors.ink}", rounded: "{rounded.lg}", padding: "{spacing.md}", height: 44px }
  text-input-focused:        { backgroundColor: "{colors.canvas}", textColor: "{colors.ink}", rounded: "{rounded.lg}", padding: "{spacing.md}", height: 44px }
  text-input-error:          { backgroundColor: "{colors.canvas}", textColor: "{colors.ink}", rounded: "{rounded.lg}", padding: "{spacing.md}", height: 44px }
  search-pill:               { backgroundColor: "{colors.surface-soft}", textColor: "{colors.steel}", typography: "{typography.body-sm}", rounded: "{rounded.full}", height: 40px }
  radio-option:              { backgroundColor: "{colors.canvas}", rounded: "{rounded.lg}", padding: "{spacing.lg}" }
  radio-option-selected:     { backgroundColor: "{colors.canvas}", rounded: "{rounded.lg}", padding: "{spacing.lg}" }
  color-swatch-circle:       { rounded: "{rounded.circle}", width: 32px, height: 32px }
  badge-promo-yellow:        { backgroundColor: "{colors.warning}", textColor: "{colors.ink-deep}", typography: "{typography.caption-bold}", rounded: "{rounded.full}", padding: "4px 10px" }
  badge-attention:           { backgroundColor: "{colors.attention}", textColor: "{colors.ink-deep}", typography: "{typography.caption-bold}", rounded: "{rounded.full}", padding: "4px 10px" }
  badge-success:             { backgroundColor: "{colors.success}", textColor: "{colors.canvas}", typography: "{typography.caption-bold}", rounded: "{rounded.full}", padding: "4px 10px" }
  badge-critical:            { backgroundColor: "{colors.critical}", textColor: "{colors.canvas}", typography: "{typography.caption-bold}", rounded: "{rounded.full}", padding: "4px 10px" }
  badge-neutral:             { backgroundColor: "{colors.surface-soft}", textColor: "{colors.slate}", typography: "{typography.caption-bold}", rounded: "{rounded.full}", padding: "4px 10px" }
  promo-banner:              { backgroundColor: "{colors.ink-deep}", textColor: "{colors.canvas}", typography: "{typography.body-sm-bold}", padding: "{spacing.md} {spacing.xl}" }
  promo-banner-yellow:       { backgroundColor: "{colors.warning}", textColor: "{colors.ink-deep}", typography: "{typography.body-sm-bold}", padding: "{spacing.md} {spacing.xl}" }
  faq-accordion-item:        { backgroundColor: "{colors.canvas}", rounded: "{rounded.xl}", padding: "{spacing.lg} {spacing.xl}" }
  testimonial-customer-card: { backgroundColor: "{colors.canvas}", rounded: "{rounded.xl}", padding: "{spacing.xxl}" }
  footer-region:             { backgroundColor: "{colors.canvas}", padding: "{spacing.section} {spacing.xxl}" }
---

# Eodiro Design System

## Overview

'어디로'의 랜딩페이지와 MVP(홈 `/`, 결과 `/result`, 설정 `/settings`)는 Meta 커머스 표면의 시각 언어를 기준으로 한다. 사진 우선(photography-first)의 흰 캔버스, 32px 라운드의 쇼케이스 카드, 필(pill) 버튼, 그리고 **표면에 따라 갈리는 이중 CTA 체계**가 핵심이다.

- **마케팅 표면(랜딩)**: 검정 필 `button-primary` + 아웃라인 `button-secondary`.
- **커머스 표면(코스 요청·결과·교체 흐름)**: 코발트 필 `button-buy-cta`. 이 파랑은 여기서만 쓴다.

Optimistic VF는 Meta 전용 서체라 배포할 수 없으므로 **Pretendard Variable을 1차 대체 서체**로 쓰고, 그 뒤에 Montserrat → Helvetica → Arial → Noto Sans KR 순으로 폴백한다. 한국어 본문 비중이 크므로 실제 렌더링은 대부분 Pretendard가 담당한다. 모든 heading 역할에는 `ss01, ss02`를 함께 켠다(Pretendard의 alternates에도 그대로 적용된다).

768px 아래에서는 히어로가 세로로 쌓이고, 필 탭 내비는 햄버거 드로어로, 3열 카드 그리드는 1열로, 결과 페이지의 우측 요약 레일은 하단 고정 바로 바뀐다.

**Key Characteristics:**
- 흰 캔버스({colors.canvas}) 위 풀블리드 사진, 쇼케이스 타일은 {rounded.xxxl}(32px) 라운드
- 이중 CTA: 마케팅은 {colors.ink-button} 필, 커머스 흐름은 {colors.primary} 코발트 필
- Optimistic VF(→ Pretendard Variable) 단일 서체 체계, heading에 `ss01, ss02`
- 모든 버튼·칩·배지는 {rounded.full}, 카드는 {rounded.xxxl}/{rounded.feature}
- 시간 한정 안내(날씨 경보, 신규 지역 오픈)는 {colors.warning} 노랑 또는 {colors.ink-deep} 검정 배너를 내비 위에 드물게 사용
- 사진 카드에는 테두리·그림자 없음. 사진 자체가 표면 처리다.

## Colors

### Brand & Accent
- **Cobalt Primary** ({colors.primary}): '추천받기', '이 장소 교체', '다시 추천', '300m로 넓히기' 등 코스 요청·결과·교체 흐름의 모든 주 CTA.
- **Deep Cobalt** ({colors.primary-deep}): pressed 상태, 활성 링크, 선택된 `radio-option`의 2px 테두리.
- **Soft Cobalt** ({colors.primary-soft}): 정보성 콜아웃 배경(예: "날씨 때문에 실내 위주로 구성했어요").
- **Facebook Blue** ({colors.fb-blue}): 체크박스·라디오·입력 포커스 링.
- **Meta Link Blue** ({colors.meta-link}): 푸터·레거시 링크.
- **Oculus Purple** ({colors.oculus-purple}): '놀거리' 카테고리 강조 등 보조 액센트. 이 외의 액센트는 추가하지 않는다.

### Surface
- **Canvas White** ({colors.canvas}): 페이지 배경, 기본 카드 표면.
- **Soft Cloud** ({colors.surface-soft}): 장소 썸네일 배경, 지역 타일 배경, 검색 필 기본 상태.
- **Hairline Gray** ({colors.hairline}): 1px 입력 테두리.
- **Hairline Soft** ({colors.hairline-soft}): 카드·푸터·섹션 구분선.

### Text
- 테두리·그림자는 컴포넌트 표(components) 대신 아래 Components 절의 설명으로 정의한다. 카드 테두리 `1px solid {colors.hairline-soft}`, 입력 테두리 `1px solid {colors.hairline}`, 요약 레일·바텀시트 그림자 `rgba(20, 22, 26, 0.3) 0px 1px 4px 0px`.
- **Deep Ink** ({colors.ink-deep}) 헤드라인 · **Ink** ({colors.ink}) 본문 · **Charcoal** ({colors.charcoal}) 3차 본문 · **Slate** ({colors.slate}) 섹션 헤더 보조 문구 · **Steel** ({colors.steel}) 캡션·푸터 링크 · **Stone** ({colors.stone}) 비활성 라벨.

### Semantic
- **Success** ({colors.success}): '확정 충족', '영업 중', '실측'.
- **Attention** ({colors.attention}): '추정', '운영시간 미확인', '취향 외', '택시 이용 검토'.
- **Warning** ({colors.warning}): 날씨 경보 배너, 시간 한정 안내 배지.
- **Critical** ({colors.critical}): '경로 없음', '경로 조회 실패' 배지.
- **Critical Strong** ({colors.critical-strong}): 입력 오류 테두리와 인라인 오류 라벨.

## Typography

### Font Family
1차 서체는 **Optimistic VF**(사용 가능한 경우)이며, 저장소에는 포함하지 않는다. 실제 배포 서체는 **Pretendard Variable**(가변, 100–900)이다. 폴백: Montserrat → Helvetica → Arial → Noto Sans KR → sans-serif.
- 가변 축은 300(편집형 서브헤드 `heading-md`) → 500(display·hero·heading-sm) → 700(subtitle·강조·버튼)을 쓴다.
- 모든 heading 역할에는 `font-feature-settings: "ss01", "ss02"`를 함께 켠다. 하나만 켜지 않는다.
- 12px `caption`(법적 문구, 출처 표시, 스펙 미세 문구)만 Helvetica 체인을 우선한다.
- 한국어 조판: 본문 `word-break: keep-all`, `overflow-wrap: anywhere`.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | OpenType | 어디로에서의 용도 |
|---|---|---|---|---|---|---|
| `{typography.hero-display}` | 64px | 500 | 1.16 | 0 | ss01, ss02 | 랜딩 히어로 ("오늘, 어디로 갈까요?") |
| `{typography.display-lg}` | 48px | 500 | 1.17 | 0 | ss01, ss02 | 랜딩 섹션 오프너 ("날씨까지 읽는 코스.") |
| `{typography.heading-lg}` | 36px | 500 | 1.28 | 0 | ss01, ss02 | "왜 어디로인가요", "지원 지역" 서브섹션 |
| `{typography.heading-md}` | 28px | 300 | 1.21 | 0 | ss01, ss02 | 편집형 서브헤드, 결과 페이지 코스 제목 |
| `{typography.heading-sm}` | 24px | 500 | 1.25 | 0 | ss01, ss02 | 카드 제목, 지역 타일 이름, 바텀시트 장소명 |
| `{typography.subtitle-lg}` | 18px | 700 | 1.44 | 0 | — | 홈 폼 섹션 제목, FAQ 질문, 타임라인 장소명 |
| `{typography.subtitle-md}` | 18px | 400 | 1.44 | 0 | — | 히어로 부제, 리드 문단 |
| `{typography.body-md}` | 16px | 400 | 1.50 | -0.16px | — | 본문, 바텀시트 설명 |
| `{typography.body-md-bold}` | 16px | 700 | 1.50 | -0.16px | — | 본문 강조, 인라인 링크 |
| `{typography.body-sm}` | 14px | 400 | 1.43 | -0.14px | — | 이동 구간 정보, 헬퍼 텍스트 |
| `{typography.body-sm-bold}` | 14px | 700 | 1.43 | -0.14px | — | 필 탭, 스펙 라벨, 푸터 제목 |
| `{typography.caption-bold}` | 12px | 700 | 1.33 | 0 | — | 배지 라벨, 예상 도착 시각 |
| `{typography.caption}` | 12px | 400 | 1.33 | 0 | — | 출처 표시, 법적 문구 |
| `{typography.button-md}` | 14px | 700 | 1.43 | -0.14px | — | 필 버튼 라벨 |
| `{typography.link-md}` | 16px | 700 | 1.50 | -0.16px | — | 내비 링크 |

### Principles
- 본문 역할의 음수 자간(-0.14 ~ -0.16px)은 유지하되 줄높이는 1.50 아래로 내리지 않는다.
- 300 weight의 `heading-md`는 500 display와 400 body 사이의 시각적 휴지를 만든다. 결과 페이지 코스 제목에 쓴다.
- 버튼·필 탭·푸터 제목은 모두 `body-sm-bold` 계열(14px/700/-0.14px)로 묶는다.

## Layout

### Spacing System
- 4px 기본 단위, 8px이 주요 스텝. 토큰: {spacing.xxs} 4 · {spacing.xs} 8 · {spacing.sm} 10 · {spacing.md} 12 · {spacing.base} 16 · {spacing.lg} 20 · {spacing.xl} 24 · {spacing.xxl} 32 · {spacing.xxxl} 40 · {spacing.section-sm} 48 · {spacing.section} 64 · {spacing.section-lg} 80 · {spacing.hero} 120.
- 랜딩 섹션 간격 {spacing.section-lg}(80px), 결과 페이지 섹션 {spacing.section}(64px), FAQ 스택 {spacing.xxl}(32px).
- 카드 내부 패딩 기본 {spacing.xxl}(32px), 아이콘 피처 타일 {spacing.xl}(24px), 프로모 스트립 {spacing.section}(64px).
- 홈 입력 폼(커머스 밀도)은 옵션 그룹 사이 {spacing.base}~{spacing.lg}.

### Grid & Container
- 랜딩 최대 폭 1280px, 거터 32–48px.
- 결과 페이지(데스크톱)는 지도 ~58% + 우측 고정 요약 레일 ~42%(`max-width: 380px`)의 2열 분할. PDP의 갤러리/구매 레일 구조를 그대로 가져온다.
- 3열 피처 그리드 열 간격 24px, 지역 선택 타일(5–6열) 간격 12px.

### Whitespace Philosophy
히어로는 사진에 뷰포트 높이의 50–70%를 준다. 카피 위아래에는 {spacing.xxl}~{spacing.xxxl}의 여백을 둔다. 홈 폼과 결과 레일 안에서는 여백이 조밀해진다.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 (flat) | 그림자 없음, {rounded.xxxl} + {colors.hairline-soft} 1px 테두리 | 기본 카드, 지역 타일, 피처 타일 |
| 1 (subtle) | `rgba(0, 0, 0, 0.2) 1px 1px 0px 0px` | 필 탭 활성 표시 |
| 2 (sticky panel) | `rgba(20, 22, 26, 0.3) 0px 1px 4px 0px` | 결과 요약 레일, 모바일 하단 고정 바, 바텀시트 |

- 사진이 깊이를 만든다. 어두운 히어로 사진 위에는 `rgba(10, 19, 23, 0.12)` 오버레이로 흰 텍스트 가독성을 확보한다.
- 지역 타일 뒤의 파스텔 틴트(연핑크·아이스블루·민트)는 사진 콘텐츠로 취급하고 토큰화하지 않는다.

## Shapes

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 2px | 체크마크, 미세 UI |
| `{rounded.sm}` | 4px | 태그, 마이크로 컨트롤 |
| `{rounded.md}` | 6px | 정사각 썸네일 |
| `{rounded.lg}` | 8px | 입력 필드, `radio-option`, 지역 선택 타일 |
| `{rounded.xl}` | 16px | 표준 피처 카드, FAQ 아이템, 타임라인 카드 |
| `{rounded.xxl}` | 24px | 안내 카드(취향 저장 안내 등), 고스트 액션 카드 |
| `{rounded.xxxl}` | 32px | 사진 피처 카드, 프로모 스트립, 지도 컨테이너 |
| `{rounded.feature}` | 40px | 지역 히어로 패널 |
| `{rounded.full}` | 100px | 필 버튼, 탭 칩, 배지 |
| `{rounded.circle}` | 50% | 순서 번호 마커, 원형 아이콘 버튼 |

- 히어로·지역 사진은 {rounded.xxxl} 프레임, 지역 선택 그리드의 1:1 타일은 {rounded.lg}로 쇼케이스와 선택 그리드를 구분한다.
- 지도 마커의 순서 번호는 32px {rounded.circle}, 선택 시 2px {colors.canvas} 링.

## Components

> hover 상태는 문서화하지 않는다. 기본·pressed·disabled만 정의한다.

### Buttons
- **`button-primary`** — 랜딩 검정 필 CTA ("지금 시작하기"). {colors.ink-button} / {colors.on-ink-button}, `14px 30px`, {rounded.full}. pressed는 {colors.charcoal}, disabled는 {colors.disabled-text}.
- **`button-buy-cta`** — 코발트 필 CTA ("추천받기", "다시 추천", "이 장소 교체", "300m로 넓히기"). {colors.primary} / {colors.on-primary}, pressed는 {colors.primary-deep}. **홈 폼·결과 페이지·바텀시트 안에서만** 쓴다.
- **`button-secondary`** — 2px {colors.ink-deep} 아웃라인 필 ("어떻게 추천하나요"). 히어로 이중 CTA의 두 번째 버튼.
- **`button-ghost`** — `2px solid rgba(10,19,23,0.12)` 아웃라인. 3차 액션 ("건너뛰기", "홈으로", "재시도").
- **`button-pill-tab` / `-active`** — 자치구 필 탭 (종로구 / 중구 / … 25개, 가로 스크롤), 취향 다중 선택 칩(음식 종류·놀거리 유형·분위기). 활성 시 {colors.ink-deep} 채움.
- **`button-icon-circular`** — 40×40 원형 (헤더 설정 아이콘, 바텀시트 닫기, 지도 현재 위치).

### Cards & Containers
- **`card-product-feature`** — 흰 피처 카드(랜딩 "날씨를 읽는 코스", "이동시간 안에서").
- **`card-feature-photo`** — 크롬 없는 풀블리드 사진 타일(랜딩 지역 쇼케이스, 카피는 좌하단 흰색).
- **`card-promo-strip`** — 검정 와이드 스트립(랜딩 하단 "지금 성수에서 시작해 보세요" + 이중 CTA).
- **`card-icon-feature`** — 3~4열 아이콘 피처 타일(랜딩 "로그인 없이", "날씨 반영", "대중교통 경로", "장소 교체").
- **`card-checkout-summary`** — 결과 페이지 우측 고정 요약(총 이동시간, 조건 충족 여부, '다시 추천'). 모바일에서는 하단 고정 바.
- **`product-thumbnail`** — 1:1 장소 썸네일({colors.surface-soft}, {rounded.xl}). 교체 후보 목록·타임라인 카드에 사용.
- **`warranty-card`** — {colors.surface-soft} 안내 카드("취향은 이 기기에만 저장됩니다").
- **`why-buy-tile`** — 4열 안심 타일(랜딩 하단).

### Inputs & Forms
- **`text-input` / `-focused` / `-error`** — 44px 높이, {rounded.lg}. 날짜·시간, 총 이동시간, 최대 도보 거리 입력. 포커스 2px {colors.fb-blue}, 오류 1px {colors.critical-strong} + 아래 {typography.body-sm} 오류 라벨.
- **`radio-option` / `-selected`** — 옵션 카드(실내·실외 선호, 교체 후보, 반경 확대). 선택 시 `2px solid {colors.primary-deep}`.
- **`search-pill`** — 40px {colors.surface-soft} 필(지역 검색, 향후 확장용).
- **`color-swatch-circle`** — 32px 원형. 어디로에서는 지도 순서 마커와 카테고리 도트(카페·식당·놀거리)에 사용.
- 체크박스(허용 교통수단: 버스·지하철·도보·택시)는 {rounded.sm}, 체크 시 {colors.fb-blue} 채움. `radio-option-selected`와 같은 코발트-온-화이트 규칙을 따른다.

### Badges & Status
- **`badge-success`** "확정 충족" · "실측" · "영업 중"
- **`badge-attention`** "추정" · "운영시간 미확인" · "취향 외" · "택시 이용 검토" · "분위기 미확인"
- **`badge-critical`** "경로 없음" · "경로 조회 실패"
- **`badge-promo-yellow`** "새 지역" · "오늘 비 예보"
- **`badge-neutral`** 카테고리(카페·식당·놀거리), 실내·실외 구분. {colors.surface-soft} 위 {colors.slate}.
- **`promo-banner` / `-yellow`** — 내비 위 전폭 스트립. 날씨 실내 우선 모드 안내("오늘은 실내 위주로 추천해요")에 노랑 변형 사용.

### Navigation
- **Top Navigation (Desktop)** — 흰 고정 바 64px, 하단 1px {colors.hairline-soft}. 좌: 어디로 워드마크(높이 14px). 중앙: 지역 필 탭(랜딩·홈만). 우: `button-icon-circular` 설정 아이콘. 하단 내비는 두지 않는다(spec 5.2).
- **Top Navigation (Mobile)** — 워드마크 + 설정 아이콘. 지역 필 탭은 폼 안으로 내려간다.
- **Breadcrumb (결과)** — "홈 › 성수 › 오늘 14:00" {typography.body-sm}, 구분 점 {colors.stone}.

### Signature Components (어디로 매핑)
- **`hero-band-marketing`** — 랜딩 히어로. 풀블리드 서울 골목 사진 + 흰 {typography.hero-display} "오늘, 어디로 갈까요?" + {typography.subtitle-md} 부제 + `button-primary`("지금 시작하기") · `button-secondary`("어떻게 추천하나요").
- **`region-picker-row`** (= `color-sku-picker-row`) — 5~6열 1:1 동네 타일({colors.surface-soft}, {rounded.lg}). 선택한 자치구의 동네만 표시하며, 위에 `text-input` 검색(동네명·행정동명 부분 일치)을 둔다. 선택 시 `2px solid {colors.ink-deep}`. 타일 아래 동네명 {typography.body-sm-bold}, 행정동 수 {typography.body-sm}. 장소 데이터 부족 동네는 `-disabled` 톤 + `badge-attention`.
- **`course-request-panel`** (= `card-checkout-summary` 밀도) — 홈 입력 폼. 섹션 제목 {typography.subtitle-lg}, 그룹 간격 {spacing.lg}, 맨 아래 전폭 `button-buy-cta` "추천받기".
- **`result-gallery`** (= `product-gallery-pdp`) — 결과 페이지. 좌: {rounded.xxxl} 지도(마커 + 순서 번호), 우: 고정 `card-checkout-summary`. 아래: 타임라인.
- **`course-timeline`** — 장소 카드({rounded.xl}, `product-thumbnail` + 장소명 {typography.subtitle-lg} + 배지 행) → 이동 구간 행({typography.body-sm}: 수단 아이콘 · 거리 · 시간 · 상태 배지) → 장소 카드 순 세로 배치. 구간 실패 시 `badge-critical` + `button-ghost` "재시도".
- **`place-bottom-sheet`** — 모바일 바텀시트 / 데스크톱 사이드 패널. 상단 손잡이, 장소명 {typography.heading-sm}, 주소·운영시간 `tech-specs-table` 형식, 맨 아래 `button-buy-cta` "이 장소 교체". 그림자 Level 2, 상단 {rounded.xxl}.
- **`feature-icon-row`** — 랜딩 4열 안심 타일: 로그인 없이 · 날씨 반영 · 대중교통 경로 · 장소 교체.
- **`faq-accordion`** — 랜딩 FAQ. 질문 {typography.subtitle-lg}, 답 {typography.body-md}.
- **`tech-specs-table`** — 바텀시트의 주소·운영시간·실내외·분위기 키/값 표. 결과 페이지의 날씨 판단 근거(기준 시각·기온·강수확률) 표.
- **`footer-region`** — 데이터 출처(서울 열린데이터광장, 기상청, 서울교통공사) 표기와 법적 문구. {typography.caption} {colors.stone}.

## Do's and Don'ts

### Do
- {colors.primary} 코발트는 홈 폼·결과·바텀시트의 CTA에만 쓴다. 랜딩에 나오면 안 된다.
- 랜딩 주 CTA는 {colors.ink-button} 검정 필, 보조는 `button-secondary` 아웃라인.
- 모든 버튼·칩·배지에 {rounded.full}. 사진 카드에는 {rounded.xxxl}, 아이콘 타일에는 {rounded.xl}.
- heading에는 `ss01, ss02`를 항상 함께 켠다.
- 결과 페이지 코스 제목에 300 weight `heading-md`를 써서 리듬을 만든다.
- 상태 문구는 배지로 통일한다. 텍스트 색만 바꿔 상태를 표현하지 않는다.

### Don't
- 랜딩 버튼에 코발트를 쓰지 않는다.
- 코발트·오큘러스 퍼플 외의 액센트를 추가하지 않는다.
- 필 버튼 라운드를 {rounded.full} 아래로 줄이지 않는다.
- 사진 카드를 각지게 두지 않는다. {rounded.xxxl}이 최소다.
- {typography.body-md} 줄높이를 1.50 아래로 내리지 않는다.
- 랜딩 카드에 무거운 그림자를 주지 않는다. 그림자는 커머스 흐름(요약 레일·바텀시트)의 신호다.
- 지도에 경로선을 그리지 않는다(spec 4장). 마커와 번호만 둔다.

## Responsive Behavior

| Name | Width | Key Changes |
|---|---|---|
| Mobile (small) | < 480px | 1열. 히어로 {typography.heading-sm}. 결과: 지도 → 타임라인 세로 스택, 요약 레일은 하단 고정 바. 지역 타일 3열. |
| Mobile (large) | 480 – 767px | 피처 타일 2열, 지역 타일 3열. |
| Tablet | 768 – 1023px | 2열 피처 그리드, 필 탭 복귀. 결과는 여전히 세로 스택(레일은 하단 바). |
| Desktop | 1024 – 1359px | 3~4열 피처 그리드. 결과 58/42 분할, 요약 레일 sticky. 바텀시트 → 사이드 패널. |
| Wide Desktop | ≥ 1360px | 더 넓은 히어로 거터, 더 큰 사진. |

- **Touch targets**: 필 버튼 44px, 원형 아이콘 버튼 40px(모바일 44px), 지도 마커 32px + 12px 클리어 존, 입력 44px. spec 8장의 360px 무가로스크롤 기준을 만족해야 한다.
- **히어로 타이포**: 64px → 36px(<768) → 24px(<480).
- **푸터**: 6열 → 태블릿 2열 → 모바일 아코디언.

## Image Behavior

- 히어로: 풀블리드, {rounded.xxxl}, 16:9 이상, 사진 위 `rgba(10,19,23,0.12)` 오버레이. 서울 골목·카페·공원 사진(이미지 소스는 저작권 확인 후 `public/images/`에 둔다). 랜딩 이외에는 지연 로딩.
- 지역 쇼케이스 카드: 4:3, {rounded.xxxl}, 크롬 없음.
- 지역 선택 타일·장소 썸네일: 1:1, {rounded.lg}/{rounded.xl}. 모바일에서도 전폭으로 늘리지 않는다.
- 장소 사진이 없는 경우 {colors.surface-soft} 배경 + 카테고리 라인 아이콘으로 대체한다. 파스텔 틴트 배경은 지역 타일에만 허용한다.
- 모든 이미지는 `next/image`로 제공하고 `sizes`를 명시한다.

## Iteration Guide

1. 한 번에 컴포넌트 하나씩 다듬는다.
2. 토큰과 컴포넌트 이름을 그대로 참조한다(`{colors.primary}`, `button-buy-cta-pressed`).
3. 수정 후 `npx @google/design.md lint DESIGN.md`로 참조 오류·대비·고아 토큰을 확인한다.
4. 새 변형은 `components:`에 `-pressed`, `-disabled`, `-focused` 항목으로 추가한다.
5. 본문 기본 `{typography.body-md}`, 강조 `{typography.subtitle-lg}`.
6. 코발트가 랜딩 뷰포트에 보이면 그 표면이 정말 체크아웃 패널이어야 하는지 되묻는다.
7. 각진 버튼은 "서드파티 위젯"처럼 보인다. 걸러낸다.

## Known Gaps

- Optimistic VF 라이선스가 없으므로 Pretendard Variable로 대체한다. Pretendard의 `ss01`·`ss02`는 Optimistic의 alternates와 다르지만 헤딩 규칙은 유지한다.
- 토큰의 실제 HEX 값은 meta.com 캡처 기준의 근사값이다. 대비 검사는 `design/tokens.css` 기준으로 통과 여부를 확인한다.
- 토글·다중 선택 체크 상태는 `radio-option-selected`의 코발트-온-화이트 규칙을 따라 구현한다.
- 애니메이션: 주요 표면 전환 150–250ms ease-out, 아코디언·바텀시트 300ms ease-in-out.
- 다크 모드 토큰은 정의하지 않는다. MVP는 라이트 전용이다.
- 지도 제공자(스마트서울맵/카카오맵)에 따라 마커 스타일 커스터마이즈 범위가 달라진다. 순서 번호 원형 마커가 불가능하면 기본 마커 + 번호 라벨로 대체한다.
