import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: { default: "어디로", template: "%s · 어디로" },
  description: "서울 전역 147개 동네에서 날씨와 이동시간에 맞춘 카페·식당·놀거리 코스를 추천해요. 로그인 없이 바로.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <TopNav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
