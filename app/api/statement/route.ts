import { NextResponse } from "next/server";
import { buildStatementPdf } from "@/lib/pdf/statement";
import { demoSummary } from "@/lib/view";
import { statementDigest } from "@/lib/chain/digest";
import { latestOnchain } from "@/lib/onchain";
import { computeStatement } from "@/lib/laytime/clock";

/** If this statement digest is the one that was signed and presented onchain in the recorded proof run, return that transaction. */
function presentedTx(digest: string): string | undefined {
  const run = latestOnchain();
  if (!run || run.statementDigest.toLowerCase() !== digest.toLowerCase()) return undefined;
  return run.steps.find((x) => x.kind === "transaction" && /presents the complete claim/.test(x.step))?.tx;
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { overrides, tx? } returns the laytime statement PDF for the recorded Orla Jansen run. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { overrides?: Record<string, "counts" | "excepted" | "half">; tx?: string; digestBody?: unknown };
  const s = demoSummary();
  // The same canonical body the owner signs onchain (see PresentPanel and scripts/record-onchain.ts).
  const ov = b.overrides ?? {};
  const rows = s.intervals.map((i) => ({ ...i, final: ov[i.id] ?? i.effect ?? null, person: !!ov[i.id] }));
  const clock = computeStatement({ allowedMinutes: 2160, commencesAt: s.commencesAt, demurrageRateCentsPerDay: 1800000n, despatchHalfRate: true, intervals: rows.map((r) => ({ id: r.id, from: r.from, to: r.to, effect: (r.final ?? "excepted") as "counts", appliesOnDemurrage: r.appliesOnDemurrage })) });
  const digest = statementDigest({ voyage: "orla-jansen", rulebook: s.rulebookVersion, total: clock.demurrageCents.toString(), intervals: rows.map((r) => ({ id: r.id, effect: r.final, minutes: r.minutes, clauses: r.clauseIds, byPerson: r.person })) });
  const pdf = await buildStatementPdf({
    intervals: s.intervals, overrides: b.overrides ?? {}, allowedMinutes: 2160, commencesAt: s.commencesAt, norAt: s.norAt, completedAt: s.completedAt,
    rateCentsPerDay: 1800000n, digest, rulebook: s.rulebookVersion, txHash: presentedTx(digest) ?? b.tx,
  });
  return new NextResponse(Buffer.from(pdf), { headers: { "content-type": "application/pdf", "content-disposition": 'attachment; filename="laytime-statement-orla-jansen.pdf"' } });
}
