"use client";

import { useEffect, useState } from "react";
import { PreferencesFields } from "@/components/settings/PreferencesFields";
import { isOnboarded, loadPreferences, markOnboarded, savePreferences } from "@/lib/storage";
import { useStored } from "@/lib/useStored";
import type { Preferences } from "@/lib/types";

/**
 * 첫 방문 온보딩 모달 (spec 5.3). 별도 페이지가 아니라 홈 위에 모달로 띄우고 기기당 한 번만 자동 표시한다.
 * 크롬은 card-checkout-summary, '건너뛰기' button-ghost, '완료' button-buy-cta.
 */
export function OnboardingModal() {
  // 서버·하이드레이션 렌더에서는 '완료'로 간주해 모달을 숨기고, 클라이언트 저장소 값으로 다시 렌더한다.
  const onboarded = useStored(isOnboarded, true);
  const open = !onboarded;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") markOnboarded(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!open) return null;
  return <OnboardingDialog />;
}

function OnboardingDialog() {
  const [prefs, setPrefs] = useState<Preferences>(loadPreferences);

  function skip() {
    // 건너뛴 사용자는 취향 없이 전체 허용으로 추천받는다.
    markOnboarded();
  }
  function done() {
    savePreferences(prefs);
    markOnboarded();
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="card-checkout-summary stack panel modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="modal-head">
          <div>
            <h2 className="t-heading-md" id="onboarding-title">취향을 알려 주세요</h2>
            <p className="t-body-sm muted" style={{ marginTop: "var(--space-xxs)" }}>한 번만 고르면 앞으로의 추천에 계속 써요. 이 기기에만 저장돼요.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={skip}>건너뛰기</button>
        </div>
        <PreferencesFields value={prefs} onChange={setPrefs} />
        <div className="modal-actions">
          <span className="t-caption muted" style={{ alignSelf: "center" }}>건너뛰어도 코스는 받을 수 있어요. 설정에서 나중에 입력할 수 있어요.</span>
          <button type="button" className="btn btn-buy-cta" onClick={done}>완료</button>
        </div>
      </div>
    </div>
  );
}
