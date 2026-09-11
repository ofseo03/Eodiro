import Link from "next/link";

/** footer-region — 데이터 출처와 법적 문구 (DESIGN.md · Signature Components). */
export function Footer() {
  return (
    <footer className="footer-region">
      <div className="container">
        <div className="footer-cols">
          <div>
            <h4>서비스</h4>
            <Link href="/#request">코스 추천</Link>
            <Link href="/#regions">지원 지역</Link>
            <Link href="/#faq">자주 묻는 질문</Link>
          </div>
          <div>
            <h4>데이터</h4>
            <a href="https://data.seoul.go.kr" target="_blank" rel="noreferrer">서울 열린데이터광장</a>
            <a href="https://www.data.go.kr" target="_blank" rel="noreferrer">기상청 단기예보</a>
            <a href="https://www.seoulmetro.co.kr" target="_blank" rel="noreferrer">서울교통공사</a>
          </div>
          <div>
            <h4>개인정보</h4>
            <Link href="/settings">기기 저장 안내</Link>
            <Link href="/settings">취향 초기화</Link>
          </div>
          <div>
            <h4>문의</h4>
            <a href="https://github.com/ofseo03/Eodiro/issues" target="_blank" rel="noreferrer">피드백 보내기</a>
          </div>
        </div>
        <p className="t-caption footer-legal">
          © 2026 어디로 · 장소·날씨·경로 데이터는 서울특별시, 기상청, 서울교통공사 공공 API를 사용합니다. 한국어만 제공합니다.
        </p>
      </div>
    </footer>
  );
}
