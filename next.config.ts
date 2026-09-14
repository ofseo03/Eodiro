import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["node:sqlite"],
  // 장소 캐시(SQLite)는 코드에서 경로로만 참조해 자동 추적이 안 되므로 API 함수 번들에 명시적으로 포함한다.
  outputFileTracingIncludes: { "/api/**": ["./data/places.sqlite"] },
};
export default config;
