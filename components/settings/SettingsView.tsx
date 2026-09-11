"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PreferencesFields } from "./PreferencesFields";
import { loadPreferences, resetPreferences, savePreferences } from "@/lib/storage";
import { DEFAULT_PREFERENCES, type Preferences } from "@/lib/types";

/**
 * 설정 페이지 `/settings` (spec 5.7). 온보딩과 같은 UI, 저장 즉시 반영, '취향 초기화'는 확인 후 삭제.
 */
export function SettingsView() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [confirming, setConfirming] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setPrefs(loadPreferences()); }, []);

  function update(next: Preferences) {
    setPrefs(next);
    savePreferences(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  function reset() {
    resetPreferences();
    setPrefs(DEFAULT_PREFERENCES);
    setConfirming(false);
    router.push("/"); // 홈으로 가면 온보딩이 다시 뜬다.
  }

  return (
    <div className="container section-compact settings-wrap">
      <div className="card-checkout-summary stack panel">
        <div className="modal-head">
          <div>
            <h1 className="t-heading-md">취향 설정</h1>
            <p className="t-body-sm muted" style={{ marginTop: "var(--space-xxs)" }} aria-live="polite">
              {saved ? "저장했어요." : "바꾸는 즉시 저장돼요."}
            </p>
          </div>
        </div>

        <PreferencesFields value={prefs} onChange={update} />

        <div className="modal-actions">
          {confirming ? (
            <div className="row" role="alertdialog" aria-label="취향 초기화 확인">
              <span className="badge badge-critical">확인</span>
              <span className="t-body-sm charcoal">기기에 저장된 취향과 온보딩 완료 표시를 지울까요?</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>취소</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={reset} style={{ background: "var(--color-critical-strong)" }}>지우기</button>
            </div>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => setConfirming(true)}>취향 초기화</button>
          )}
          <button type="button" className="btn btn-buy-cta" onClick={() => router.push("/")}>완료</button>
        </div>

        <div className="warranty-card" style={{ padding: "var(--space-lg)" }}>
          <p className="t-body-sm charcoal" style={{ margin: 0 }}>
            취향은 이 기기에만 저장되며 다른 기기와 공유되지 않아요. 초기화하면 다음 접속 때 온보딩이 다시 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
