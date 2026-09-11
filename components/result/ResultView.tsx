"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CourseMap, LoadingState, Timeline } from "./parts";
import { PlaceSheet } from "./PlaceSheet";
import { CourseError, STAGES, recommendCourse, replacePlace, retryLeg, type Stage } from "@/lib/api";
import { formatVisitAt } from "@/lib/format";
import { clearSeenPlaces, loadLastRequest, loadSeenPlaces, saveSeenPlaces } from "@/lib/storage";
import { useHydrated, useStored } from "@/lib/useStored";
import type { Course, CourseRequest } from "@/lib/types";

type State =
  | { kind: "loading"; stage: Stage | null }
  | { kind: "error"; message: string; reason: CourseError["kind"] }
  | { kind: "ready"; course: Course; notice: string | null };

/**
 * 결과 페이지 `/result` (spec 5.4 · 5.5 · 5.6).
 * 상단 지도 + 하단 타임라인, 우측 sticky 요약 레일(<1024px 하단 고정 바), 장소 상세 시트.
 */
export function ResultView() {
  const hydrated = useHydrated();
  const req = useStored(loadLastRequest, null);
  const [state, setState] = useState<State>({ kind: "loading", stage: null });
  const [active, setActive] = useState<number | null>(null);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [replacing, setReplacing] = useState(false);

  // 첫 조회: 저장된 요청이 준비되면 한 번 실행한다. 재조회는 버튼 핸들러에서 run() 을 부른다.
  useEffect(() => {
    if (!req?.townId) return;
    return run(req, []);
  }, [req]);

  /** 코스 계산. 취소 함수를 돌려주므로 effect 정리에 그대로 쓸 수 있다. */
  function run(request: CourseRequest, exclude: string[]) {
    let cancelled = false;
    (async () => {
      try {
        const course = await recommendCourse(request, {
          exclude,
          onStage: (stage) => { if (!cancelled) setState({ kind: "loading", stage }); },
        });
        if (cancelled) return;
        saveSeenPlaces([...exclude, ...course.places.map((p) => p.id)]);
        setState({ kind: "ready", course, notice: null });
      } catch (err) {
        if (cancelled) return;
        const e = err instanceof CourseError ? err : new CourseError(err instanceof Error ? err.message : "장소를 불러오지 못했어요.", "network");
        setState({ kind: "error", message: e.message, reason: e.kind });
      }
    })();
    return () => { cancelled = true; };
  }

  function rerun(exclude: string[]) {
    if (!req) return;
    setActive(null);
    setState({ kind: "loading", stage: null });
    run(req, exclude);
  }

  function patchCourse(next: Course, notice: string | null = null) {
    setState({ kind: "ready", course: next, notice });
  }

  async function onRetry(i: number) {
    if (state.kind !== "ready") return;
    setRetrying(i);
    try {
      patchCourse(await retryLeg(state.course, i));
    } catch (err) {
      patchCourse(state.course, err instanceof Error ? err.message : "구간을 다시 조회하지 못했어요.");
    } finally {
      setRetrying(null);
    }
  }

  async function onReplace(index: number, candidateId: string, radius: 100 | 300 | 500) {
    if (state.kind !== "ready") return;
    setReplacing(true);
    try {
      const next = await replacePlace(state.course, index, candidateId, radius);
      saveSeenPlaces([...loadSeenPlaces(), candidateId]);
      patchCourse(next, next.allConditionsMet ? null : "교체 후 일부 조건이 벗어났어요. 구간 상태를 확인해 주세요.");
      setActive(null);
    } catch (err) {
      patchCourse(state.course, err instanceof Error ? err.message : "장소를 교체하지 못했어요.");
    } finally {
      setReplacing(false);
    }
  }

  if (!hydrated) return <div className="container section-compact"><LoadingState stages={STAGES} current={null} /></div>;

  if (!req?.townId) {
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
    const exhausted = state.reason === "exhausted";
    const badge = exhausted ? "후보 소진" : state.reason === "catalog" ? "데이터 준비 중" : state.reason === "no_course" ? "조건 없음" : "오류";
    return (
      <div className="container section-compact">
        <div className="card-product-feature state-card">
          <span className="badge badge-critical">{badge}</span>
          <h1 className="t-heading-md" style={{ marginTop: "var(--space-base)" }}>{state.message}</h1>
          {exhausted ? (
            <>
              <p className="t-body-md charcoal">이번 세션에서 이미 보여 드린 장소를 빼면 남은 후보가 없어요. 제외 목록을 초기화하고 다시 받을까요?</p>
              <div className="row" style={{ justifyContent: "center" }}>
                <button type="button" className="btn btn-buy-cta" onClick={() => { clearSeenPlaces(); rerun([]); }}>제외 목록 초기화 후 다시 추천</button>
                <Link className="btn btn-ghost" href="/#request">조건 바꾸기</Link>
              </div>
            </>
          ) : state.reason === "catalog" ? (
            <>
              <p className="t-body-md charcoal">지금은 우선 검수 지역(성수·서촌·익선·홍대·연남)부터 장소를 채우고 있어요. 다른 동네를 골라 보세요.</p>
              <div className="row" style={{ justifyContent: "center" }}>
                <Link className="btn btn-buy-cta" href="/#request">다른 동네 고르기</Link>
                <button type="button" className="btn btn-ghost" onClick={() => rerun(loadSeenPlaces())}>다시 시도</button>
              </div>
            </>
          ) : (
            <>
              <p className="t-body-md charcoal">
                {state.reason === "no_course" || state.reason === "search_limit" ? "조건에 맞는 코스를 찾지 못했어요. 이렇게 바꿔 보세요." : "잠시 후 다시 시도해 주세요. 계속 안 되면 조건을 바꿔 보세요."}
              </p>
              <ul>
                <li>구간별 최대 도보 거리를 늘리기</li>
                <li>총 이동시간 상한을 늘리기</li>
                <li>허용 교통수단 추가하기</li>
                {state.reason === "search_limit" && <li>장소 수를 줄이기</li>}
              </ul>
              <div className="row" style={{ justifyContent: "center" }}>
                <button type="button" className="btn btn-buy-cta" onClick={() => rerun(loadSeenPlaces())}>다시 시도</button>
                <Link className="btn btn-ghost" href="/#request">홈으로</Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const { course, notice } = state;
  const w = course.weather;
  const activePlace = active !== null ? course.places[active] : null;

  return (
    <>
      {w.indoorPriority && (
        <div className="promo-banner promo-banner-yellow" role="status">
          {w.baseTime} {course.townName.split("·")[0]} · {w.tempC !== null ? `${w.tempC}°C · ` : ""}강수확률 {w.rainPct ?? "-"}% · 실내 위주로 추천해요
        </div>
      )}
      <div className="container section-compact">
        <nav className="breadcrumb" style={{ marginBottom: "var(--space-base)" }} aria-label="경로">
          <Link href="/">홈</Link><span className="sep">·</span>{course.townName}<span className="sep">·</span><span className="current">{formatVisitAt(course.visitAt)}</span>
        </nav>
        <div className="result-head">
          <h1 className="t-heading-md">{course.title}</h1>
          <div className="row" style={{ gap: "var(--space-xs)" }}>
            {course.allConditionsMet && !course.includesEstimates && <span className="badge badge-success">조건 충족</span>}
            {course.allConditionsMet && course.includesEstimates && <span className="badge badge-attention">추정 포함</span>}
            {!course.allConditionsMet && <span className="badge badge-attention">일부 조건 미확인</span>}
            {w.indoorPriority && <span className="badge badge-attention">실내 우선</span>}
            {!w.reflected && <span className="badge badge-neutral">날씨 미반영</span>}
          </div>
        </div>
        {notice && <div className="callout" role="status" style={{ marginBottom: "var(--space-xl)" }}>{notice}</div>}

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
              <button type="button" className="btn btn-buy-cta btn-full" onClick={() => rerun(loadSeenPlaces())}>다시 추천</button>
              <Link className="btn btn-ghost btn-full" href="/#request">조건 바꾸기</Link>
            </div>

            {activePlace && (
              <PlaceSheet
                key={activePlace.id}
                course={course}
                place={activePlace}
                index={active!}
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
        <button type="button" className="btn btn-buy-cta" onClick={() => rerun(loadSeenPlaces())}>다시 추천</button>
      </div>
    </>
  );
}
