import { mkdirSync, writeFileSync } from "node:fs";
import { loadEnv } from "./chain-env";
import { servResponses } from "../lib/serv/client";
import { statementWriter, timeBarClerk, clauseUser } from "../lib/serv/crew/crew";
import { CLAUSE_READER_SYSTEM } from "../lib/serv/crew/prompts";
import { DEMO } from "../lib/serv/rulebooks.generated";
import { demoSummary, local } from "../lib/view";
import { computeStatement } from "../lib/laytime/clock";
import { formatDhm, formatUsd } from "../lib/laytime/money";
import { numbersNotInFacts } from "../lib/verify/numbersInFacts";
import { applyHouseStyle, houseStyleViolations } from "../lib/verify/houseStyle";
import { parseSof } from "../lib/laytime/intervals";

// Records three real SERV runs that the voyage and trace pages show: the Time-bar Clerk reading the time bar clause, the
// Statement Writer's cover note, and a reasoning summary from the Responses endpoint for one ruling.
loadEnv();
mkdirSync("data/demo", { recursive: true });
const which = process.argv[2] ?? "all";
const s = demoSummary();

if (which === "all" || which === "timebar") {
  const clause = DEMO.cp.clauses.find((c) => c.id === "CP-9")!;
  const r = await timeBarClerk(`[${clause.id}] ${clause.title}: ${clause.text}`);
  if (!r.ok) throw new Error(`time-bar clerk failed: ${r.error}`);
  const declared = DEMO.cp.requiredDocuments.map((d) => d.key).sort();
  const read = [...r.value!.required_keys].sort();
  writeFileSync("data/demo/timebar-clerk.json", JSON.stringify({ at: new Date().toISOString(), model: r.model, requestId: r.requestId, latencyMs: r.latencyMs, costUsd: r.costUsd, barDays: r.value!.bar_days, requiredKeys: read, declaredKeys: declared, matchesDeclared: JSON.stringify(read) === JSON.stringify(declared) && r.value!.bar_days === DEMO.cp.timeBarDays, reason: applyHouseStyle(r.value!.reason) }, null, 2));
  console.log("timebar", read.join(","), "bar", r.value!.bar_days, "matches", JSON.stringify(read) === JSON.stringify(declared));
}

if (which === "all" || which === "note") {
  const iv = s.intervals;
  // Meera rules the one open interval herself, as in the onchain record: excepted.
  const rows = iv.map((i) => ({ ...i, final: i.effect ?? "excepted" }));
  const st = computeStatement({ allowedMinutes: 2160, commencesAt: s.commencesAt, demurrageRateCentsPerDay: 1800000n, despatchHalfRate: true, intervals: rows.map((r) => ({ id: r.id, from: r.from, to: r.to, effect: r.final as "counts", appliesOnDemurrage: r.appliesOnDemurrage })) });
  const facts = {
    vessel: "MT Orla Jansen, fictional", port: "Houston", noticeOfReadiness: local(s.norAt), laytimeAllowed: formatDhm(2160), laytimeExpired: st.expiredAt ? local(st.expiredAt) : "never",
    timeOnDemurrage: formatDhm(st.demurrageMinutes), demurrageRate: "$18,000 per day", claimAmount: formatUsd(st.demurrageCents), intervalsRuled: iv.length,
    exceptedIntervals: rows.filter((r) => r.final === "excepted").length, halfRateIntervals: rows.filter((r) => r.final === "half").length, intervalsRuledByTheAnalyst: iv.filter((i) => i.verdict === "REVIEW").length,
    timeBar: "90 days from completion of discharge", documentsEnclosed: 7,
  };
  let note = "", attempts = 0, requestId: string | null = null, model = "", bad: string[] = [], style: string[] = [], source = "model";
  for (; attempts < 2; attempts++) {
    const r = await statementWriter(facts);
    if (!r.ok) { bad = [`writer failed: ${r.error}`]; continue; }
    requestId = r.requestId; model = r.model; note = applyHouseStyle(r.value!.note);
    bad = numbersNotInFacts(note, facts); style = houseStyleViolations(note);
    if (!bad.length && !style.length) break;
  }
  if (bad.length || style.length || !note) {
    source = "template, model note rejected";
    note = `Laytime statement for ${facts.vessel} at ${facts.port}. The claim is ${facts.claimAmount}: ${facts.timeOnDemurrage} on demurrage at ${facts.demurrageRate}, after ${facts.intervalsRuled} intervals were ruled and ${facts.exceptedIntervals} were excepted. ${facts.documentsEnclosed} documents are enclosed.`;
  }
  writeFileSync("data/demo/cover-note.json", JSON.stringify({ at: new Date().toISOString(), source, model, requestId, attempts: attempts + 1, note, facts, numbersNotInFacts: numbersNotInFacts(note, facts), houseStyleViolations: houseStyleViolations(note) }, null, 2));
  console.log("note:", source, "|", note);
}

if (which === "all" || which === "reasoning") {
  const i = iv0();
  const user = clauseUser({ cp: DEMO.cp.clauses as never, port: DEMO.calendar.rules as never, lines: parseSof(DEMO.sof), intervals: [{ id: i.id, from: i.from, to: i.to, startLine: i.startLine, endLine: i.endLine, kind: "waiting", cause: "none", text: i.text }], offsetMinutes: -300 });
  // Summaries only appear at medium effort, and not with a strict schema, so this call asks for JSON in the prompt.
  // The endpoint returns a summary on some calls and an empty one on others, so retry a few times and keep the attempt count.
  let r = await servResponses({ model: "gpt-6-luna-serv-kronos-multipath", system: CLAUSE_READER_SYSTEM, user: user + "\n\nReturn the answer as JSON with an intervals array as described.", effort: "medium", maxTokens: 14000, timeoutMs: 280_000 });
  let tries = 1;
  while (r.ok && r.summaries.length === 0 && tries < 4) { r = await servResponses({ model: "gpt-6-luna-serv-kronos-multipath", system: CLAUSE_READER_SYSTEM, user: user + "\n\nReturn the answer as JSON with an intervals array as described.", effort: "medium", maxTokens: 14000, timeoutMs: 280_000 }); tries++; }
  if (!r.ok) throw new Error(`responses failed: ${r.error}`);
  writeFileSync("data/demo/reasoning-I02.json", JSON.stringify({ at: new Date().toISOString(), interval: i.id, endpoint: "/v1/responses", model: "gpt-6-luna-serv-kronos-multipath", effort: "medium", attempts: tries, requestId: r.requestId, latencyMs: r.latencyMs, summaries: r.summaries.map(applyHouseStyle), ruling: (() => { try { return r.text ? JSON.parse(r.text) : null; } catch { return r.text ?? null; } })(), usage: r.usage }, null, 2));
  console.log("reasoning summaries:", r.summaries.length, r.requestId);
}

function iv0() { return s.intervals.find((x) => x.id === "I02")!; }
