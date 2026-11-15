import { readFileSync, writeFileSync } from "node:fs";
import { loadEnv } from "./chain-env";
import { poll, submit } from "../lib/reppo/client";
import { TRAP_KINDS } from "../lib/laytime/generator";

// Reppo-measured before and after. For each trap kind the lowest-numbered new seed is taken (no picking), and the ruling that
// rulebook version 1 gave and the ruling that version 2 gave for the same interval are both sent to Reppo, de-identified and
// without saying which version made them. 16 evaluations, 440 credits each.
loadEnv();
type Row = { seed: number; id: string; kind: string; truth: string; model: string; reason: string; text: string; agree: boolean };
const cmp = JSON.parse(readFileSync("proof/runs/loop-compare.json", "utf8")) as { v1: { rows: Row[] }; v2: { rows: Row[] } };
const CLAUSES = "Charter party: CP-3 shifting between berths counts half; CP-4 rain that stops discharge is excepted from laytime only; CP-5 strikes and lockouts are excepted and this also applies on demurrage; CP-6 shore breakdown is excepted from laytime only; CP-8 once on demurrage always on demurrage, exceptions stop the clock only where the clause says it applies on demurrage. Port rule PR-1: Coast Guard channel closures are excepted from laytime.";
const input = (r: Row) => `Task: decide whether this interval of a ship's port call counts as laytime, is excepted, or counts at half rate.\nLog: ${r.text}\n${CLAUSES}\nProposed ruling: ${r.model}. Reason given: ${r.reason}\nAssess whether the ruling and its reasoning are correct and complete for this interval.`;

const pairs = TRAP_KINDS.map((k) => {
  const a = cmp.v1.rows.filter((r) => r.kind === k).sort((x, y) => x.seed - y.seed)[0];
  const b = cmp.v2.rows.find((r) => r.seed === a?.seed && r.kind === k);
  return a && b ? { kind: k, seed: a.seed, v1: a, v2: b } : null;
}).filter(Boolean) as { kind: string; seed: number; v1: Row; v2: Row }[];

const jobs: { kind: string; version: "v1" | "v2"; id?: string; err?: string }[] = [];
for (const p of pairs) for (const v of ["v1", "v2"] as const) {
  const s = await submit("action", input(p[v]));
  jobs.push("error" in s ? { kind: p.kind, version: v, err: `${s.error} (${s.status})` } : { kind: p.kind, version: v, id: s.id });
  if ("error" in s && s.status === 402) break;
}
const results = await Promise.all(jobs.map(async (j) => {
  if (!j.id) return { ...j };
  const r = await poll(j.id, 600_000);
  return { kind: j.kind, version: j.version, id: j.id, status: r.status, score: r.score, route: r.route, decision: r.result?.decision, confidence: r.result?.confidence, credits: r.creditsCharged };
}));
const ok = (v: string) => results.filter((r) => r.version === v && typeof (r as { score?: number }).score === "number") as { kind: string; score: number; route: string }[];
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const m1 = mean(ok("v1").map((r) => r.score)), m2 = mean(ok("v2").map((r) => r.score));
const paired = pairs.map((p) => ({ kind: p.kind, seed: p.seed, v1: ok("v1").find((r) => r.kind === p.kind)?.score ?? null, v2: ok("v2").find((r) => r.kind === p.kind)?.score ?? null, v1Route: ok("v1").find((r) => r.kind === p.kind)?.route ?? null, v2Route: ok("v2").find((r) => r.kind === p.kind)?.route ?? null }));
const out = { at: new Date().toISOString(), pairs: paired.length, meanV1: m1, meanV2: m2, delta: m2 - m1, v2Higher: paired.filter((p) => p.v1 !== null && p.v2 !== null && p.v2 > p.v1).length, v1Higher: paired.filter((p) => p.v1 !== null && p.v2 !== null && p.v1 > p.v2).length, ties: paired.filter((p) => p.v1 !== null && p.v1 === p.v2).length, creditsUsed: results.reduce((a, r) => a + ((r as { credits?: number }).credits ?? 0), 0), paired, results };
writeFileSync("proof/runs/reppo-compare.json", JSON.stringify(out, null, 2));
writeFileSync("proof/runs/reppo-compare.facts.json", JSON.stringify({ reppo_before_after: `Reppo mean score ${m1.toFixed(1)} for version 1 and ${m2.toFixed(1)} for version 2 over ${paired.length} matched intervals` }, null, 2));
console.log(JSON.stringify({ ...out, results: undefined }, null, 1));
