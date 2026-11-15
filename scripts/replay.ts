import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadEnv } from "./chain-env";
import { servCall, type ServTool } from "../lib/serv/client";
import { clauseReaderSchema, clauseReaderZ, timeBarSchema, timeBarZ } from "../lib/serv/schemas";
import { CLAUSE_READER_SYSTEM, SHADOW_HINT_CLAUSE_READER, TIME_BAR_SYSTEM } from "../lib/serv/crew/prompts";
import { clauseUser } from "../lib/serv/crew/crew";
import { checkRulings } from "../lib/verify/citations";
import { DEFINITION_IDS } from "../lib/pipeline";

// Usage: npx tsx scripts/replay.ts <arm> [reps]
//  arm a = plain gpt-6-luna, b = Multipath, c = Kronos + Multipath, d = c plus Shadow Agent.
// Resumable: finished (case, rep) pairs are kept. Stops at the first out-of-credit error.
loadEnv();
const ARMS: Record<string, { model: string; tools: ServTool[]; label: string }> = {
  a: { model: "gpt-6-luna", tools: [], label: "plain gpt-6-luna" },
  b: { model: "gpt-6-luna-serv-multipath", tools: [], label: "Multipath" },
  c: { model: "gpt-6-luna-serv-kronos-multipath", tools: [], label: "Kronos plus Multipath" },
  d: { model: "gpt-6-luna-serv-kronos-multipath", tools: ["shadow_agent"], label: "Kronos plus Multipath plus Shadow Agent" },
};
const arm = process.argv[2] ?? "a";
const reps = Number(process.argv[3] ?? 1);
const A = ARMS[arm];
if (!A) throw new Error("arm must be a, b, c or d");

type Case = { id: string; citation: string; kind: "time_bar" | "interval"; clauses: { id: string; title: string; text: string }[]; presentedWithin90Days?: string[]; interval?: { text: string; minutes: number }; courtAnswer: string };
const dir = "proof/court-replay/cases";
const cases = readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as Case);
const out = `proof/runs/replay-${arm}.json`;
const done: Record<string, unknown>[] = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")).results : [];

async function one(c: Case) {
  if (c.kind === "time_bar") {
    const r = await servCall({
      role: `replay_${arm}`, model: A.model, system: TIME_BAR_SYSTEM, user: `TIME BAR CLAUSE (data)\n${c.clauses.map((x) => `[${x.id}] ${x.title}: ${x.text}`).join("\n")}`,
      schemaName: "time_bar", schema: timeBarSchema as never, parse: timeBarZ, tools: A.tools,
      shadowHint: "Pass only if every required key is one of the allowed keys and bar_days is the number of days in the clause.", shadowMaxIterations: 1, maxTokens: 1200,
    });
    if (!r.ok) return { ok: false as const, error: r.error ?? "failed", requestId: r.requestId, creditOut: /credit|balance/i.test(r.error ?? "") };
    const required = r.value!.required_keys.filter((k) => k !== "other");
    const missing = required.filter((k) => !(c.presentedWithin90Days ?? []).includes(k));
    const answer = required.length === 0 ? "abstained" : missing.length ? "barred" : "not_barred";
    return { ok: true as const, answer, detail: { required, missing, barDays: r.value!.bar_days }, requestId: r.requestId, latencyMs: r.latencyMs, costUsd: r.costUsd };
  }
  const lines = [{ id: "L01", text: c.interval!.text }];
  const built = [{ id: "I01", from: 0, to: c.interval!.minutes, startLine: "L01", endLine: "L01", kind: "waiting" as const, cause: "none" as const, text: c.interval!.text }];
  const r = await servCall({
    role: `replay_${arm}`, model: A.model, system: CLAUSE_READER_SYSTEM, user: clauseUser({ cp: c.clauses, port: [], lines, intervals: built, offsetMinutes: 0 }),
    schemaName: "interval_rulings", schema: clauseReaderSchema as never, parse: clauseReaderZ, tools: A.tools, shadowHint: SHADOW_HINT_CLAUSE_READER, shadowMaxIterations: 1, maxTokens: 3000,
  });
  if (!r.ok) return { ok: false as const, error: r.error ?? "failed", requestId: r.requestId, creditOut: /credit|balance/i.test(r.error ?? "") };
  const catalog = { charter_party: new Set(c.clauses.map((x) => x.id)), laytime_definitions: new Set(DEFINITION_IDS), port_rules: new Set<string>() };
  const [chk] = checkRulings(["I01"], r.value!.intervals, catalog, new Set(["L01"]), new Map([["I01", { startLine: "L01", endLine: "L01" }]]));
  const answer = chk.resolvedEffect === "ambiguous" ? "abstained" : chk.resolvedEffect;
  return { ok: true as const, answer, detail: { effect: chk.resolvedEffect, clauses: chk.clause_ids, verdict: chk.verdict, problems: chk.problems }, requestId: r.requestId, latencyMs: r.latencyMs, costUsd: r.costUsd };
}

let stop = false;
for (let rep = 1; rep <= reps && !stop; rep++) {
  for (const c of cases) {
    if (done.some((d) => d.case === c.id && d.rep === rep)) continue;
    const r = await one(c);
    if (!r.ok) { console.log(`${c.id} rep ${rep}: FAILED ${r.error?.slice(0, 160)}`); if (r.creditOut) { stop = true; break; } continue; }
    done.push({ case: c.id, rep, court: c.courtAnswer, answer: r.answer, agree: r.answer === c.courtAnswer, ...r.detail, requestId: r.requestId, latencyMs: r.latencyMs, costUsd: r.costUsd });
    console.log(`${c.id} rep ${rep}: ${r.answer} (court ${c.courtAnswer}) ${r.answer === c.courtAnswer ? "AGREE" : "MISS"} ${r.latencyMs}ms`);
    mkdirSync("proof/runs", { recursive: true });
    writeFileSync(out, JSON.stringify({ arm, label: A.label, model: A.model, tools: A.tools, at: new Date().toISOString(), results: done }, null, 2));
  }
}
console.log(stop ? "STOPPED: out of credit" : "arm complete", arm, done.length, "results");
