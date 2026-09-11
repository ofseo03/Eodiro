"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { RegionPicker } from "./RegionPicker";
import { CheckIcon } from "@/components/Icons";
import { nowLocalInput } from "@/lib/format";
import { clearSeenPlaces, loadLastRequest, loadPreferences, saveLastRequest } from "@/lib/storage";
import {
  CATEGORIES, INDOOR_PREFS, MAX_PLACES, MAX_WALK_METERS, MIN_PLACES,
  type Category, type CourseRequest, type IndoorPref,
} from "@/lib/types";

/**
 * course-request-panel — 홈 입력 폼 (spec 2.3 · 5.8).
 * card-checkout-summary 밀도, 섹션 제목 subtitle-lg, 그룹 간격 20px, 맨 아래 전폭 button-buy-cta '추천받기'.
 * 커머스 표면이므로 코발트 CTA는 여기서만 쓴다.
 */

function defaultRequest(): CourseRequest {
  return {
    townId: null,
    visitAt: nowLocalInput(30),
    composition: { 카페: 1, 식당: 1, 놀거리: 1 },
    maxTravelMinutes: 60,
    transport: { bus: true, subway: true, walk: true, taxi: false },
    maxWalkMeters: 500,
    indoor: "상관없음",
  };
}

type Errors = Partial<Record<"townId" | "visitAt" | "composition" | "maxTravelMinutes" | "maxWalkMeters" | "transport", string>>;

function validate(r: CourseRequest): Errors {
  const e: Errors = {};
  if (!r.townId) e.townId = "지역을 골라 주세요.";
  if (!r.visitAt) e.visitAt = "방문 날짜와 시간을 입력해 주세요.";
  else if (new Date(r.visitAt).getTime() < Date.now() - 60_000) e.visitAt = "현재 시각 이후로 설정해 주세요.";
  const total = Object.values(r.composition).reduce((a, b) => a + b, 0);
  if (total < MIN_PLACES || total > MAX_PLACES) e.composition = `총 장소 수는 ${MIN_PLACES}곳 이상 ${MAX_PLACES}곳 이하여야 해요.`;
  if (!(r.maxTravelMinutes > 0)) e.maxTravelMinutes = "1분 이상으로 입력해 주세요.";
  if (r.transport.walk) {
    if (!(r.maxWalkMeters > 0)) e.maxWalkMeters = "1m 이상으로 입력해 주세요.";
    else if (r.maxWalkMeters > MAX_WALK_METERS) e.maxWalkMeters = `최대 ${MAX_WALK_METERS.toLocaleString()}m까지 설정할 수 있어요.`;
  }
  if (!r.transport.bus && !r.transport.subway && !r.transport.walk) e.transport = "택시를 제외하고 하나 이상 선택해 주세요.";
  return e;
}

export function CourseRequestForm() {
  const router = useRouter();
  const [req, setReq] = useState<CourseRequest>(defaultRequest);
  const [errors, setErrors] = useState<Errors>({});
  const [restored, setRestored] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 마지막 입력값과 취향(실내·실외 선호)을 기기에서 복원한다.
  useEffect(() => {
    const last = loadLastRequest();
    const prefs = loadPreferences();
    setReq((cur) => {
      const base = last ? { ...cur, ...last } : { ...cur, indoor: prefs.indoor };
      // 지난 방문 시각이 이미 지났으면 현재 기준으로 되돌린다.
      if (new Date(base.visitAt).getTime() < Date.now()) base.visitAt = nowLocalInput(30);
      return base;
    });
    setRestored(Boolean(last));
  }, []);

  const total = CATEGORIES.reduce((n, c) => n + req.composition[c], 0);

  function patch(p: Partial<CourseRequest>) {
    setReq((cur) => ({ ...cur, ...p }));
  }
  function step(cat: Category, delta: 1 | -1) {
    const next = Math.max(0, req.composition[cat] + delta);
    patch({ composition: { ...req.composition, [cat]: next } });
  }

  function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate(req);
    setErrors(e);
    if (Object.keys(e).length) {
      const first = document.querySelector<HTMLElement>("[aria-invalid='true'], .input-error");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    saveLastRequest(req);
    clearSeenPlaces(); // 조건을 바꿔 새로 요청하면 제외 목록은 초기화 (spec 5.4-7)
    router.push("/result");
  }

  return (
    <div className="form-grid">
      <form className="card-checkout-summary stack panel" onSubmit={submit} noValidate>
        <div>
          <h2 className="t-heading-md">코스 추천받기</h2>
          <p className="t-body-sm muted" style={{ marginTop: "var(--space-xxs)" }}>
            {restored ? "마지막 입력값을 기본으로 채웠어요." : "출발 위치는 필요 없어요. 동네 안에서만 코스를 짜요."}
          </p>
        </div>

        <RegionPicker value={req.townId} onChange={(townId) => patch({ townId })} error={errors.townId} />

        <div className="field">
          <label htmlFor="visitAt">방문 날짜·시간</label>
          <input
            id="visitAt"
            className="text-input"
            type="datetime-local"
            value={req.visitAt}
            min={nowLocalInput()}
            aria-invalid={errors.visitAt ? "true" : undefined}
            onChange={(e) => patch({ visitAt: e.target.value })}
          />
          {errors.visitAt ? <span className="input-error">{errors.visitAt}</span> : <span className="help">예보 범위(3일)를 넘으면 날씨 미반영으로 추천해요.</span>}
        </div>

        <div className="field">
          <span className="label">코스 구성 <span className="label-note">· 최소 {MIN_PLACES}곳, 최대 {MAX_PLACES}곳 · 현재 {total}곳</span></span>
          <div className="composition">
            {CATEGORIES.map((cat) => (
              <div className="composition-item" key={cat}>
                <span className={`badge badge-neutral${cat === "놀거리" ? " badge-purple" : ""}`}>{cat}</span>
                <div className="stepper" role="group" aria-label={`${cat} 개수`}>
                  <button type="button" className="btn-icon" aria-label={`${cat} 줄이기`} disabled={req.composition[cat] === 0} onClick={() => step(cat, -1)}>−</button>
                  <b className="t-body-md-bold" aria-live="polite">{req.composition[cat]}</b>
                  <button type="button" className="btn-icon" aria-label={`${cat} 늘리기`} disabled={total >= MAX_PLACES} onClick={() => step(cat, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
          {errors.composition && <span className="input-error">{errors.composition}</span>}
        </div>

        <div className="grid-inputs">
          <div className="field">
            <label htmlFor="maxTravel">총 이동시간 상한(분)</label>
            <input
              id="maxTravel"
              className="text-input"
              type="number"
              inputMode="numeric"
              min={1}
              value={req.maxTravelMinutes}
              aria-invalid={errors.maxTravelMinutes ? "true" : undefined}
              onChange={(e) => patch({ maxTravelMinutes: Number(e.target.value) })}
            />
            {errors.maxTravelMinutes ? <span className="input-error">{errors.maxTravelMinutes}</span> : <span className="help">체류시간은 빼고 구간 이동만 더해요.</span>}
          </div>
          <div className="field">
            <label htmlFor="maxWalk">구간별 최대 도보(m)</label>
            <input
              id="maxWalk"
              className="text-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_WALK_METERS}
              value={req.maxWalkMeters}
              disabled={!req.transport.walk}
              aria-invalid={errors.maxWalkMeters ? "true" : undefined}
              onChange={(e) => patch({ maxWalkMeters: Number(e.target.value) })}
            />
            {errors.maxWalkMeters ? <span className="input-error">{errors.maxWalkMeters}</span> : <span className="help">역·정류장까지 걷는 거리는 제외예요.</span>}
          </div>
          <div className="field">
            <span className="label">허용 교통수단</span>
            <div className="stack" style={{ gap: "var(--space-xs)" }}>
              {(
                [
                  ["bus", "버스"],
                  ["subway", "지하철"],
                  ["walk", "도보"],
                  ["taxi", "택시"],
                ] as const
              ).map(([key, label]) => (
                <label className="check" key={key}>
                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={req.transport[key]}
                    onChange={(e) => patch({ transport: { ...req.transport, [key]: e.target.checked } })}
                  />
                  {label}
                  {key === "taxi" && <span className="t-caption muted">(대안 표시만)</span>}
                </label>
              ))}
            </div>
            {errors.transport && <span className="input-error">{errors.transport}</span>}
          </div>
        </div>

        <div className="field">
          <span className="label">실내·실외 선호 <span className="label-note">· 날씨가 실내 우선이면 날씨를 따라요</span></span>
          <div className="radio-group" role="radiogroup" aria-label="실내·실외 선호">
            {INDOOR_PREFS.map((opt: IndoorPref) => {
              const checked = req.indoor === opt;
              return (
                <button type="button" key={opt} className="radio-option" role="radio" aria-checked={checked} onClick={() => patch({ indoor: opt })}>
                  <span>{opt}</span>
                  {checked && <CheckIcon />}
                </button>
              );
            })}
          </div>
        </div>

        <button type="submit" className="btn btn-buy-cta btn-full" disabled={submitting}>
          {submitting ? "코스를 준비하는 중…" : "추천받기"}
        </button>
      </form>

      <aside className="stack">
        <div className="warranty-card">
          <h3 className="t-subtitle-lg">취향은 이 기기에만 저장돼요</h3>
          <p className="t-body-sm charcoal">음식 종류·놀거리 유형·분위기·실내외 선호를 설정에서 언제든 바꿀 수 있어요. 서버로 보내지 않습니다.</p>
          <Link className="btn btn-ghost" href="/settings">설정에서 수정</Link>
        </div>
        <div className="card-icon-feature">
          <h3 className="t-subtitle-lg" style={{ fontFeatureSettings: "normal" }}>이렇게 골라요</h3>
          <ul className="stack" style={{ gap: "var(--space-xs)", marginTop: "var(--space-xs)" }}>
            <li className="t-body-sm charcoal">1. 동네 안에서 취향에 맞는 카페·식당·놀거리 후보를 모아요.</li>
            <li className="t-body-sm charcoal">2. 방문 시각 날씨가 덥거나 춥거나 비 예보면 실내 장소를 우선해요.</li>
            <li className="t-body-sm charcoal">3. 허용한 교통수단으로만 구간을 잇고, 이동시간 상한 안에서 순서를 정해요.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
