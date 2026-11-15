import { clauseReader } from "./crew/crew";
import { checkRulings } from "../verify/citations";
import { DEFINITION_IDS } from "../pipeline";
import { RULEBOOK_VERSION_SHA } from "./crew/prompts";

export interface Clause { id: string; title: string; text: string }

/** One interval ruled against a clause set, by a plain model, then checked in code. Used by the paid x402 route and the MCP door. */
export async function ruleOneInterval(args: { interval: { id: string; from: number; to: number; text: string }; clauses: Clause[]; portRules: Clause[] }) {
  const { interval, clauses, portRules } = args;
  const lineId = "L01";
  const built = [{ id: interval.id, from: interval.from, to: interval.to, startLine: lineId, endLine: lineId, kind: "waiting" as const, cause: "none" as const, text: interval.text }];
  const model = process.env.X402_MODEL ?? "gpt-6-luna";
  const res = await clauseReader({ cp: clauses, port: portRules, lines: [{ id: lineId, text: interval.text }], intervals: built, offsetMinutes: 0 }, { model, plain: !/multipath|kronos/.test(model) });
  if (!res.ok) return { ok: false as const, error: `ruling not made: ${res.error}`, refusedBy: res.refusedBy ?? null, requestId: res.requestId, costUsd: res.costUsd };
  const catalog = { charter_party: new Set(clauses.map((c) => c.id)), laytime_definitions: new Set(DEFINITION_IDS), port_rules: new Set(portRules.map((c) => c.id)) };
  const [c] = checkRulings([interval.id], res.value!.intervals, catalog, new Set([lineId]), new Map([[interval.id, { startLine: lineId, endLine: lineId }]]));
  return {
    ok: true as const, costUsd: res.costUsd,
    body: { interval: interval.id, effect: c.resolvedEffect, verdict: c.verdict, clauses: c.clause_ids, reason: c.reason, branches: c.branches, problems: c.problems, rulebookVersion: RULEBOOK_VERSION_SHA, serv: { model: res.model, requestId: res.requestId, latencyMs: res.latencyMs, costUsd: res.costUsd } },
  };
}
