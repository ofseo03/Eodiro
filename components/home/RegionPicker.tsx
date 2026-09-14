"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { districts, findDistrict } from "@/lib/districts";
import { DISTRICT_IMAGES } from "@/lib/images";
import { fetchAvailability, type Availability } from "@/lib/api";

const CATEGORY_LABEL = { cafe: "카페", restaurant: "식당", activity: "놀거리" } as const;

function shortageOf(availability: Availability | null, districtId: string): string[] | null {
  if (!availability) return null;
  const counts = availability[districtId] ?? { cafe: 0, restaurant: 0, activity: 0 };
  const missing = (Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).filter((c) => counts[c] === 0).map((c) => CATEGORY_LABEL[c]);
  return missing.length ? missing : null;
}

type Props = {
  value: string | null;
  onChange: (districtId: string) => void;
  error?: string;
};

export function RegionPicker({ value, onChange, error }: Props) {
  const selected = findDistrict(value);
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);

  useEffect(() => {
    let alive = true;
    fetchAvailability().then((a) => { if (alive) setAvailability(a); });
    return () => { alive = false; };
  }, []);

  const q = query.trim();
  const matching = districts.filter((d) => d.name.includes(q));
  const selectedShortage = selected ? shortageOf(availability, selected.id) : null;

  return (
    <div className="field">
      <label htmlFor="region-search">지역 <span className="label-note">· 구를 고르면 구 전체에서 코스를 추천해요</span></label>
      <input
        id="region-search"
        className="text-input"
        type="search"
        placeholder="예: 관악구, 성동구, 종로구"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />

      {matching.length === 0 ? (
        <div className="region-empty">&lsquo;{q}&rsquo;에 맞는 구가 없어요. 자치구 이름으로 검색해 주세요.</div>
      ) : (
        <div className="grid-regions" role="group" aria-label="자치구 선택">
          {matching.map((d) => {
            const shortage = shortageOf(availability, d.id);
            const isSelected = d.id === selected?.id;
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={isSelected}
                className={"region-tile" + (isSelected ? " is-selected" : "")}
                onClick={() => onChange(d.id)}
                title={shortage ? d.name + "는 장소 데이터가 부족합니다 (" + shortage.join("·") + ")" : d.name + " 전체에서 추천"}
              >
                <div className={`product-thumbnail${shortage ? " is-unavailable" : ""}`}>
                  <Image src={`/images/regions/${DISTRICT_IMAGES[d.id]}.webp`} alt="" fill sizes="(max-width: 1023px) 30vw, 110px" style={{ objectFit: "contain" }} />
                </div>
                <span className="name">{d.name}</span>
                {shortage ? (
                  <span className="badge badge-attention" style={{ justifySelf: "center" }}>{shortage.join("·")} 부족</span>
                ) : (
                  <span className="sub">구 전체</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selected ? (
        <p className="region-selected">
          <b className="t-body-sm-bold" style={{ color: "var(--color-ink)" }}>{selected.name}</b>
          <span className="muted">구 전체에서 코스를 추천해요.</span>
        </p>
      ) : (
        <p className="help">아직 구를 고르지 않았어요.</p>
      )}
      {selectedShortage && <p className="help">{selectedShortage.length === 3
        ? "현재 이 구의 후보 정보가 없어요."
        : "현재 " + selectedShortage.join("·") + " 후보가 없어요. 해당 구성을 0개로 설정하면 다른 구성으로 추천받을 수 있어요."}</p>}
      {error && <span className="input-error" role="alert">{error}</span>}
    </div>
  );
}
