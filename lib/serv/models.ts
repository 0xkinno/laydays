/** USD per million tokens, from GET /v1/models (prices there are cents per million). Re-read by scripts/probe-serv.ts. */
export const PRICES: Record<string, { in: number; out: number }> = {
  "gpt-6-luna": { in: 0.13, out: 0.65 },
  "gpt-6.1-sol": { in: 2.4, out: 12 },
  "gpt-6-sol": { in: 2.6, out: 13 },
  "gpt-5.4-mini": { in: 0.75, out: 4.5 },
};

export const MODEL_SUFFIXES = ["-serv-kronos-multipath", "-serv-multipath", "-serv-kronos"] as const;

export function baseModel(id: string): string {
  let m = id;
  for (const s of ["-serv-kronos-multipath", "-serv-multipath", "-serv-kronos", "-serv-shadow"]) m = m.replace(s, "");
  return m;
}

export function costUsd(model: string, promptTokens: number, completionTokens: number): number {
  const p = PRICES[baseModel(model)];
  if (!p) return 0;
  return (promptTokens * p.in + completionTokens * p.out) / 1_000_000;
}

/** Model per role. Final choices are recorded in SDK_SURFACE.md after the Phase 2 probe. */
export const ROLE_MODELS = {
  portClerk: "gpt-6-luna",
  clauseReader: "gpt-6-luna-serv-kronos-multipath",
  seniorReader: "gpt-6.1-sol-serv-multipath",
  timeBarClerk: "gpt-6-luna-serv-kronos",
  counterReader: "gpt-6-luna",
  writer: "gpt-6-luna",
} as const;
