import { computeStatement } from "./laytime/clock";
import { buildTimeline, parseSof, toMinutes, type BuiltInterval, type BuiltTimeline, type SofLine } from "./laytime/intervals";
import type { RuledInterval, Statement } from "./laytime/types";
import { checkRulings, type CheckedRuling, type ClauseCatalog } from "./verify/citations";
import { clauseReader, portClerk, timeBarClerk, activeSabotage, type Clause } from "./serv/crew/crew";
import { RULEBOOK_VERSION_SHA } from "./serv/crew/prompts";
import type { PortEvent } from "./serv/schemas";
import { applyHouseStyle } from "./verify/houseStyle";

export interface CpData {
  laytimeAllowedMinutes: number;
  demurrageRateCentsPerDay: string;
  despatchHalfRate: boolean;
  noticeMinutes: number;
  completionOfDischarge: string;
  timeBarDays: number;
  clauses: (Clause & { appliesOnDemurrage: boolean })[];
  requiredDocuments: { bit: number; key: string; label: string }[];
}
export interface CalendarData { rules: Clause[]; holidays: { date: string; name: string }[]; utcOffsetNote?: string }

export type Progress = (step: { stage: string; detail: string; done?: number; total?: number }) => void;

export interface StepMeta { role: string; model: string; requestId: string | null; latencyMs: number; costUsd: number; tokens: { prompt: number; completion: number }; note?: string }

export interface RuledInt extends BuiltInterval {
  ruling: CheckedRuling;
  /** Final effect used by the clock. REVIEW intervals have none until a person rules. */
  finalEffect: "counts" | "excepted" | "half" | null;
  appliesOnDemurrage: boolean;
  by: "serv" | "senior" | "person" | null;
  requestId: string | null;
  model: string;
}

export interface VoyageRun {
  rulebookVersion: string;
  timeline: Pick<BuiltTimeline, "commencesAt" | "completedAt" | "norAt" | "norValid" | "norNote" | "gaps">;
  intervals: RuledInt[];
  quarantined: { line_id: string; reason: string }[];
  instructionsFound: string[];
  steps: StepMeta[];
  statement: Statement;
  /** Provisional range while REVIEW remains: floor treats REVIEW as excepted, ceiling as counts. */
  floorCents: bigint;
  ceilingCents: bigint;
  reviewCount: number;
  totalCostUsd: number;
}

const BATCH = 7;

function catalogOf(cp: CpData, cal: CalendarData, defIds: string[]): ClauseCatalog {
  return {
    charter_party: new Set(cp.clauses.map((c) => c.id)),
    laytime_definitions: new Set(defIds),
    port_rules: new Set(cal.rules.map((r) => r.id)),
  };
}
export const DEFINITION_IDS = ["L-1", "L-2", "L-3", "L-4", "L-5", "L-6", "L-7", "L-8"];

function runClock(cp: CpData, tl: Pick<BuiltTimeline, "commencesAt">, ints: { id: string; from: number; to: number; effect: "counts" | "excepted" | "half"; appliesOnDemurrage: boolean }[]): Statement {
  const ivs: RuledInterval[] = ints.map((i) => ({ id: i.id, from: i.from, to: i.to, effect: i.effect, appliesOnDemurrage: i.appliesOnDemurrage }));
  return computeStatement({
    allowedMinutes: cp.laytimeAllowedMinutes, commencesAt: tl.commencesAt, intervals: ivs,
    demurrageRateCentsPerDay: BigInt(cp.demurrageRateCentsPerDay), despatchHalfRate: cp.despatchHalfRate,
  });
}

/** Prompt Guard may refuse the whole log. Find the lines it refuses, one by one, set them aside, and read the rest. */
async function readLog(lines: SofLine[], steps: StepMeta[], progress: Progress, sabotage: ReturnType<typeof activeSabotage>) {
  const quarantined: { line_id: string; reason: string }[] = [];
  let usable = lines;
  for (let round = 0; round < 3; round++) {
    progress({ stage: "port_clerk", detail: round === 0 ? "Reading the log into typed events" : "Reading the remaining lines" });
    const r = await portClerk(usable, sabotage);
    steps.push({ role: "Port Clerk", model: r.model, requestId: r.requestId, latencyMs: r.latencyMs, costUsd: r.costUsd, tokens: r.usage, note: r.refusedBy ? `refused by ${r.refusedBy}` : undefined });
    if (r.ok) return { events: r.value!.events as PortEvent[], instructions: r.value!.instructions_found, quarantined, usable };
    if (r.refusedBy !== "prompt_guard" && r.refusedBy !== "content_filter") throw new Error(`SERV unreachable or failed, ruling not made: ${r.error}`);
    progress({ stage: "prompt_guard", detail: "Prompt Guard refused the log. Testing each line on its own." });
    const checks = await Promise.all(usable.map(async (l) => ({ l, r: await portClerk([l], sabotage) })));
    const bad = checks.filter((c) => c.r.refusedBy === "prompt_guard" || c.r.refusedBy === "content_filter").map((c) => c.l);
    if (bad.length === 0) throw new Error("Prompt Guard refused the log but no single line; ruling not made");
    for (const b of bad) quarantined.push({ line_id: b.id, reason: "Prompt Guard refused this line. It is shown to the analyst and is not read." });
    usable = usable.filter((l) => !bad.includes(l));
  }
  throw new Error("Prompt Guard kept refusing; ruling not made");
}

export async function ruleVoyage(args: { sofRaw: string; cp: CpData; calendar: CalendarData; offsetMinutes: number; sabotage?: string | null; progress?: Progress }): Promise<VoyageRun> {
  const progress = args.progress ?? (() => {});
  const sabotage = activeSabotage(args.sabotage);
  const steps: StepMeta[] = [];
  const lines = parseSof(args.sofRaw);
  const lineIds = new Set(lines.map((l) => l.id));

  const log = await readLog(lines, steps, progress, sabotage);
  const tl = buildTimeline(log.events, log.usable, args.cp.noticeMinutes);
  progress({ stage: "intervals", detail: `${tl.intervals.length} intervals to rule` });

  const catalog = catalogOf(args.cp, args.calendar, DEFINITION_IDS);
  const intervalLines = new Map(tl.intervals.map((i) => [i.id, { startLine: i.startLine, endLine: i.endLine }]));

  // Clause Reader in parallel batches, so no serverless call runs long.
  const batches: BuiltInterval[][] = [];
  for (let i = 0; i < tl.intervals.length; i += BATCH) batches.push(tl.intervals.slice(i, i + BATCH));
  let finished = 0;
  const raw: import("./serv/schemas").RulingOut[] = [];
  await Promise.all(batches.map(async (b, idx) => {
    const res = await clauseReader({ cp: args.cp.clauses, port: args.calendar.rules, lines: log.usable, intervals: b, offsetMinutes: args.offsetMinutes }, { sabotage });
    steps.push({ role: `Clause Reader (batch ${idx + 1})`, model: res.model, requestId: res.requestId, latencyMs: res.latencyMs, costUsd: res.costUsd, tokens: res.usage, note: res.ok ? undefined : res.error });
    if (res.ok) raw.push(...res.value!.intervals);
    finished++;
    progress({ stage: "clause_reader", detail: `Ruled batch ${finished} of ${batches.length}`, done: finished, total: batches.length });
  }));

  let checked = checkRulings(tl.intervals.map((i) => i.id), raw, catalog, lineIds, intervalLines);
  const byId = new Map<string, "serv" | "senior" | "person">(checked.map((c) => [c.interval_id, "serv"]));
  const reqByInterval = new Map<string, { requestId: string | null; model: string }>();
  for (const s of steps) void s;

  // Senior Reader: one re-read of the intervals that are not OBSERVED because they are ambiguous.
  const ambiguous = checked.filter((c) => c.verdict === "REVIEW" && (c.resolvedEffect === "ambiguous" || c.modelEffect === "ambiguous"));
  if (ambiguous.length && !sabotage) {
    progress({ stage: "senior_reader", detail: `Senior Reader re-reads ${ambiguous.length} ambiguous interval(s)` });
    const subset = tl.intervals.filter((i) => ambiguous.some((a) => a.interval_id === i.id));
    const res = await clauseReader({ cp: args.cp.clauses, port: args.calendar.rules, lines: log.usable, intervals: subset, offsetMinutes: args.offsetMinutes }, { senior: true });
    steps.push({ role: "Senior Reader", model: res.model, requestId: res.requestId, latencyMs: res.latencyMs, costUsd: res.costUsd, tokens: res.usage, note: res.ok ? undefined : res.error });
    if (res.ok) {
      const re = checkRulings(subset.map((i) => i.id), res.value!.intervals, catalog, lineIds, intervalLines);
      checked = checked.map((c) => { const n = re.find((x) => x.interval_id === c.interval_id); if (n && n.verdict === "OBSERVED") { byId.set(c.interval_id, "senior"); return n; } return c; });
    }
  }
  void reqByInterval;

  const clauseApplies = (cl: string[]) => args.cp.clauses.some((c) => cl.includes(c.id) && c.appliesOnDemurrage);
  const intervals: RuledInt[] = tl.intervals.map((i) => {
    const r = checked.find((c) => c.interval_id === i.id)!;
    const ok = r.verdict === "OBSERVED" && r.resolvedEffect !== "ambiguous";
    return {
      ...i, ruling: { ...r, reason: applyHouseStyle(r.reason) },
      finalEffect: ok ? (r.resolvedEffect as "counts" | "excepted" | "half") : null,
      appliesOnDemurrage: clauseApplies(r.clause_ids), by: ok ? (byId.get(i.id) ?? "serv") : null, requestId: null, model: "",
    };
  });

  const reviewCount = intervals.filter((i) => i.finalEffect === null).length;
  const mk = (fallback: "counts" | "excepted") => runClock(args.cp, tl, intervals.map((i) => ({ id: i.id, from: i.from, to: i.to, effect: i.finalEffect ?? fallback, appliesOnDemurrage: i.appliesOnDemurrage })));
  const floor = mk("excepted");
  const ceiling = mk("counts");
  const statement = reviewCount === 0 ? floor : floor;
  const totalCostUsd = steps.reduce((a, s) => a + s.costUsd, 0);

  return {
    rulebookVersion: RULEBOOK_VERSION_SHA,
    timeline: { commencesAt: tl.commencesAt, completedAt: tl.completedAt, norAt: tl.norAt, norValid: tl.norValid, norNote: tl.norNote, gaps: tl.gaps },
    intervals, quarantined: log.quarantined, instructionsFound: log.instructions, steps, statement,
    floorCents: floor.demurrageCents, ceilingCents: ceiling.demurrageCents, reviewCount, totalCostUsd,
  };
}

export { timeBarClerk, toMinutes };
