import type { Effect } from "./types";

export type Rulebook = "charter_party" | "laytime_definitions" | "port_rules";
export type Finding = Effect | "silent";

export interface Branch {
  rulebook: Rulebook;
  finding: Finding;
  clause_id: string;
}

export interface Resolution {
  effect: Effect;
  /** Which rulebook decided it, or null when nothing could decide. */
  decidedBy: Rulebook | null;
  conflict: boolean;
  note: string;
}

/**
 * Precedence is decided in code, never by a model.
 *  1. The charter party overrides the definitions wherever it speaks.
 *  2. The port rules decide holidays and closures (they speak when they are not silent).
 *  3. The definitions apply when both are silent.
 *  4. Port rules and definitions that disagree with the charter party silent: port rules win, the definitions
 *     only fill the gap. If the port rules and charter party both speak and disagree, the charter party wins.
 *  5. When the charter party and the port rules both speak and disagree, code does not pick a winner: it is a
 *     real conflict between rulebooks, so it is ambiguous and becomes REVIEW for a person.
 *  6. Anything left unresolved is ambiguous and becomes REVIEW.
 */
export function resolve(branches: Branch[]): Resolution {
  const by = (r: Rulebook) => branches.find((b) => b.rulebook === r);
  const cp = by("charter_party");
  const port = by("port_rules");
  const def = by("laytime_definitions");
  const speaks = (b?: Branch) => !!b && b.finding !== "silent";

  const findings = branches.filter((b) => b.finding !== "silent").map((b) => b.finding);
  const conflict = new Set(findings).size > 1;

  if (speaks(cp) && speaks(port) && cp!.finding !== port!.finding) {
    return { effect: "ambiguous", decidedBy: null, conflict: true, note: "charter party and port rules disagree" };
  }
  if (speaks(cp)) {
    if (cp!.finding === "ambiguous") return { effect: "ambiguous", decidedBy: null, conflict, note: "charter party is itself ambiguous" };
    return { effect: cp!.finding as Effect, decidedBy: "charter_party", conflict, note: "charter party speaks" };
  }
  if (speaks(port)) {
    if (port!.finding === "ambiguous") return { effect: "ambiguous", decidedBy: null, conflict, note: "port rules ambiguous" };
    return { effect: port!.finding as Effect, decidedBy: "port_rules", conflict, note: "charter party silent, port rules speak" };
  }
  if (speaks(def)) {
    if (def!.finding === "ambiguous") return { effect: "ambiguous", decidedBy: null, conflict, note: "definitions ambiguous" };
    return { effect: def!.finding as Effect, decidedBy: "laytime_definitions", conflict, note: "only the definitions speak" };
  }
  return { effect: "ambiguous", decidedBy: null, conflict: false, note: "all three rulebooks are silent" };
}
