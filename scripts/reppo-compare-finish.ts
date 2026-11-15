import { readFileSync, writeFileSync } from "node:fs";
import { loadEnv } from "./chain-env";
import { poll } from "../lib/reppo/client";
// Re-polls evaluations that were still queued when reppo-compare.ts stopped waiting, then recomputes the comparison. Submits nothing new.
loadEnv();
type R = { kind: string; version: "v1" | "v2"; id?: string; status?: string; score?: number | null; route?: string | null; credits?: number; err?: string; decision?: string; confidence?: string };
const f = "proof/runs/reppo-compare.json";
const d = JSON.parse(readFileSync(f, "utf8")) as { results: R[]; paired: { kind: string; seed: number }[] };
await Promise.all(d.results.filter((r) => r.id && typeof r.score !== "number").map(async (r) => {
  const x = await poll(r.id!, 1_200_000);
  Object.assign(r, { status: x.status, score: x.score, route: x.route, decision: x.result?.decision, confidence: x.result?.confidence, credits: x.creditsCharged });
}));
const sc = (kind: string, v: string) => d.results.find((r) => r.kind === kind && r.version === v);
const paired = d.paired.map((p) => ({ kind: p.kind, seed: p.seed, v1: sc(p.kind, "v1")?.score ?? null, v2: sc(p.kind, "v2")?.score ?? null, v1Route: sc(p.kind, "v1")?.route ?? null, v2Route: sc(p.kind, "v2")?.route ?? null }));
const both = paired.filter((p) => p.v1 !== null && p.v2 !== null) as { kind: string; v1: number; v2: number }[];
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const m1 = mean(both.map((p) => p.v1)), m2 = mean(both.map((p) => p.v2));
const out = { ...d, at: new Date().toISOString(), pairs: paired.length, completePairs: both.length, meanV1: m1, meanV2: m2, delta: m2 - m1, v2Higher: both.filter((p) => p.v2 > p.v1).length, v1Higher: both.filter((p) => p.v1 > p.v2).length, ties: both.filter((p) => p.v1 === p.v2).length, creditsUsed: d.results.reduce((a, r) => a + (r.credits ?? 0), 0), paired };
writeFileSync(f, JSON.stringify(out, null, 2));
writeFileSync("proof/runs/reppo-compare.facts.json", JSON.stringify({ reppo_before_after: `Reppo mean score ${m1.toFixed(1)} for version 1 and ${m2.toFixed(1)} for version 2 over ${both.length} matched intervals`, reppo_credits_total: out.creditsUsed }, null, 2));
console.log(JSON.stringify({ complete: both.length, m1, m2, v2Higher: out.v2Higher, v1Higher: out.v1Higher, ties: out.ties, creditsUsed: out.creditsUsed, unfinished: d.results.filter((r) => typeof r.score !== "number").map((r) => `${r.kind} ${r.version} ${r.status}`) }));
