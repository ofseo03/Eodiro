import Link from "next/link";
import { GearIcon } from "./Icons";

/**
 * Top Navigation (DESIGN.md · Navigation).
 * 흰 고정 바 64px, 좌 워드마크, 우 '추천받기' 앵커 + 설정 원형 아이콘. 하단 내비는 두지 않는다(spec 5.2).
 */
export function TopNav() {
  return (
    <header className="top-nav">
      <div className="container nav-inner">
        <Link className="wordmark" href="/">어디로</Link>
        <div className="nav-actions">
          <Link className="btn btn-primary nav-cta" href="/#request">추천받기</Link>
          <Link className="btn-icon" href="/settings" aria-label="설정"><GearIcon /></Link>
        </div>
      </div>
    </header>
  );
}
