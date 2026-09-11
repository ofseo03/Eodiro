"use client";

import { useState } from "react";
import { CloseIcon } from "@/components/Icons";
import { fetchReplacements } from "@/lib/api";
import type { Course, Place, Replacements } from "@/lib/types";

type Radius = 100 | 300 | 500;

/**
 * place-bottom-sheet — 모바일 바텀시트 / 데스크톱 사이드 패널 (spec 5.4-5 · 5.5).
 * 상세 → '이 장소 교체' → 교체 후보 목록(radio-option) → 반경 확대(300m·500m) → 교체 후보 없음.
 */
export function PlaceSheet({
  course, place, index, replacing, onClose, onReplace,
}: {
  course: Course; place: Place; index: number; replacing: boolean;
  onClose: () => void; onReplace: (index: number, candidateId: string, radius: Radius) => void;
}) {
  // 부모가 key={place.id} 로 마운트하므로 장소가 바뀌면 상태가 초기화된다.
  const [mode, setMode] = useState<"detail" | "replace">("detail");
  const [radius, setRadius] = useState<Radius>(100);
  const [result, setResult] = useState<Replacements | null>(null); // null = 조회 중
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  function loadCandidates(r: Radius) {
    setMode("replace");
    setRadius(r);
    setResult(null);
    setError(null);
    setPicked(null);
    fetchReplacements(course, index, r).then(setResult, (e: Error) => setError(e.message));
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="handle" />
        <div className="sheet-head">
          <div>
            <span className="t-caption-bold muted">{index + 1}번째</span>
            <h3 className="t-heading-sm" id="sheet-title">{mode === "detail" ? place.name : `${place.name} 교체`}</h3>
          </div>
          <button type="button" className="btn-icon" aria-label="닫기" onClick={onClose}><CloseIcon /></button>
        </div>

        {mode === "detail" ? (
          <>
            <p className="t-body-md charcoal desc">{place.description || "설명이 없어요."}</p>
            <div className="specs">
              <div><b>주소</b><span>{place.address}</span></div>
              <div><b>운영시간</b><span>{place.hours ?? "운영시간 미확인"}</span></div>
              <div><b>실내·실외</b><span>{place.indoor}</span></div>
              <div><b>분위기</b><span>{place.moods.length ? place.moods.join(" · ") : "분위기 미확인"}</span></div>
            </div>
            <button type="button" className="btn btn-buy-cta btn-full" onClick={() => loadCandidates(100)} disabled={replacing}>이 장소 교체</button>
          </>
        ) : (
          <>
            <p className="t-body-sm muted desc">반경 {radius}m 안 같은 카테고리({place.category}) 장소예요. 고르면 앞뒤 구간을 다시 계산해요.</p>
            {error ? (
              <div className="stack" style={{ gap: "var(--space-md)" }}>
                <span className="badge badge-critical" style={{ justifySelf: "start" }}>조회 실패</span>
                <p className="t-body-sm charcoal">{error}</p>
                <button type="button" className="btn btn-ghost btn-full" onClick={() => loadCandidates(radius)}>재시도</button>
                <button type="button" className="btn btn-ghost btn-full" onClick={() => setMode("detail")}>돌아가기</button>
              </div>
            ) : result === null ? (
              <div className="stack" style={{ gap: "var(--space-xs)" }} aria-busy="true"><div className="skeleton" style={{ height: 64 }} /><div className="skeleton" style={{ height: 64 }} /></div>
            ) : result.candidates.length === 0 ? (
              <div className="stack" style={{ gap: "var(--space-md)" }}>
                {result.nextRadius ? (
                  <>
                    <span className="badge badge-attention" style={{ justifySelf: "start" }}>{result.message ?? `반경 ${radius}m 내 교체 후보 없음`}</span>
                    <button type="button" className="btn btn-buy-cta btn-full" style={{ marginTop: 0 }} onClick={() => loadCandidates(result.nextRadius!)}>{result.nextRadius}m로 넓히기</button>
                  </>
                ) : (
                  <span className="badge badge-critical" style={{ justifySelf: "start" }}>{result.message ?? "교체 후보 없음"}</span>
                )}
                <button type="button" className="btn btn-ghost btn-full" onClick={() => setMode("detail")}>돌아가기</button>
              </div>
            ) : (
              <>
                <div className="candidates" role="radiogroup" aria-label="교체 후보">
                  {result.candidates.map((c) => {
                    const checked = picked === c.id;
                    return (
                      <button type="button" key={c.id} className="radio-option" role="radio" aria-checked={checked} onClick={() => setPicked(c.id)} style={{ flexDirection: "column", alignItems: "stretch", gap: "var(--space-xxs)" }}>
                        <span style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-xs)" }}>
                          <span>{c.name}</span>
                          <span className="t-body-sm muted" style={{ fontWeight: 400 }}>{c.distanceM}m</span>
                        </span>
                        <span className="candidate-meta">
                          {c.subcategory && <span className="badge badge-neutral">{c.subcategory}</span>}
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
                  onClick={() => { if (picked) onReplace(index, picked, radius); }}
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
