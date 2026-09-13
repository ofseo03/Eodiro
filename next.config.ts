import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["node:sqlite"],
  outputFileTracingIncludes: { "/api/**": ["./data/places.sqlite"] },
};
export default config;
