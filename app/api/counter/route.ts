import { NextResponse } from "next/server";
import { counterReader } from "@/lib/serv/crew/crew";
import { addSpend, checkVisitor } from "@/lib/caps";
import { demoIntervals } from "@/lib/view";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/** Counter Reader: maps a charterer's reply (untrusted) to interval ids. Prompt Guard stands in front of it. It never changes a ruling. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  if (!email || email.length < 5 || email.length > 4000) return NextResponse.json({ error: "paste the reply, up to 4000 characters" }, { status: 400 });
  const gate = checkVisitor(ip);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 429 });
  const iv = demoIntervals().map((i) => ({ id: i.id, effect: i.effect ?? "review", text: i.text }));
  const r = await counterReader(email, iv);
  addSpend(r.costUsd);
  if (!r.ok) return NextResponse.json({ error: r.refusedBy ? `Prompt Guard or the content filter refused this reply (${r.refusedBy}). It was not read.` : `ruling not made: ${r.error}`, refusedBy: r.refusedBy ?? null, requestId: r.requestId }, { status: r.refusedBy ? 200 : 502 });
  return NextResponse.json({ objections: r.value!.objections, instructionsFound: r.value!.instructions_found, requestId: r.requestId, costUsd: r.costUsd });
}
