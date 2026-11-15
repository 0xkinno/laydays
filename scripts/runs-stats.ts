import { readFileSync, writeFileSync } from "node:fs";
// Latency and token-cost percentiles per role, from the log of every real SERV call this build made (proof/runs/serv-calls.jsonl).
const rows = readFileSync("proof/runs/serv-calls.jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as { role: string; model: string; ok: boolean; latencyMs: number; costUsd: number; refusedBy: string | null });
const pct = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : 0; };
const by: Record<string, { calls: number; ok: number; refused: number; failed: number; medianMs: number; p95Ms: number; medianCostUsd: number; p95CostUsd: number; totalTokenCostUsd: number }> = {};
for (const role of [...new Set(rows.map((r) => r.role))]) {
  const rs = rows.filter((r) => r.role === role), good = rs.filter((r) => r.ok);
  by[role] = { calls: rs.length, ok: good.length, refused: rs.filter((r) => r.refusedBy).length, failed: rs.filter((r) => !r.ok && !r.refusedBy).length, medianMs: pct(good.map((r) => r.latencyMs), 50), p95Ms: pct(good.map((r) => r.latencyMs), 95), medianCostUsd: pct(good.map((r) => r.costUsd), 50), p95CostUsd: pct(good.map((r) => r.costUsd), 95), totalTokenCostUsd: good.reduce((a, r) => a + r.costUsd, 0) };
}
const all = rows.filter((r) => r.ok);
const out = { at: new Date().toISOString(), calls: rows.length, successful: all.length, medianMs: pct(all.map((r) => r.latencyMs), 50), p95Ms: pct(all.map((r) => r.latencyMs), 95), byRole: by, note: "Token cost only, from the usage field. Multipath, Kronos and Shadow Agent are billed beyond the visible tokens (see FINDINGS.md)." };
writeFileSync("proof/runs/runs-stats.json", JSON.stringify(out, null, 2));
writeFileSync("proof/runs/runs-stats.facts.json", JSON.stringify({ runs_summary: `${all.length} successful SERV calls, median ${(out.medianMs / 1000).toFixed(1)} s, p95 ${(out.p95Ms / 1000).toFixed(1)} s` }, null, 2));
console.log(JSON.stringify({ calls: rows.length, ok: all.length, medianMs: out.medianMs, p95Ms: out.p95Ms, roles: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, `${v.ok}/${v.calls} ok, median ${v.medianMs}ms, p95 ${v.p95Ms}ms`])) }, null, 1));
