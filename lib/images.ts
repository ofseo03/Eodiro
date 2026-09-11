// 랜딩 사진 슬롯 정의. 파일은 public/images/ 에 두고, 없으면 components/Photo.tsx 가 플레이스홀더로 폴백한다.
// 저작권을 확인한 사진만 넣는다(spec 5.8). 출처는 public/images/README.md 에 기록한다.

export type PhotoSlot = "hero" | "region-seongsu" | "region-seochon-ikseon" | "region-hongdae-yeonnam";

export const PHOTO_SLOTS: Record<PhotoSlot, {
  file: string;
  alt: string;
  /** 사진이 없을 때 쓰는 그라디언트 클래스 (app/globals.css .photo-*) */
  placeholder: "" | "photo-mint" | "photo-amber" | "photo-ice" | "photo-lilac";
  /** 권장 비율과 최소 크기 */
  ratio: string;
  minWidth: number;
  position?: string;
}> = {
  hero: { file: "hero.jpg", alt: "해 질 녘 서울 골목의 카페 거리", placeholder: "", ratio: "16:9 이상", minWidth: 2400 },
  "region-seongsu": { file: "region-seongsu.jpg", alt: "성수동 붉은 벽돌 창고와 카페", placeholder: "", ratio: "4:3", minWidth: 1200 },
  "region-seochon-ikseon": { file: "region-seochon-ikseon.jpg", alt: "서촌·익선동 한옥 골목", placeholder: "photo-mint", ratio: "4:3", minWidth: 1200 },
  "region-hongdae-yeonnam": { file: "region-hongdae-yeonnam.jpg", alt: "연남동 경의선숲길", placeholder: "photo-amber", ratio: "4:3", minWidth: 1200 },
};
