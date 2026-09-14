"use client";

import { FOOD_TYPES, MOODS, PLAY_TYPES, type Preferences } from "@/lib/types";

/**
 * 취향 세 항목 입력 UI. 온보딩 모달과 설정 페이지가 같은 UI를 공유한다(spec 5.7).
 * 다중 선택은 pill-tab 칩.
 */
export function PreferencesFields({ value, onChange }: { value: Preferences; onChange: (p: Preferences) => void }) {
  function toggle<K extends "foods" | "plays" | "moods">(key: K, item: Preferences[K][number]) {
    const list = value[key] as string[];
    const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
    onChange({ ...value, [key]: next });
  }

  const chipGroup = <K extends "foods" | "plays" | "moods">(key: K, items: readonly Preferences[K][number][], label: string) => (
    <div className="chips" role="group" aria-label={label}>
      {items.map((item) => {
        const active = (value[key] as string[]).includes(item);
        return (
          <button type="button" key={item} className="pill-tab" aria-pressed={active} onClick={() => toggle(key, item)}>
            {item}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="field">
        <span className="label">음식 종류 <span className="label-note">· 복수 선택 · 비우면 전체 허용</span></span>
        {chipGroup("foods", FOOD_TYPES, "음식 종류")}
      </div>
      <div className="field">
        <span className="label">놀거리 유형 <span className="label-note">· 복수 선택 · 비우면 전체 허용</span></span>
        {chipGroup("plays", PLAY_TYPES, "놀거리 유형")}
      </div>
      <div className="field">
        <span className="label">분위기 <span className="label-note">· 정렬에만 반영</span></span>
        {chipGroup("moods", MOODS, "분위기")}
      </div>
    </>
  );
}
