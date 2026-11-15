import { NextResponse } from "next/server";
import { statementWriter } from "@/lib/serv/crew/crew";
import { addSpend, checkVisitor } from "@/lib/caps";
import { numbersNotInFacts } from "@/lib/verify/numbersInFacts";
import { applyHouseStyle, houseStyleViolations } from "@/lib/verify/houseStyle";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/** Statement Writer: writes the cover note from facts that code computed. Any number not in the facts, or any house style violation,
 *  rejects the note, and after two tries a plain template is used and labelled as such. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const { facts } = (await req.json().catch(() => ({}))) as { facts?: Record<string, string | number> };
  if (!facts || typeof facts !== "object" || Object.keys(facts).length < 3 || JSON.stringify(facts).length > 4000) return NextResponse.json({ error: "send the statement facts as an object" }, { status: 400 });
  const gate = checkVisitor(ip);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 429 });
  let note = "", requestId: string | null = null, bad: string[] = [], style: string[] = [], tries = 0, spent = 0;
  for (; tries < 2; tries++) {
    const r = await statementWriter(facts);
    spent += r.costUsd;
    if (!r.ok) { bad = [`writer failed: ${r.error}`]; continue; }
    requestId = r.requestId; note = applyHouseStyle(r.value!.note);
    bad = numbersNotInFacts(note, facts); style = houseStyleViolations(note);
    if (!bad.length && !style.length) break;
  }
  addSpend(spent);
  if (bad.length || style.length || !note) return NextResponse.json({ source: "rejected", reason: [...bad, ...style].join("; ") || "no note", requestId, note: null });
  return NextResponse.json({ source: "model", note, requestId, attempts: tries + 1, checks: { numbersNotInFacts: bad, houseStyleViolations: style } });
}
