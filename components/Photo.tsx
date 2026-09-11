import Image from "next/image";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CSSProperties, ReactNode } from "react";
import { PHOTO_SLOTS, type PhotoSlot } from "@/lib/images";

/**
 * 사진 슬롯 (DESIGN.md · Image Behavior). 서버 컴포넌트.
 * public/images/<slot>.jpg 가 있으면 next/image 로 풀블리드 사진을 깔고, 없으면 그라디언트 플레이스홀더를 유지한다.
 * 사진 위 흰 글자 가독성을 위한 rgba(10,19,23,0.12) 오버레이는 .photo::after 가 담당한다.
 */
export function Photo({
  slot, className = "", priority = false, sizes, children, style,
}: {
  slot: PhotoSlot; className?: string; priority?: boolean; sizes: string; children?: ReactNode; style?: CSSProperties;
}) {
  const meta = PHOTO_SLOTS[slot];
  const src = `/images/${meta.file}`;
  const available = existsSync(join(process.cwd(), "public", "images", meta.file));
  return (
    <div className={`photo ${meta.placeholder} ${className}`.trim()} style={style}>
      {available && (
        <Image
          src={src}
          alt={meta.alt}
          fill
          priority={priority}
          sizes={sizes}
          style={{ objectFit: "cover", objectPosition: meta.position ?? "center", zIndex: 0 }}
        />
      )}
      {children}
    </div>
  );
}
