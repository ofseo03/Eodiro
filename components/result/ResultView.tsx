"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CourseMap, LoadingState, Timeline } from "./parts";
import { PlaceSheet } from "./PlaceSheet";
import { NoMorePlacesError, STAGES, recommendCourse, recomputeLegsAround, retryLeg, type Candidate, type Stage } from "@/lib/api";
import { formatVisitAt } from "@/lib/format";
import { clearSeenPlaces, loadLastRequest, loadSeenPlaces, saveSeenPlaces } from "@/lib/storage";
import type { Course, CourseRequest, Place } from "@/lib/types";

type State =
  | { kind: "idle" }
  | { kind: "no-request" }
  | { kind: "loading"; stage: Stage | null }
  | { kind: "error"; message: string; exhausted?: boolean }
  | { kind: "ready"; course: Course };

/**
 * 결과 페이지 `/result` (spec 5.4 · 5.5 · 5.6).
 * 상단 지도 + 하단 타임라인, 우측 sticky 요약 레일(<1024px 하단 고정 바), 장소 상세 시트.
 */
export function ResultView() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [active, setActive] = useState<number | null>(null);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [replacing, setReplacing] = useState(false);
  const reqRef = useRef<CourseRequest | null>(null);

  const run = useCallback(async (exclude: string[]) => {
    const req = reqRef.current;
    if (!req) return;
    setActive(null);
    setState({ kind: "loading", stage: null });
    try {
      const course = await recommendCourse(req, { exclude, onStage: (stage) => setState({ kind: "loading", stage }) });
      saveSeenPlaces([...exclude, ...course.places.map((p) => p.id)]);
      setState({ kind: "ready", course });
    } catch (err) {
      if (err instanceof NoMorePlacesError) setState({ kind: "error", message: "더 이상 새로운 장소가 없습니다", exhausted: true });
      else setState({ kind: "error", message: err instanceof Error ? err.message : "장소를 불러오지 못했어요." });
    }
  }, []);

  useEffect(() => {
    const req = loadLastRequest();
    if (!req || !req.townId) { setState({ kind: "no-request" }); return; }
    reqRef.current = req;
    void run([]);
  }, [run]);

  async function onRetry(i: number) {
    if (state.kind !== "ready") return;
    setRetrying(i);
    const leg = await retryLeg(state.course.legs[i]);
    setState((s) => (s.kind === "ready" ? { kind: "ready", course: recount({ ...s.course, legs: s.course.legs.map((l, k) => (k === i ? leg : l)) }) } : s));
    setRetrying(null);
  }

  async function onReplace(index: number, c: Candidate) {
    if (state.kind !== "ready") return;
    setReplacing(true);
    const old = state.course.places[index];
    const replaced: Place = {
      ...old, id: c.id, name: c.name, address: c.address, hours: c.hours, description: c.description, moods: c.moods,
      indoor: c.indoor, subcategory: c.subcategory ?? old.subcategory, open: c.open,
      flags: [...(c.open === null ? ["운영시간 미확인" as const] : []), ...(c.moods.length ? [] : ["분위기 미확인" as const])],
    };
    const legs = await recomputeLegsAround(state.course, index);
    setState((s) => s.kind === "ready"
      ? { kind: "ready", course: recount({ ...s.course, legs, places: s.course.places.map((p, k) => (k === index ? replaced : p)) }) }
      : s);
    saveSeenPlaces([...loadSeenPlaces(), c.id]);
    setReplacing(false);
    setActive(null);
  }

  if (state.kind === "idle") return <div className="container section-compact"><LoadingState stages={STAGES} current={null} /></div>;

  if (state.kind === "no-request") {
    return (
      <div className="container section-compact">
        <div className="card-product-feature state-card">
          <h1 className="t-heading-md">아직 조건이 없어요</h1>
          <p className="t-body-md charcoal">홈에서 동네와 방문 시각을 고르고 &lsquo;추천받기&rsquo;를 눌러 주세요.</p>
          <Link className="btn btn-buy-cta" href="/#request">조건 입력하러 가기</Link>
        </div>
      </div>
    );
  }

  const req = reqRef.current!;

  if (state.kind === "loading") {
    return (
      <div className="container section-compact">
        <nav className="breadcrumb" style={{ marginBottom: "var(--space-base)" }} aria-label="경로">
          <Link href="/">홈</Link><span className="sep">·</span><span className="current">{formatVisitAt(req.visitAt)}</span>
        </nav>
        <LoadingState stages={STAGES} current={state.stage} />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="container section-compact">
        <div className="card-product-feature state-card">
          <span className="badge badge-critical">{state.exhausted ? "후보 소진" : "오류"}</span>
          <h1 className="t-heading-md" style={{ marginTop: "var(--space-base)" }}>{state.message}</h1>
          {state.exhausted ? (
            <>
              <p className="t-body-md charcoal">이번 세션에서 이미 보여 드린 장소를 빼면 남은 후보가 없어요. 제외 목록을 초기화하고 다시 받을까요?</p>
              <div className="row" style={{ justifyContent: "center" }}>
                <button type="button" className="btn btn-buy-cta" onClick={() => { clearSeenPlaces(); void run([]); }}>제외 목록 초기화 후 다시 추천</button>
                <Link className="btn btn-ghost" href="/#request">조건 바꾸기</Link>
              </div>
            </>
          ) : (
            <>
              <p className="t-body-md charcoal">조건에 맞는 코스를 찾지 못했어요. 이렇게 바꿔 보세요.</p>
              <ul>
                <li>구간별 최대 도보 거리를 늘리기</li>
                <li>총 이동시간 상한을 늘리기</li>
                <li>허용 교통수단 추가하기</li>
              </ul>
              <div className="row" style={{ justifyContent: "center" }}>
                <button type="button" className="btn btn-buy-cta" onClick={() => void run(loadSeenPlaces())}>다시 시도</button>
                <Link className="btn btn-ghost" href="/">홈으로</Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const { course } = state;
  const w = course.weather;
  const activePlace = active !== null ? course.places[active] : null;

  return (
    <>
      {w.indoorPriority && (
        <div className="promo-banner promo-banner-yellow" role="status">
          오늘 {w.baseTime} {course.townName.split("·")[0]} 강수확률 {w.rainPct}% · 실내 위주로 추천해요
        </div>
      )}
      <div className="container section-compact">
        <nav className="breadcrumb" style={{ marginBottom: "var(--space-base)" }} aria-label="경로">
          <Link href="/">홈</Link><span className="sep">·</span>{course.townName}<span className="sep">·</span><span className="current">{formatVisitAt(course.visitAt)}</span>
        </nav>
        <div className="result-head">
          <h1 className="t-heading-md">{course.title}</h1>
          <div className="row" style={{ gap: "var(--space-xs)" }}>
            {course.allConditionsMet ? <span className="badge badge-success">조건 충족</span> : <span className="badge badge-attention">일부 구간 미확인</span>}
            {w.indoorPriority && <span className="badge badge-attention">실내 우선</span>}
            {!w.reflected && <span className="badge badge-neutral">날씨 미반영</span>}
          </div>
        </div>

        <div className="result-grid">
          <div className="stack" style={{ gap: "var(--space-xl)" }}>
            <CourseMap places={course.places} activeIndex={active} onSelect={setActive} />
            <Timeline places={course.places} legs={course.legs} activeIndex={active} retrying={retrying} onSelect={setActive} onRetry={onRetry} />
          </div>

          <aside className="rail stack">
            <div className="card-checkout-summary stack">
              <h2 className="t-heading-sm">코스 요약</h2>
              <dl className="kv">
                <dt>총 예상 이동시간</dt><dd>{course.totalMinutes}분 <span className="muted">/ 상한 {course.maxTravelMinutes}분</span></dd>
                <dt>확인된 구간</dt><dd>{course.confirmedLegs} / {course.legs.length}</dd>
                <dt>도보 조건</dt><dd>{course.walkCondition}</dd>
                <dt>날씨 판단</dt>
                <dd>{w.reflected ? `${w.baseTime} · ${w.tempC}°C · 강수 ${w.rainPct}%` : "날씨 미반영"}</dd>
              </dl>
              {w.overrideReason && <div className="callout">{w.overrideReason}</div>}
              <button type="button" className="btn btn-buy-cta btn-full" onClick={() => void run(loadSeenPlaces())}>다시 추천</button>
              <Link className="btn btn-ghost btn-full" href="/#request">조건 바꾸기</Link>
            </div>

            {activePlace && (
              <PlaceSheet
                place={activePlace}
                index={active!}
                excludeIds={course.places.map((p) => p.id)}
                replacing={replacing}
                onClose={() => setActive(null)}
                onReplace={onReplace}
              />
            )}
          </aside>
        </div>
      </div>

      <div className="bottom-bar" aria-label="코스 요약">
        <div>
          <div className="t-body-sm-bold">총 {course.totalMinutes}분 <span className="muted" style={{ fontWeight: 400 }}>/ {course.maxTravelMinutes}분</span></div>
          <div className="t-caption muted">확인된 구간 {course.confirmedLegs}/{course.legs.length}{w.indoorPriority ? " · 실내 우선" : ""}</div>
        </div>
        <button type="button" className="btn btn-buy-cta" onClick={() => void run(loadSeenPlaces())}>다시 추천</button>
      </div>
    </>
  );
}

/** 구간이 바뀐 뒤 요약 수치를 다시 계산한다. */
function recount(c: Course): Course {
  const confirmed = c.legs.filter((l) => l.status === "실측" || l.status === "확정 충족").length;
  const failed = c.legs.some((l) => l.status === "경로 없음" || l.status === "경로 조회 실패");
  return {
    ...c,
    confirmedLegs: confirmed,
    totalMinutes: c.legs.reduce((n, l) => n + (l.minutes ?? 0), 0),
    allConditionsMet: !failed && confirmed === c.legs.length,
  };
}
