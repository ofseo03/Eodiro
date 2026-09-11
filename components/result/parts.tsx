"use client";

import { BusIcon, CafeIcon, FoodIcon, LocateIcon, PlayIcon, SubwayIcon, TaxiIcon, WalkIcon } from "@/components/Icons";
import type { Category, Leg, LegStatus, Place } from "@/lib/types";

export const CategoryIcon = ({ category }: { category: Category }) =>
  category === "카페" ? <CafeIcon /> : category === "식당" ? <FoodIcon /> : <PlayIcon />;

const ModeIcon = ({ mode }: { mode: Leg["mode"] }) =>
  mode === "도보" ? <WalkIcon /> : mode === "버스" ? <BusIcon /> : mode === "지하철" ? <SubwayIcon /> : <TaxiIcon />;

const LEG_BADGE: Record<LegStatus, string> = {
  "확정 충족": "badge-success",
  실측: "badge-success",
  추정: "badge-attention",
  "택시 이용 검토": "badge-attention",
  "경로 없음": "badge-critical",
  "경로 조회 실패": "badge-critical",
};

/** 지도 — 마커와 순서 번호만 둔다. 경로선은 그리지 않는다(spec 4장). 지도 제공자 연결 전 임시 격자. */
export function CourseMap({ places, activeIndex, onSelect }: { places: Place[]; activeIndex: number | null; onSelect: (i: number) => void }) {
  return (
    <div className="map" role="group" aria-label="코스 지도">
      {places.map((p, i) => (
        <button
          type="button"
          key={p.id}
          className={`marker${activeIndex === i ? " is-active" : ""}`}
          style={{ left: `${p.pin.x}%`, top: `${p.pin.y}%` }}
          aria-label={`${i + 1}. ${p.name}`}
          aria-pressed={activeIndex === i}
          onClick={() => onSelect(i)}
        >
          {i + 1}
        </button>
      ))}
      <span className="map-note">지도 제공자(스마트서울맵/카카오맵) 연결 전 임시 표시</span>
      <button type="button" className="btn-icon" aria-label="현재 위치"><LocateIcon /></button>
    </div>
  );
}

/** course-timeline — 장소 카드 → 이동 구간 행 → 장소 카드 (DESIGN.md · Signature Components). */
export function Timeline({
  places, legs, activeIndex, retrying, onSelect, onRetry,
}: {
  places: Place[]; legs: Leg[]; activeIndex: number | null; retrying: number | null;
  onSelect: (i: number) => void; onRetry: (i: number) => void;
}) {
  return (
    <ol className="timeline" aria-label="코스 타임라인">
      {places.map((p, i) => (
        <li key={p.id} style={{ display: "contents" }}>
          <button type="button" className={`place-card${activeIndex === i ? " is-active" : ""}`} onClick={() => onSelect(i)} aria-expanded={activeIndex === i}>
            <div className="product-thumbnail"><CategoryIcon category={p.category} /></div>
            <div>
              <div className="title">
                <span className="order">{i + 1}</span>
                <b className="t-subtitle-lg">{p.name}</b>
                <span className="t-caption-bold muted">{p.arriveAt} 도착</span>
              </div>
              <div className="badges">
                <span className={`badge badge-neutral${p.category === "놀거리" ? " badge-purple" : ""}`}>{p.subcategory ? `${p.category} · ${p.subcategory}` : p.category}</span>
                <span className="badge badge-neutral">{p.indoor}</span>
                {p.open === true && <span className="badge badge-success">영업 중</span>}
                {p.open === false && <span className="badge badge-critical">영업 종료</span>}
                {p.open === null && p.arriveAt === "미정" && <span className="badge badge-attention">도착 미정</span>}
                {p.flags.map((f) => <span className="badge badge-attention" key={f}>{f}</span>)}
                {p.moods.slice(0, 1).map((m) => <span className="badge badge-neutral" key={m}>{m}</span>)}
              </div>
            </div>
          </button>
          {i < legs.length && (
            <div className={`leg${retrying === i ? " is-loading" : ""}`} aria-label={`구간 ${i + 1}`}>
              <ModeIcon mode={legs[i].mode} />
              <span>
                {retrying === i ? "경로를 다시 조회하는 중…" : legs[i].summary}
                {legs[i].accessWalkMeters ? ` · 접근 도보 ${legs[i].accessWalkMeters}m` : ""}
              </span>
              {retrying !== i && (
                <div className="leg-actions" style={{ marginLeft: "auto" }}>
                  <span className={`badge ${LEG_BADGE[legs[i].status]}`}>{legs[i].status}</span>
                  {legs[i].status === "경로 조회 실패" && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRetry(i)}>재시도</button>
                  )}
                </div>
              )}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

/** 단계별 로딩 — badge-neutral 3단계 스텝 + 스켈레톤 (spec 5.8). */
export function LoadingState({ stages, current }: { stages: string[]; current: string | null }) {
  const idx = current ? stages.indexOf(current) : -1;
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="steps">
        {stages.map((s, i) => (
          <span key={s} className={`badge ${i < idx ? "badge-success" : i === idx ? "badge-attention" : "badge-neutral"}`}>
            {i < idx ? "✓ " : ""}{s}{i === idx ? "…" : ""}
          </span>
        ))}
      </div>
      <div className="result-grid">
        <div className="stack" style={{ gap: "var(--space-xl)" }}>
          <div className="skeleton skeleton-map" />
          <div className="stack" style={{ gap: "var(--space-md)" }}>
            <div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" />
          </div>
        </div>
        <div className="rail"><div className="skeleton skeleton-rail" /></div>
      </div>
    </div>
  );
}
