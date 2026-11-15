import { NextResponse } from "next/server";
import { buildStatementPdf } from "@/lib/pdf/statement";
import { demoSummary } from "@/lib/view";
import { statementDigest } from "@/lib/chain/digest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { overrides, tx? } returns the laytime statement PDF for the recorded Orla Jansen run. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { overrides?: Record<string, "counts" | "excepted" | "half">; tx?: string; digestBody?: unknown };
  const s = demoSummary();
  const digest = b.digestBody ? statementDigest(b.digestBody) : "not computed";
  const pdf = await buildStatementPdf({
    intervals: s.intervals, overrides: b.overrides ?? {}, allowedMinutes: 2160, commencesAt: s.commencesAt, norAt: s.norAt, completedAt: s.completedAt,
    rateCentsPerDay: 1800000n, digest, rulebook: s.rulebookVersion, txHash: b.tx,
  });
  return new NextResponse(Buffer.from(pdf), { headers: { "content-type": "application/pdf", "content-disposition": 'attachment; filename="laytime-statement-orla-jansen.pdf"' } });
}
