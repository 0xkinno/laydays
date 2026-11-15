import type { NextConfig } from "next";
const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdf-lib"],
  outputFileTracingExcludes: { "*": ["reference/**", "contracts/**", "proof/runs/**"] },
};
export default config;
