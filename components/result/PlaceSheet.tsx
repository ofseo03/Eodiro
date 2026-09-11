"use client";

import { useState } from "react";
import { CloseIcon } from "@/components/Icons";
import { fetchReplacements, type Candidate } from "@/lib/api";
import type { Place } from "@/lib/types";

type Radius = 100 | 300 | 500;
const NEXT_RADIUS: Record<Radius, Radius | null> = { 100: 300, 300: 500, 500: null };

/**
 * place-bottom-sheet — 모바일 바텀시트 / 데스크톱 사이드 패널 (spec 5.4-5 · 5.5).
 * 상세 → '이 장소 교체' → 교체 후보 목록(radio-option) → 반경 확대(300m·500m) → 교체 후보 없음.
 */
export function PlaceSheet({
  place, index, excludeIds, replacing, onClose, onReplace,
}: {
  place: Place; index: number; excludeIds: string[]; replacing: boolean;
  onClose: () => void; onReplace: (index: number, candidate: Candidate) => void;
}) {
  // 부모가 key={place.id} 로 마운트하므로 장소가 바뀌면 상태가 초기화된다.
  const [mode, setMode] = useState<"detail" | "replace">("detail");
  const [radius, setRadius] = useState<Radius>(100);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null); // null = 조회 중
  const [picked, setPicked] = useState<string | null>(null);

  function loadCandidates(r: Radius) {
    setMode("replace");
    setRadius(r);
    setCandidates(null);
    setPicked(null);
    void fetchReplacements(place, r, excludeIds).then(setCandidates);
  }

  const next = NEXT_RADIUS[radius];

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="handle" />
        <div className="sheet-head">
          <div>
            <span className="t-caption-bold muted">{index + 1}번째 · {place.arriveAt} 도착</span>
            <h3 className="t-heading-sm" id="sheet-title">{mode === "detail" ? place.name : `${place.name} 교체`}</h3>
          </div>
          <button type="button" className="btn-icon" aria-label="닫기" onClick={onClose}><CloseIcon /></button>
        </div>

        {mode === "detail" ? (
          <>
            <p className="t-body-md charcoal desc">{place.description}</p>
            <div className="specs">
              <div><b>주소</b><span>{place.address}</span></div>
              <div><b>운영시간</b><span>{place.hours ?? "운영시간 미확인"}</span></div>
              <div><b>실내·실외</b><span>{place.indoor}</span></div>
              <div><b>분위기</b><span>{place.moods.length ? place.moods.join(" · ") : "분위기 미확인"}</span></div>
              <div><b>예상 도착</b><span>{place.arriveAt}</span></div>
            </div>
            <button type="button" className="btn btn-buy-cta btn-full" onClick={() => loadCandidates(100)} disabled={replacing}>이 장소 교체</button>
          </>
        ) : (
          <>
            <p className="t-body-sm muted desc">반경 {radius}m 안 같은 카테고리({place.category}) 장소예요. 고르면 앞뒤 구간을 다시 계산해요.</p>
            {candidates === null ? (
              <div className="stack" style={{ gap: "var(--space-xs)" }} aria-busy="true"><div className="skeleton" style={{ height: 64 }} /><div className="skeleton" style={{ height: 64 }} /></div>
            ) : candidates.length === 0 ? (
              <div className="stack" style={{ gap: "var(--space-md)" }}>
                {next ? (
                  <>
                    <span className="badge badge-attention" style={{ justifySelf: "start" }}>반경 {radius}m 내 교체 후보 없음</span>
                    <button type="button" className="btn btn-buy-cta btn-full" style={{ marginTop: 0 }} onClick={() => loadCandidates(next)}>{next}m로 넓히기</button>
                  </>
                ) : (
                  <span className="badge badge-critical" style={{ justifySelf: "start" }}>교체 후보 없음</span>
                )}
                <button type="button" className="btn btn-ghost btn-full" onClick={() => setMode("detail")}>돌아가기</button>
              </div>
            ) : (
              <>
                <div className="candidates" role="radiogroup" aria-label="교체 후보">
                  {candidates.map((c) => {
                    const checked = picked === c.id;
                    return (
                      <button type="button" key={c.id} className="radio-option" role="radio" aria-checked={checked} onClick={() => setPicked(c.id)} style={{ flexDirection: "column", alignItems: "stretch", gap: "var(--space-xxs)" }}>
                        <span style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-xs)" }}>
                          <span>{c.name}</span>
                          <span className="t-body-sm muted" style={{ fontWeight: 400 }}>{c.distanceM}m</span>
                        </span>
                        <span className="candidate-meta">
                          <span className="badge badge-neutral">{c.indoor}</span>
                          {c.open === true ? <span className="badge badge-success">영업 중</span> : <span className="badge badge-attention">운영시간 미확인</span>}
                          {c.moods.length ? c.moods.join(" · ") : <span className="badge badge-attention">분위기 미확인</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="btn btn-buy-cta btn-full"
                  disabled={!picked || replacing}
                  onClick={() => { const c = candidates.find((x) => x.id === picked); if (c) onReplace(index, c); }}
                >
                  {replacing ? "구간을 다시 계산하는 중…" : "이 장소로 교체"}
                </button>
                <button type="button" className="btn btn-ghost btn-full" style={{ marginTop: "var(--space-xs)" }} onClick={() => setMode("detail")}>돌아가기</button>
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}
