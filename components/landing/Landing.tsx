import Link from "next/link";
import { TOWN_COUNT } from "@/data/regions";
import { ChevronDownIcon, CloudIcon, LockIcon, BusIcon, TaxiIcon } from "@/components/Icons";
import { Photo } from "@/components/Photo";

/**
 * 랜딩 영역 — 홈 `/` 입력 폼 위에 놓인다(spec 5.8).
 * 순서: 히어로 → 3열 피처 카드 → 지역 쇼케이스 → 4열 안심 타일 → FAQ → 검정 프로모 스트립.
 * 마케팅 표면이므로 CTA는 검정 필(button-primary) + 아웃라인(button-secondary)만 쓴다. 코발트 금지.
 */
export function Landing() {
  return (
    <>
      <section className="container" style={{ paddingTop: "var(--space-xl)" }} aria-label="소개">
        <Photo slot="hero" className="hero" priority sizes="(max-width: 1279px) 100vw, 1216px">
          <div>
            <span className="badge badge-promo-yellow">서울 25개 구 · {TOWN_COUNT}개 동네</span>
            <h1 className="t-hero-display">오늘, 어디로 갈까요?</h1>
            <p>
              서울 어느 동네든 카페·식당·놀거리를 날씨와 이동시간에 맞춰 한 코스로 묶어 드려요. 로그인 없이 바로.
            </p>
            <div className="row">
              <Link className="btn btn-primary" href="#request">지금 시작하기</Link>
              <Link className="btn btn-secondary" href="#how">어떻게 추천하나요</Link>
            </div>
          </div>
        </Photo>
      </section>

      <section className="container section" id="how" aria-labelledby="how-title">
        <h2 className="t-display-lg section-opener" id="how-title">날씨까지 읽는 코스.<br />이동시간 안에서.</h2>
        <p className="t-subtitle-md muted section-lead">
          공공 데이터로 장소를 모으고, 기상청 예보와 대중교통 경로로 순서를 정합니다. 마음에 안 드는 장소 하나만 바꿀 수도 있어요.
        </p>
        <div className="grid-3">
          <article className="card-product-feature stack">
            <span className="badge badge-neutral" style={{ justifySelf: "start" }}>날씨 반영</span>
            <h3 className="t-heading-sm">덥거나 춥거나 비가 오면 실내로</h3>
            <p className="t-body-md charcoal">기온 30°C 이상·0°C 이하, 강수확률 60% 이상이면 실내 장소를 우선 골라요. 왜 그렇게 골랐는지도 보여 드립니다.</p>
          </article>
          <article className="card-product-feature stack">
            <span className="badge badge-neutral" style={{ justifySelf: "start" }}>이동시간 상한</span>
            <h3 className="t-heading-sm">총 60분 안에서 움직이는 코스</h3>
            <p className="t-body-md charcoal">버스·지하철·도보 중 허용한 수단으로만 경로를 잡고, 구간마다 거리와 시간을 표시해요. 택시 없는 코스가 먼저입니다.</p>
          </article>
          <article className="card-product-feature stack">
            <span className="badge badge-neutral" style={{ justifySelf: "start" }}>장소 교체</span>
            <h3 className="t-heading-sm">하나만 마음에 안 들면 그것만</h3>
            <p className="t-body-md charcoal">반경 100m 안 같은 카테고리 장소로 바꾸고 앞뒤 구간을 다시 계산합니다. 없으면 300m·500m로 넓혀요.</p>
          </article>
        </div>
      </section>

      <section className="container" id="regions" aria-labelledby="regions-title">
        <h2 className="t-heading-lg" id="regions-title">지원 지역</h2>
        <p className="t-heading-md muted section-sub">서울 전역 25개 구, {TOWN_COUNT}개 동네. 이 다섯 곳은 사람이 직접 검수했어요.</p>
        <div className="grid-3">
          <Photo slot="region-seongsu" className="card-feature-photo" sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 400px"><div><h3 className="t-heading-sm">성수 · 서울숲</h3><p className="t-body-sm">성수1가1동 · 성수1가2동 · 성수2가1동 · 성수2가3동</p></div></Photo>
          <Photo slot="region-seochon-ikseon" className="card-feature-photo" sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 400px"><div><h3 className="t-heading-sm">서촌 · 익선</h3><p className="t-body-sm">한옥 골목과 갤러리</p></div></Photo>
          <Photo slot="region-hongdae-yeonnam" className="card-feature-photo" sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 400px"><div><h3 className="t-heading-sm">홍대 · 연남</h3><p className="t-body-sm">공연과 경의선숲길</p></div></Photo>
        </div>
      </section>

      <section className="container section" aria-label="안심하고 쓰는 이유">
        <div className="grid-4">
          <div className="card-icon-feature"><LockIcon className="icon icon-tile-glyph" /><h4 className="t-subtitle-lg">로그인 없이</h4><p className="t-body-sm charcoal">계정을 만들지 않아요. 취향은 이 기기에만 저장됩니다.</p></div>
          <div className="card-icon-feature"><CloudIcon className="icon icon-tile-glyph" /><h4 className="t-subtitle-lg">기상청 단기예보</h4><p className="t-body-sm charcoal">방문 시각의 기온과 강수확률로 실내·실외를 정해요.</p></div>
          <div className="card-icon-feature"><BusIcon className="icon icon-tile-glyph" /><h4 className="t-subtitle-lg">공공 교통 데이터</h4><p className="t-body-sm charcoal">서울시 환승경로와 교통공사 최단경로로 구간을 계산해요.</p></div>
          <div className="card-icon-feature"><TaxiIcon className="icon icon-tile-glyph" /><h4 className="t-subtitle-lg">택시 없는 코스 우선</h4><p className="t-body-sm charcoal">택시는 다른 수단이 없는 구간에만 대안으로 표시해요.</p></div>
        </div>
      </section>

      <section className="container faq" id="faq" aria-labelledby="faq-title">
        <h2 className="t-heading-lg" id="faq-title">자주 묻는 질문</h2>
        <div className="faq-list">
          <details className="faq-accordion-item" open>
            <summary className="t-subtitle-lg">출발 위치를 입력해야 하나요? <ChevronDownIcon /></summary>
            <p className="t-body-md charcoal">아니요. 지역과 방문 날짜·시간만 고르면 됩니다. 코스는 지역 안에서만 구성돼요.</p>
          </details>
          <details className="faq-accordion-item">
            <summary className="t-subtitle-lg">택시는 언제 나오나요? <ChevronDownIcon /></summary>
            <p className="t-body-md charcoal">택시 옵션을 켠 경우, 다른 수단으로 경로가 없는 구간에만 &lsquo;택시 이용 검토&rsquo;로 표시됩니다. 호출 기능은 없어요.</p>
          </details>
          <details className="faq-accordion-item">
            <summary className="t-subtitle-lg">코스를 저장할 수 있나요? <ChevronDownIcon /></summary>
            <p className="t-body-md charcoal">이번 버전에는 저장·공유·기록 기능이 없습니다.</p>
          </details>
          <details className="faq-accordion-item">
            <summary className="t-subtitle-lg">우리 동네도 되나요? <ChevronDownIcon /></summary>
            <p className="t-body-md charcoal">서울의 모든 행정동이 {TOWN_COUNT}개 동네 중 하나에 속해요. 장소 데이터가 부족한 동네는 회색으로 표시되고 부족한 카테고리를 알려 드립니다.</p>
          </details>
        </div>
      </section>

      <section className="container section" aria-label="시작하기">
        <div className="card-promo-strip">
          <h2 className="t-display-lg">지금 우리 동네에서<br />시작해 보세요.</h2>
          <p className="t-subtitle-md">취향 네 가지만 고르면 끝. 건너뛰어도 코스는 받을 수 있어요.</p>
          <div className="row">
            <Link className="btn btn-primary" href="#request">지금 시작하기</Link>
            <Link className="btn btn-secondary" href="#how">어떻게 추천하나요</Link>
          </div>
        </div>
      </section>
    </>
  );
}
