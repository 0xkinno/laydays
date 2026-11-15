import { mkdirSync, writeFileSync } from "node:fs";
import { loadEnv } from "./chain-env";
import { ruleVoyage, type CpData } from "../lib/pipeline";
import { DEMO } from "../lib/serv/rulebooks.generated";

// Runs the whole Orla Jansen voyage through live SERV several times, for cost and latency percentiles over full-voyage runs.
loadEnv();
const n = Number(process.argv[2] ?? 5);
mkdirSync("proof/runs", { recursive: true });
interface Run { n: number; ms: number; tokenCostUsd: number; intervals: number; observed: number; review: number; steps: number; error?: string }
const runs: Run[] = [];
for (let i = 1; i <= n; i++) {
  const t0 = Date.now();
  try {
    const r = await ruleVoyage({ sofRaw: DEMO.sof, cp: DEMO.cp as unknown as CpData, calendar: DEMO.calendar as never, offsetMinutes: -300 });
    runs.push({ n: i, ms: Date.now() - t0, tokenCostUsd: r.totalCostUsd, intervals: r.intervals.length, observed: r.intervals.filter((x) => x.finalEffect).length, review: r.reviewCount, steps: r.steps.length });
  } catch (e) {
    runs.push({ n: i, ms: Date.now() - t0, tokenCostUsd: 0, intervals: 0, observed: 0, review: 0, steps: 0, error: (e as Error).message.slice(0, 160) });
  }
  console.log(JSON.stringify(runs[runs.length - 1]));
  writeFileSync("proof/runs/full-runs.json", JSON.stringify({ at: new Date().toISOString(), runs }, null, 2));
}
const good = runs.filter((r) => !r.error);
const ms = good.map((r) => r.ms).sort((a, b) => a - b);
const cost = good.map((r) => r.tokenCostUsd).sort((a, b) => a - b);
const pct = (xs: number[], p: number) => xs[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))] ?? 0;
writeFileSync("proof/runs/full-runs.facts.json", JSON.stringify({ full_runs_summary: `${good.length} full-voyage runs, median ${(pct(ms, 50) / 1000).toFixed(0)} s, p95 ${(pct(ms, 95) / 1000).toFixed(0)} s, token cost median $${pct(cost, 50).toFixed(4)}` }, null, 2));
