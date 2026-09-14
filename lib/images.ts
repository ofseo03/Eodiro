// 이미지 슬롯 정의. 랜딩 파일이 없으면 components/Photo.tsx 가 플레이스홀더로 폴백한다.
// 출처는 public/images/README.md 에 기록한다.
import type { Category } from "./types";

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
  "region-seongsu": { file: "regions/feature-seongsu.webp", alt: "커피를 든 벽돌 카페와 나무 캐릭터 일러스트", placeholder: "", ratio: "5:4", minWidth: 1200, position: "center bottom" },
  "region-seochon-ikseon": { file: "regions/feature-seochon.webp", alt: "그림을 든 한옥과 찻잔 캐릭터 일러스트", placeholder: "photo-mint", ratio: "5:4", minWidth: 1200, position: "center bottom" },
  "region-hongdae-yeonnam": { file: "regions/feature-hongdae.webp", alt: "숲길을 걷는 기타와 나무 캐릭터 일러스트", placeholder: "photo-amber", ratio: "5:4", minWidth: 1200, position: "center bottom" },
};

export const DISTRICT_IMAGES: Record<string, string> = {
  종로구: "jongno", 중구: "jung", 용산구: "yongsan", 성동구: "seongdong", 광진구: "gwangjin",
  동대문구: "dongdaemun", 중랑구: "jungnang", 성북구: "seongbuk", 강북구: "gangbuk", 도봉구: "dobong",
  노원구: "nowon", 은평구: "eunpyeong", 서대문구: "seodaemun", 마포구: "mapo", 양천구: "yangcheon",
  강서구: "gangseo", 구로구: "guro", 금천구: "geumcheon", 영등포구: "yeongdeungpo", 동작구: "dongjak",
  관악구: "gwanak", 서초구: "seocho", 강남구: "gangnam", 송파구: "songpa", 강동구: "gangdong",
};

export const CATEGORY_IMAGES: Record<Category, string> = {
  카페: "/images/categories/cafe.webp",
  식당: "/images/categories/restaurant.webp",
  놀거리: "/images/categories/activities.webp",
};
