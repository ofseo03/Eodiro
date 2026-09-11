"use client";

import { useEffect, useRef, useState } from "react";
import { LocateIcon } from "@/components/Icons";
import { loadKakaoMaps } from "@/lib/kakao-maps";
import type { Place } from "@/lib/types";

export function CourseMap({ places, activeIndex, onSelect }: { places: Place[]; activeIndex: number | null; onSelect: (i: number) => void }) {
  const canvas = useRef<HTMLDivElement>(null);
  const select = useRef<(index: number | null) => void>(() => {});
  const fit = useRef(() => {});
  const active = useRef(activeIndex);
  const [status, setStatus] = useState("지도를 불러오는 중…");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const element = canvas.current;
    let cancelled = false;
    let cleanup = () => {};
    loadKakaoMaps().then(maps => {
      if (cancelled || !element || !places.length) return;
      const points = places.map(p => new maps.LatLng(p.lat, p.lng));
      const map = new maps.Map(element, { center: points[0], level: 4 });
      const bounds = new maps.LatLngBounds();
      points.forEach(point => bounds.extend(point));
      const buttons = places.map((place, i) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "marker";
        button.textContent = String(i + 1);
        button.setAttribute("aria-label", `${i + 1}. ${place.name}`);
        button.setAttribute("aria-pressed", "false");
        button.onclick = () => onSelect(i);
        return button;
      });
      const overlays = points.map((position, i) => new maps.CustomOverlay({
        map, position, content: buttons[i], yAnchor: 1, clickable: true,
      }));
      select.current = index => {
        buttons.forEach((button, i) => {
          button.classList.toggle("is-active", index === i);
          button.setAttribute("aria-pressed", String(index === i));
        });
        if (index !== null && points[index]) map.panTo(points[index]);
      };
      fit.current = () => { map.relayout(); map.setBounds(bounds); };
      fit.current();
      select.current(active.current);
      const observer = new ResizeObserver(() => fit.current());
      observer.observe(element);
      cleanup = () => { observer.disconnect(); overlays.forEach(overlay => overlay.setMap(null)); };
      setStatus("");
    }).catch(() => { if (!cancelled) setStatus("지도를 불러오지 못했어요. 장소는 아래 목록에서 확인할 수 있어요."); });
    return () => { cancelled = true; cleanup(); select.current = () => {}; fit.current = () => {}; element?.replaceChildren(); };
  }, [places, onSelect, attempt]);

  useEffect(() => { active.current = activeIndex; select.current(activeIndex); }, [activeIndex, status, places]);

  return (
    <div className="map" role="group" aria-label="코스 지도" aria-busy={status === "지도를 불러오는 중…"}>
      <div ref={canvas} className="map-canvas" />
      {status ? <div className="map-status" role="status">
        <p>{status}</p>
        {status !== "지도를 불러오는 중…" && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setStatus("지도를 불러오는 중…"); setAttempt(n => n + 1); }}>다시 시도</button>}
      </div> : <button type="button" className="btn-icon" aria-label="전체 코스 보기" onClick={() => fit.current()}><LocateIcon /></button>}
    </div>
  );
}
