import recorded from "@/data/demo/recorded-run.json";
import { fmtLocal } from "./laytime/intervals";
import { computeStatement } from "./laytime/clock";
import { formatDhm, formatUsd } from "./laytime/money";
import { DEMO } from "./serv/rulebooks.generated";

export const OFFSET_MIN = -300; // Houston, CDT in August 2026
export const RECORDED_AT = "15 Nov 2026";

export interface VInterval {
  id: string; from: number; to: number; minutes: number; startLine: string; endLine: string; text: string;
  effect: "counts" | "excepted" | "half" | null; verdict: "OBSERVED" | "REVIEW"; clauseIds: string[]; lineIds: string[];
  reason: string; decidedBy: string | null; problems: string[];
  branches: { rulebook: string; finding: string; clause_id: string; reason: string }[];
  appliesOnDemurrage: boolean;
}

const run = recorded as unknown as {
  rulebookVersion: string; intervals: any[]; steps: any[]; statement: any; floorCents: string; ceilingCents: string;
  reviewCount: number; totalCostUsd: number; timeline: { commencesAt: number; completedAt: number; norAt: number };
};

export function demoIntervals(): VInterval[] {
  return run.intervals.map((i) => ({
    id: i.id, from: i.from, to: i.to, minutes: i.to - i.from, startLine: i.startLine, endLine: i.endLine, text: String(i.text).replace(/^\d{4}-\d{2}-\d{2}T\S+\s*/, ""),
    effect: i.finalEffect, verdict: i.finalEffect ? "OBSERVED" : "REVIEW", clauseIds: i.ruling.clause_ids, lineIds: i.ruling.line_ids,
    reason: i.ruling.reason, decidedBy: i.ruling.decidedBy, problems: i.ruling.problems, branches: i.ruling.branches, appliesOnDemurrage: i.appliesOnDemurrage,
  }));
}

export function demoSummary() {
  const iv = demoIntervals();
  const allCounted = computeStatement({
    allowedMinutes: DEMO.cp.laytimeAllowedMinutes, commencesAt: run.timeline.commencesAt, demurrageRateCentsPerDay: BigInt(DEMO.cp.demurrageRateCentsPerDay),
    despatchHalfRate: true, intervals: iv.map((i) => ({ id: i.id, from: i.from, to: i.to, effect: "counts" as const, appliesOnDemurrage: false })),
  });
  const floor = BigInt(run.floorCents), ceiling = BigInt(run.ceilingCents);
  return {
    rulebookVersion: run.rulebookVersion, intervals: iv, steps: run.steps as { role: string; model: string; requestId: string | null; latencyMs: number; costUsd: number }[],
    reviewCount: iv.filter((i) => i.verdict === "REVIEW").length, observed: iv.filter((i) => i.verdict === "OBSERVED").length,
    floorCents: floor, ceilingCents: ceiling, spreadsheetCents: allCounted.demurrageCents, spreadsheetDemurrage: formatDhm(allCounted.demurrageMinutes),
    costUsd: run.totalCostUsd, commencesAt: run.timeline.commencesAt, completedAt: run.timeline.completedAt, norAt: run.timeline.norAt,
    usd: formatUsd,
  };
}
export const local = (m: number) => fmtLocal(m, OFFSET_MIN);
export const dhm = formatDhm;
export const usd = formatUsd;
