import { NextResponse } from "next/server";
import { demoSummary } from "@/lib/view";
import { latestOnchain } from "@/lib/onchain";

export const dynamic = "force-dynamic";

/** Recomputes the headline numbers from the stored run files at request time. */
export async function GET() {
  const s = demoSummary();
  const chain = latestOnchain();
  return NextResponse.json({
    at: new Date().toISOString(),
    demo: { intervals: s.intervals.length, observed: s.observed, review: s.reviewCount, costUsd: s.costUsd, spreadsheetCents: s.spreadsheetCents.toString(), ruledFloorCents: s.floorCents.toString(), ruledCeilingCents: s.ceilingCents.toString(), rulebookVersion: s.rulebookVersion },
    onchain: chain ? { recordedAt: chain.at, transactions: chain.steps.filter((x) => x.kind === "transaction").length, refusals: chain.steps.filter((x) => x.kind.startsWith("refusal")).length, claimUnits: chain.claimUnits, paidToOwner: chain.paidToOwner } : null,
  });
}
