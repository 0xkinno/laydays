import type { RulingOut } from "../serv/schemas";
import { resolve, type Branch } from "../laytime/precedence";
import type { Effect } from "../laytime/types";

export interface ClauseCatalog {
  charter_party: Set<string>;
  laytime_definitions: Set<string>;
  port_rules: Set<string>;
}

/** Causes recorded by the Port Clerk, mapped to the charter party clause that deals with them (matched by title). */
const CAUSE_TITLE: Record<string, RegExp> = {
  rain: /weather|rain/i, strike: /strike|lockout/i, shore_equipment: /shore|equipment|breakdown/i, shifting: /shift/i,
};

export interface CauseContext {
  causeByInterval: Map<string, string>;
  cpClauses: { id: string; title: string }[];
  portRules: { id: string; title: string }[];
}

export interface CheckedRuling {
  interval_id: string;
  modelEffect: Effect;
  resolvedEffect: Effect;
  decidedBy: string | null;
  conflict: boolean;
  clause_ids: string[];
  line_ids: string[];
  reason: string;
  branches: RulingOut["branches"];
  problems: string[];
  verdict: "OBSERVED" | "REVIEW";
}

/**
 * Citation Checker (code, never bypassed).
 * A ruling passes only if every clause id exists in the right rulebook (or is "none"), every log line id exists,
 * all three branches are present, and the model's effect equals the one code resolves from the branches.
 */
export function checkRulings(
  expectedIntervalIds: string[],
  rulings: RulingOut[],
  catalog: ClauseCatalog,
  sofLineIds: Set<string>,
  intervalLines: Map<string, { startLine: string; endLine: string }>,
  ctx?: CauseContext,
): CheckedRuling[] {
  const seen = new Map<string, number>();
  for (const r of rulings) seen.set(r.interval_id, (seen.get(r.interval_id) ?? 0) + 1);
  const out: CheckedRuling[] = [];

  for (const id of expectedIntervalIds) {
    const r = rulings.find((x) => x.interval_id === id);
    const problems: string[] = [];
    if (!r) {
      out.push({ interval_id: id, modelEffect: "ambiguous", resolvedEffect: "ambiguous", decidedBy: null, conflict: false, clause_ids: [], line_ids: [], reason: "", branches: [], problems: ["no ruling returned for this interval"], verdict: "REVIEW" });
      continue;
    }
    if ((seen.get(id) ?? 0) > 1) problems.push("interval ruled more than once");

    // A silent branch that returns an empty clause id means none. The format is normalised, the substance is not.
    for (const b of r.branches) if (b.clause_id.trim() === "") b.clause_id = "none";
    r.clause_ids = r.clause_ids.filter((c) => c.trim() !== "");
    for (const b of r.branches) {
      if (b.clause_id !== "none" && !catalog[b.rulebook].has(b.clause_id)) problems.push(`clause ${b.clause_id} is not in ${b.rulebook}`);
      if (b.finding === "silent" && b.clause_id !== "none") problems.push(`silent branch ${b.rulebook} cites ${b.clause_id}`);
    }
    for (const rb of ["charter_party", "laytime_definitions", "port_rules"] as const) {
      if (!r.branches.some((b) => b.rulebook === rb)) problems.push(`missing branch ${rb}`);
    }
    for (const c of r.clause_ids) {
      const known = c === "none" || catalog.charter_party.has(c) || catalog.laytime_definitions.has(c) || catalog.port_rules.has(c);
      if (!known) problems.push(`clause ${c} does not exist`);
    }
    for (const l of r.line_ids) if (!sofLineIds.has(l)) problems.push(`log line ${l} does not exist`);
    const lines = intervalLines.get(id);
    if (lines && r.line_ids.length && !r.line_ids.includes(lines.startLine)) problems.push(`ruling does not cite the line that began the interval (${lines.startLine})`);
    const unusable = (t: string) => t.trim().length < 8 || /^\[?redacted\]?\.?$/i.test(t.trim());
    if (unusable(r.reason)) problems.push("no usable reason given");
    for (const b of r.branches) if (b.finding !== "silent" && unusable(b.reason)) problems.push(`${b.rulebook} gave no usable reason`);

    // Consistency check in code: if the log records a cause and the charter party has a clause for it, the ruling must have considered that clause.
    const cause = ctx?.causeByInterval.get(id);
    if (ctx && cause) {
      const re = CAUSE_TITLE[cause];
      const cp = re ? ctx.cpClauses.find((c) => re.test(c.title)) : undefined;
      if (cp && !r.clause_ids.includes(cp.id) && !r.branches.some((b) => b.clause_id === cp.id)) problems.push(`log records ${cause.replace("_", " ")} but clause ${cp.id} (${cp.title}) was not considered`);
      if (cause === "port_closure") {
        const pr = ctx.portRules.find((c) => /closure/i.test(c.title));
        if (pr && !r.clause_ids.includes(pr.id) && !r.branches.some((b) => b.clause_id === pr.id)) problems.push(`log records a port closure but port rule ${pr.id} was not considered`);
      }
    }

    const res = resolve(r.branches.map((b): Branch => ({ rulebook: b.rulebook, finding: b.finding, clause_id: b.clause_id })));
    if (res.effect !== r.effect) problems.push(`model effect ${r.effect} differs from code resolution ${res.effect}`);
    if (res.effect === "ambiguous") problems.push("ambiguous after code precedence");

    out.push({
      interval_id: id, modelEffect: r.effect, resolvedEffect: res.effect, decidedBy: res.decidedBy, conflict: res.conflict,
      clause_ids: r.clause_ids, line_ids: r.line_ids, reason: r.reason, branches: r.branches,
      problems, verdict: problems.length === 0 ? "OBSERVED" : "REVIEW",
    });
  }
  return out;
}
