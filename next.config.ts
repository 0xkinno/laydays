import type { NextConfig } from "next";
const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdf-lib"],
  outputFileTracingExcludes: { "*": ["reference/**", "contracts/**", "proof/runs/serv-calls.jsonl", "docs/video/**", "docs/screenshots/**"] },
  // Routes that read recorded run files at request time.
  outputFileTracingIncludes: {
    "/api/status": ["./proof/runs/watch-*.json"],
    "/api/stats": ["./proof/runs/onchain-*.json"],
    "/api/statement": ["./proof/runs/onchain-*.json"],
    "/api/pack": ["./proof/runs/onchain-*.json", "./data/demo/**"],
  },
};
export default config;
