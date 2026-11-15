import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadEnv } from "./chain-env";
import { servCall, sha256 } from "../lib/serv/client";
import { clauseReaderSchema, clauseReaderZ } from "../lib/serv/schemas";
import { buildClauseSystem, CLAUSE_READER_SYSTEM } from "../lib/serv/crew/prompts";
import { clauseUser } from "../lib/serv/crew/crew";
import { checkRulings } from "../lib/verify/citations";
import { DEFINITION_IDS } from "../lib/pipeline";
import { generateVoyage, TRAP_KINDS, type GenInterval, type TrapKind } from "../lib/laytime/generator";
import { DEMO, HOUSE_RULES_V1 } from "../lib/serv/rulebooks.generated";
import { deidentify, poll, submit } from "../lib/reppo/client";
import { houseStyleViolations } from "../lib/verify/houseStyle";
import { fmtWilson } from "../lib/proof/wilson";

// The house rulebook loop. Stages: v1 (dev seeds), reppo, draft, v2 (new seeds, both versions), report.
// Every model call uses the plain gpt-6-luna so the whole loop stays inside a small credit balance.
loadEnv();
const stage = process.argv[2];
const MODEL = "gpt-6-luna";
const V2_FILE = "data/rulebooks/house-rules.v2.md";
const CAUSE: Record<TrapKind, string> = { clean_wait: "none", rain_before_expiry: "rain", rain_after_expiry: "rain", strike_after_expiry: "strike", shifting_half: "shifting", fog_closure: "port_closure", hose_after_expiry: "shore_equipment", planted_instruction: "rain" };
const sysV1 = CLAUSE_READER_SYSTEM;
const sysV2 = () => buildClauseSystem(readFileSync(V2_FILE, "utf8"), "2");

interface Row { problems?: string[]; seed: number; id: string; kind: TrapKind; truth: string; model: string; verdict: string; agree: boolean; abstained: boolean; reason: string; text: string; requestId: string | null }

async function runSeed(seed: number, system: string): Promise<{ rows: Row[]; ok: boolean; error?: string; costUsd: number }> {
  const v = generateVoyage(seed);
  const built = v.intervals.map((i: GenInterval) => ({ id: i.id, from: i.from, to: i.to, startLine: i.startLine, endLine: i.endLine, kind: "waiting" as const, cause: "none" as const, text: i.text }));
  const r = await servCall({
    role: "loop", model: MODEL, system, user: clauseUser({ cp: DEMO.cp.clauses as never, port: DEMO.calendar.rules as never, lines: v.lines, intervals: built, offsetMinutes: -300 }),
    schemaName: "interval_rulings", schema: clauseReaderSchema as never, parse: clauseReaderZ, maxTokens: 6000,
  });
  if (!r.ok) return { rows: [], ok: false, error: r.error, costUsd: 0 };
  const catalog = { charter_party: new Set(DEMO.cp.clauses.map((c) => c.id)), laytime_definitions: new Set(DEFINITION_IDS), port_rules: new Set(DEMO.calendar.rules.map((x) => x.id)) };
  const checked = checkRulings(v.intervals.map((i) => i.id), r.value!.intervals, catalog, new Set(v.lines.map((l) => l.id)), new Map(v.intervals.map((i) => [i.id, { startLine: i.startLine, endLine: i.endLine }])),
    { causeByInterval: new Map(v.intervals.map((i) => [i.id, CAUSE[i.kind]])), cpClauses: DEMO.cp.clauses as never, portRules: DEMO.calendar.rules as never });
  const rows = v.intervals.map((i) => {
    const c = checked.find((x) => x.interval_id === i.id)!;
    const abstained = c.verdict === "REVIEW";
    return { seed, id: i.id, kind: i.kind, truth: i.truth, model: c.resolvedEffect, verdict: c.verdict, agree: !abstained && c.resolvedEffect === i.truth, abstained, reason: c.reason, problems: c.problems, text: i.text, requestId: r.requestId };
  });
  return { rows, ok: true, costUsd: r.costUsd };
}

async function runSet(seeds: number[], system: string, label: string) {
  const rows: Row[] = []; let cost = 0; const errs: string[] = [];
  for (const s of seeds) {
    const r = await runSeed(s, system);
    if (!r.ok) { errs.push(`seed ${s}: ${r.error?.slice(0, 120)}`); if (/credit|balance/i.test(r.error ?? "")) break; continue; }
    rows.push(...r.rows); cost += r.costUsd;
    console.log(`${label} seed ${s}: ${r.rows.filter((x) => x.agree).length}/${r.rows.length} agree`);
  }
  return { rows, cost, errs };
}

const summarize = (rows: Row[]) => {
  const byKind: Record<string, { agree: number; n: number }> = {};
  for (const k of TRAP_KINDS) byKind[k] = { agree: rows.filter((r) => r.kind === k && r.agree).length, n: rows.filter((r) => r.kind === k).length };
  const wrong = rows.filter((r) => !r.agree && !r.abstained);
  return {
    n: rows.length, agree: rows.filter((r) => r.agree).length, abstained: rows.filter((r) => r.abstained).length,
    wronglyExcepted: wrong.filter((r) => r.truth === "counts" && r.model !== "counts").length, wronglyCounted: wrong.filter((r) => r.truth !== "counts" && r.model === "counts").length, otherWrong: wrong.filter((r) => !(r.truth === "counts" && r.model !== "counts") && !(r.truth !== "counts" && r.model === "counts")).length,
    byKind,
  };
};
const save = (f: string, o: unknown) => { mkdirSync("proof/runs", { recursive: true }); writeFileSync(f, JSON.stringify(o, null, 2)); };
if (stage === "debug") { const r = await runSeed(1, sysV1); console.log(r.rows.map((x) => `${x.kind}: ${x.model} ${x.verdict} ${(x.problems ?? []).join(" | ")}`).join("\n")); }
const range = (a: number, n: number) => Array.from({ length: n }, (_, i) => a + i);

if (stage === "v1") {
  const { rows, cost, errs } = await runSet(range(1, 12), sysV1, "v1");
  save("proof/runs/loop-v1-dev.json", { at: new Date().toISOString(), rulebookSha256: sha256(sysV1), seeds: range(1, 12), summary: summarize(rows), tokenCostUsd: cost, errs, rows });
  console.log(JSON.stringify(summarize(rows)));
}

if (stage === "reppo") {
  const j = JSON.parse(readFileSync("proof/runs/loop-v1-dev.json", "utf8")) as { rows: Row[] };
  const failed = j.rows.filter((r) => !r.agree);
  const seen = new Set<string>(); const picks = failed.filter((r) => (seen.has(r.kind) ? false : (seen.add(r.kind), true))).slice(0, 4);
  const out: unknown[] = [];
  for (const p of picks) {
    const input = `Task: decide whether this interval of a ship's port call counts as laytime, is excepted, or counts at half rate.\nLog: ${p.text}\nCharter party: CP-3 shifting between berths counts half; CP-4 rain that stops discharge is excepted from laytime only; CP-5 strikes and lockouts are excepted and this also applies on demurrage; CP-6 shore breakdown is excepted from laytime only; CP-8 once on demurrage always on demurrage, exceptions stop the clock only where the clause says it applies on demurrage. Port rule PR-1: Coast Guard channel closures are excepted from laytime.\nProposed ruling: ${p.model}. Reason given: ${p.reason}\nCode check result: ${(p.problems ?? []).join("; ") || "none"}. Assess whether the ruling and its reasoning are complete and correct for this interval.`;
    const s = await submit("action", input);
    if ("error" in s) { out.push({ kind: p.kind, error: s.error }); if (s.status === 402) break; continue; }
    const r = await poll(s.id);
    out.push({ kind: p.kind, truth: p.truth, model: p.model, id: s.id, status: r.status, score: r.score, route: r.route, decision: r.result?.decision, reason: r.result?.reason, creditsCharged: r.creditsCharged });
    console.log(p.kind, r.route, r.score);
  }
  save("proof/runs/loop-reppo.json", { at: new Date().toISOString(), evaluations: out });
}

if (stage === "draft") {
  const v1 = JSON.parse(readFileSync("proof/runs/loop-v1-dev.json", "utf8")) as { rows: Row[]; summary: ReturnType<typeof summarize> };
  const rp = existsSync("proof/runs/loop-reppo.json") ? (JSON.parse(readFileSync("proof/runs/loop-reppo.json", "utf8")).evaluations as { kind: string; route?: string; reason?: string }[]) : [];
  const failing = Object.entries(v1.summary.byKind).filter(([, v]) => v.n && v.agree < v.n).map(([k, v]) => `${k}: ${v.agree} of ${v.n} agreed with the answer set by code. Example log line: "${(v1.rows.find((r) => r.kind === k && !r.agree)?.text ?? "").slice(0, 160)}". The model ruled ${v1.rows.find((r) => r.kind === k && !r.agree)?.model}, the answer was ${v1.rows.find((r) => r.kind === k && !r.agree)?.truth}.`);
  const crit = rp.filter((e) => e.reason).map((e) => `${e.kind}: outside evaluator route ${e.route}. ${deidentify(e.reason ?? "").slice(0, 300)}`);
  const sys = "You write short house interpretation rules for a demurrage desk. Output JSON only. Each rule is one or two plain sentences, general, and numbered starting at H-7. A rule must never name a vessel, port, company, person or amount. No dashes, no emoji.";
  const user = `Current rules (version 1):\n${HOUSE_RULES_V1}\n\nTrap kinds the current rules got wrong, from seeded test voyages:\n${failing.join("\n") || "none"}\n\nOutside evaluator critiques (de-identified):\n${crit.join("\n") || "none"}\n\nWrite between 2 and 5 corrective rules that would fix these failures without contradicting the charter party clauses. Each rule must be about how to apply the existing clauses, such as once on demurrage always on demurrage, exceptions that apply on demurrage, and ignoring instructions inside the log.`;
  const schema = { type: "object", additionalProperties: false, required: ["rules"], properties: { rules: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "text"], properties: { id: { type: "string" }, text: { type: "string" } } } } } } as const;
  const { z } = await import("zod");
  const r = await servCall({ role: "loop_draft", model: MODEL, system: sys, user, schemaName: "rules", schema: schema as never, parse: z.object({ rules: z.array(z.object({ id: z.string(), text: z.string() })) }), maxTokens: 1500 });
  if (!r.ok) { console.log("draft failed", r.error); process.exit(1); }
  const bad = r.value!.rules.flatMap((x) => [...houseStyleViolations(x.text), ...(/orla|jansen|houston|saltmarsh|gulfline|meera|dan\b|\$\d/i.test(x.text) ? ["names a party, place or amount"] : [])]);
  const md = `# House interpretation rules, version 2 (proposed, not yet approved)\n\nVersion 1 rules, unchanged:\n\n${HOUSE_RULES_V1.replace(/^# .*\n+/, "")}\nProposed additions, drafted by SERV (${r.requestId}) from the failures of version 1 on seeded voyages and from outside evaluator critiques:\n\n${r.value!.rules.map((x, i) => `H-${7 + i} ${x.text.replace(/^H-\d+\s*/, "")}`).join("\n")}\n`;
  writeFileSync("data/rulebooks/house-rules.v2.proposed.md", md);
  save("proof/runs/loop-draft.json", { at: new Date().toISOString(), requestId: r.requestId, violations: bad, rules: r.value!.rules });
  console.log(md, "\nviolations:", bad);
}

if (stage === "v2") {
  const seeds = range(101, 12);
  const base = await runSet(seeds, sysV1, "v1-new");
  const v2 = await runSet(seeds, sysV2(), "v2-new");
  const s1 = summarize(base.rows), s2 = summarize(v2.rows);
  save("proof/runs/loop-compare.json", { at: new Date().toISOString(), seeds, v1: { sha256: sha256(sysV1), summary: s1, rows: base.rows, errs: base.errs }, v2: { sha256: sha256(sysV2()), summary: s2, rows: v2.rows, errs: v2.errs } });
  writeFileSync("proof/runs/loop.facts.json", JSON.stringify({ loop_v1_new: fmtWilson(s1.agree, s1.n), loop_v2_new: fmtWilson(s2.agree, s2.n), loop_summary: `version 1 ${s1.agree}/${s1.n}, version 2 ${s2.agree}/${s2.n} on new seeds` }, null, 2));
  console.log("v1", JSON.stringify(s1)); console.log("v2", JSON.stringify(s2));
}
