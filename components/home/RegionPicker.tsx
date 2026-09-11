"use client";

import { useEffect, useMemo, useState } from "react";
import { DISTRICTS, TOWNS, findTown, type Town } from "@/data/regions";
import { PinIcon } from "@/components/Icons";
import { fetchAvailability, type Availability } from "@/lib/api";

/**
 * region-picker = text-input 검색 + 자치구 pill-tab 행 + 동네 region-picker-row (spec 5.8).
 * 자치구를 고르면 그 구의 동네 타일만 보이고, 검색은 동네명·행정동명 부분 일치로 동작한다(spec 2.3).
 * 카테고리 후보가 하나라도 0인 동네는 회색으로 표시하고 선택할 수 없다. 후보 수는 /api/regions 가 준다.
 */

const TINTS = ["#ffe6f0", "#e3f0ff", "#dff5ea", "#fff3d6", "#ece6ff", "#ffe9d6"];
const CATEGORY_LABEL = { cafe: "카페", restaurant: "식당", activity: "놀거리" } as const;

/** 후보 수를 아직 모르면(null) 안내 없이 모두 선택 가능으로 둔다. */
function shortageOf(availability: Availability | null, townId: string): string[] | null {
  if (!availability) return null;
  const counts = availability[townId] ?? { cafe: 0, restaurant: 0, activity: 0 };
  const missing = (Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).filter((c) => counts[c] === 0).map((c) => CATEGORY_LABEL[c]);
  return missing.length ? missing : null;
}

type Props = {
  value: string | null;
  onChange: (townId: string) => void;
  error?: string;
};

export function RegionPicker({ value, onChange, error }: Props) {
  const selected = useMemo(() => findTown(value), [value]);
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState<string>(() => selected?.district ?? DISTRICTS[0].name);
  const [availability, setAvailability] = useState<Availability | null>(null);

  useEffect(() => {
    let alive = true;
    fetchAvailability().then((a) => { if (alive) setAvailability(a); });
    return () => { alive = false; };
  }, []);

  const q = query.trim();
  const towns: Town[] = useMemo(() => {
    if (q) return TOWNS.filter((t) => t.name.includes(q) || t.dongs.some((d) => d.includes(q)));
    return DISTRICTS.find((d) => d.name === district)?.towns ?? [];
  }, [q, district]);

  function select(t: Town) {
    onChange(t.id);
    setDistrict(t.district);
    setQuery("");
  }

  const selectedShortage = selected ? shortageOf(availability, selected.id) : null;

  return (
    <div className="field">
      <label htmlFor="region-search">지역 <span className="label-note">· 자치구를 고르거나 동네·행정동 이름으로 검색</span></label>
      <input
        id="region-search"
        className="text-input"
        type="search"
        placeholder="예: 성수, 서교동, 샤로수길"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />

      {!q && (
        <div className="district-tabs" role="tablist" aria-label="자치구">
          {DISTRICTS.map((d) => (
            <button
              key={d.name}
              type="button"
              role="tab"
              className={`pill-tab${d.name === district ? " is-active" : ""}`}
              aria-selected={d.name === district}
              onClick={() => setDistrict(d.name)}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {towns.length === 0 ? (
        <div className="region-empty">&lsquo;{q}&rsquo;에 맞는 동네가 없어요. 행정동 이름으로도 찾을 수 있어요.</div>
      ) : (
        <div className="grid-regions" role="listbox" aria-label={q ? "검색 결과" : `${district} 동네`}>
          {towns.map((t, i) => {
            const shortage = shortageOf(availability, t.id);
            const isSelected = t.id === value;
            return (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`region-tile${isSelected ? " is-selected" : ""}`}
                disabled={Boolean(shortage)}
                onClick={() => select(t)}
                title={shortage ? `이 동네는 장소 데이터가 부족합니다 (${shortage.join("·")})` : t.dongs.join(" · ")}
              >
                <div className="product-thumbnail" style={{ background: shortage ? "var(--color-surface-soft)" : TINTS[i % TINTS.length] }}>
                  <PinIcon />
                </div>
                <span className="name">{t.name}</span>
                {shortage ? (
                  <span className="badge badge-attention" style={{ justifySelf: "center" }}>{shortage.join("·")} 부족</span>
                ) : t.priority ? (
                  <span className="badge badge-success" style={{ justifySelf: "center" }}>검수 완료</span>
                ) : (
                  <span className="sub">{q ? t.district : `${t.dongs.length}개 동`}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selected ? (
        <p className="region-selected">
          <span className="badge badge-neutral">{selected.district}</span>
          <b className="t-body-sm-bold" style={{ color: "var(--color-ink)" }}>{selected.name}</b>
          <span className="muted">{selected.dongs.join(" · ")}</span>
        </p>
      ) : (
        <p className="help">아직 동네를 고르지 않았어요.</p>
      )}
      {selectedShortage && <span className="input-error" role="alert">이 동네는 장소 데이터가 부족합니다 ({selectedShortage.join("·")}). 다른 동네를 골라 주세요.</span>}
      {error && <span className="input-error" role="alert">{error}</span>}
    </div>
  );
}
