import { NextResponse } from "next/server";
import { timeBarClerk } from "@/lib/serv/crew/crew";
import { addSpend, checkVisitor } from "@/lib/caps";
import { DEMO } from "@/lib/serv/rulebooks.generated";
import { applyHouseStyle } from "@/lib/verify/houseStyle";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/** Time-bar Clerk: reads a time bar clause into a day count and a document list. It never decides whether a document is present. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const { clause } = (await req.json().catch(() => ({}))) as { clause?: string };
  const c9 = DEMO.cp.clauses.find((c) => c.id === "CP-9")!;
  const text = (clause && clause.trim().length > 10 ? clause : `[${c9.id}] ${c9.title}: ${c9.text}`).slice(0, 3000);
  const gate = checkVisitor(ip);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 429 });
  const r = await timeBarClerk(text);
  addSpend(r.costUsd);
  if (!r.ok) return NextResponse.json({ error: `SERV unreachable or refused, the clause was not read: ${r.error}`, requestId: r.requestId }, { status: 502 });
  const read = [...r.value!.required_keys].sort();
  const declared = DEMO.cp.requiredDocuments.map((d) => d.key).sort();
  return NextResponse.json({ barDays: r.value!.bar_days, requiredKeys: read, matchesDeclared: !clause && JSON.stringify(read) === JSON.stringify(declared), reason: applyHouseStyle(r.value!.reason), model: r.model, requestId: r.requestId, latencyMs: r.latencyMs, costUsd: r.costUsd });
}
